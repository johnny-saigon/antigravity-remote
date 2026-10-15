import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import dotenv from 'dotenv';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { ensureBrandingAssets, ANTIGRAVITY_LOGO_SVG } from './icons.js';
import { hydrateAntigravityProfile, type OrbitalStatus } from './profileSync.js';
import { StateStore } from './store.js';
import { verifyGeminiConnection, dispatchProjectInstruction } from './agentEngine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const BASE_PATH = process.env.BASE_PATH || '/antigravity';
const HOST_PIN = process.env.HOST_PIN || '1631';
const SESSION_SECRET =
  process.env.SESSION_SECRET || 'ag-remote-zero-g-secret-85-10-218-46-vast';
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes (1800s) sliding window
let runtimeGeminiKey = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

// Programmatically generate official Antigravity SVG & Retina PNG icons on startup
ensureBrandingAssets(PUBLIC_DIR);

const store = new StateStore(DATA_DIR);

// Sliding 30-Minute Inactivity Session Tracker
interface SessionRecord {
  token: string;
  createdAt: number;
  lastActivityAt: number;
  ip: string;
}
const sessionRegistry = new Map<string, SessionRecord>();
const revokedTokens = new Set<string>();

// Zod Schemas (Tier 1 Policy: explicit runtime validation at external boundaries)
const LoginBodySchema = z.object({
  pin: z.string().min(1),
  geminiApiKey: z.string().optional(),
  oauthToken: z.string().optional(),
});

const InstructBodySchema = z.object({
  prompt: z.string().min(1).max(16000),
  mode: z.string().optional().default('voice-instruct'),
  useGeminiRefinement: z.boolean().optional().default(true),
});

const RollbackBodySchema = z.object({
  messageId: z.string().min(1),
});

const AntigravityWebhookSchema = z
  .object({
    hook_event_name: z.string().optional(),
    event: z.string().optional(),
    tool_name: z.string().optional(),
    toolName: z.string().optional(),
    toolCall: z
      .object({
        name: z.string().optional(),
        args: z.record(z.unknown()).optional(),
      })
      .optional(),
    cwd: z.string().optional(),
    workspacePath: z.string().optional(),
    workspacePaths: z.array(z.string()).optional(),
    projectId: z.string().optional(),
    tool_input: z.unknown().optional(),
    tool_response: z.unknown().optional(),
    summary: z.string().optional(),
  })
  .passthrough();

// Lightweight HMAC JWT helper
function signSessionToken(payload: { sub: string; iat: number; jti: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyAndTouchSessionToken(token?: string, touch = true): {
  valid: boolean;
  expired?: boolean;
  record?: SessionRecord;
} {
  if (!token) return { valid: false };
  if (revokedTokens.has(token)) return { valid: false };

  let iat = Date.now();
  if (token !== HOST_PIN) {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false };
    const [header, body, sig] = parts;
    const expected = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    if (sig !== expected) return { valid: false };
    try {
      const parsedBody = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as {
        iat?: number;
      };
      if (parsedBody.iat) iat = parsedBody.iat;
    } catch {
      return { valid: false };
    }
  }

  const now = Date.now();
  let rec = sessionRegistry.get(token);
  if (!rec) {
    // Hydrate session record if server restarted within 30m window
    if (now - iat > INACTIVITY_TIMEOUT_MS) {
      return { valid: false, expired: true };
    }
    rec = {
      token,
      createdAt: iat,
      lastActivityAt: now,
      ip: '127.0.0.1',
    };
    sessionRegistry.set(token, rec);
  }

  if (now - rec.lastActivityAt > INACTIVITY_TIMEOUT_MS) {
    sessionRegistry.delete(token);
    revokedTokens.add(token);
    return { valid: false, expired: true };
  }

  if (touch) {
    rec.lastActivityAt = now;
  }

  return { valid: true, record: rec };
}

function extractRequestToken(req: FastifyRequest): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieToken = req.cookies?.['ag_session'];
  if (cookieToken) return cookieToken;
  const queryToken = (req.query as Record<string, string | undefined>)?.token;
  if (queryToken) return queryToken;
  return undefined;
}

function isAuthenticated(req: FastifyRequest, touch = true): {
  ok: boolean;
  expired?: boolean;
  record?: SessionRecord;
} {
  const token = extractRequestToken(req);
  const res = verifyAndTouchSessionToken(token, touch);
  return { ok: res.valid, expired: res.expired, record: res.record };
}

// Active SSE Clients Registry
const sseClients = new Set<FastifyReply>();

function broadcastSse(event: string, data: unknown): void {
  const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.raw.write(frame);
    } catch {
      sseClients.delete(client);
    }
  }
}

// 15-second SSE Heartbeat to prevent Cloudflare Error 524 timeouts
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.raw.write(`: ping ${Date.now()}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}, 15_000).unref();

const app = Fastify({
  logger: true,
  trustProxy: true,
});

await app.register(fastifyCors, {
  origin: true,
  credentials: true,
});

await app.register(fastifyCookie, {
  secret: SESSION_SECRET,
});

// Redirect exact `/antigravity` to `/antigravity/` so relative URLs resolve inside `/antigravity/`
app.addHook('onRequest', async (req, reply) => {
  const rawUrl = req.raw.url || '';
  if (rawUrl === BASE_PATH) {
    return reply.redirect(`${BASE_PATH}/`, 308);
  }
});

// Serve static assets under both `/antigravity/` and `/`
await app.register(fastifyStatic, {
  root: PUBLIC_DIR,
  prefix: `${BASE_PATH}/`,
  decorateReply: true,
});

await app.register(fastifyStatic, {
  root: PUBLIC_DIR,
  prefix: '/',
  decorateReply: false,
});

function buildSecurityMetadata(
  hydratedUser: string,
  hydratedHost: string,
  record?: SessionRecord
) {
  const now = Date.now();
  const lastAct = record?.lastActivityAt || now;
  const elapsedMs = Math.max(0, now - lastAct);
  const remainingSec = Math.max(0, Math.floor((INACTIVITY_TIMEOUT_MS - elapsedMs) / 1000));
  return {
    authenticatedUser: hydratedUser,
    hostname: hydratedHost,
    authMethod: 'Host PIN + HMAC-SHA256 JWT + HttpOnly Strict Cookie',
    tlsProtection: 'Cloudflare TLS 1.3 Edge → Loopback 127.0.0.1:8787',
    executionIsolation: 'Tier 2 Guardrails (0B GPU VRAM · Workspace Path Sandbox)',
    inactivityTimeoutSec: 1800,
    remainingSec,
    sessionCreatedAt: new Date(record?.createdAt || now).toISOString(),
    lastActivityAt: new Date(lastAct).toISOString(),
  };
}

// Register API routes under a prefix helper so both `/antigravity/api/*` and `/api/*` work
function registerApiRoutes(prefix: string): void {
  // Health Check
  app.get(`${prefix}/api/health`, async (_req, reply) => {
    reply.header('Cache-Control', 'no-store');
    return {
      status: 'ok',
      service: 'antigravity-remote',
      version: '1.1.0',
      basePath: BASE_PATH,
      geminiConfigured: Boolean(runtimeGeminiKey),
      geminiModel: GEMINI_MODEL,
      inactivityTimeoutMinutes: 30,
      sseClients: sseClients.size,
      timestamp: new Date().toISOString(),
    };
  });

  // Inline Logo SVG Endpoint
  app.get(`${prefix}/logo.svg`, async (_req, reply) => {
    reply.type('image/svg+xml').send(ANTIGRAVITY_LOGO_SVG);
  });

  // 1. POST /api/auth/login
  app.post(`${prefix}/api/auth/login`, async (req, reply) => {
    reply.header('Cache-Control', 'no-store');
    const parsed = LoginBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid login payload',
        details: parsed.error.flatten(),
      });
    }

    const { pin, geminiApiKey } = parsed.data;
    if (pin.trim() !== HOST_PIN) {
      return reply.code(401).send({
        error: 'Invalid Host PIN. Check your Antigravity Remote hand-off credentials.',
      });
    }

    if (geminiApiKey && geminiApiKey.trim().length > 10) {
      runtimeGeminiKey = geminiApiKey.trim();
    }

    const now = Date.now();
    const geminiCheck = await verifyGeminiConnection(runtimeGeminiKey, GEMINI_MODEL);
    const token = signSessionToken({
      sub: 'antigravity-ios',
      iat: now,
      jti: crypto.randomBytes(6).toString('hex'),
    });

    const record: SessionRecord = {
      token,
      createdAt: now,
      lastActivityAt: now,
      ip: req.ip || '127.0.0.1',
    };
    sessionRegistry.set(token, record);

    const isSecure =
      req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';

    reply.setCookie('ag_session', token, {
      path: BASE_PATH,
      httpOnly: true,
      secure: isSecure,
      sameSite: 'strict',
      maxAge: 60 * 30, // 30 minutes matching inactivity window
    });

    const hydrated = await hydrateAntigravityProfile(
      store.getProjectStatuses(),
      GEMINI_MODEL,
      geminiCheck.ok || Boolean(runtimeGeminiKey)
    );

    return {
      ok: true,
      token,
      geminiVerification: geminiCheck,
      security: buildSecurityMetadata(
        hydrated.profile.user,
        hydrated.profile.hostname,
        record
      ),
      ...hydrated,
    };
  });

  // 1b. POST /api/auth/logout — Explicit Logout / Inactivity Auto-Logout Handler
  app.post(`${prefix}/api/auth/logout`, async (req, reply) => {
    reply.header('Cache-Control', 'no-store');
    const token = extractRequestToken(req);
    if (token) {
      sessionRegistry.delete(token);
      revokedTokens.add(token);
    }
    reply.clearCookie('ag_session', { path: BASE_PATH });
    return { ok: true, loggedOutAt: new Date().toISOString() };
  });

  // 2. GET /api/profile/sync — Zero-Config Gemini & Antigravity Profile Hydration
  app.get(`${prefix}/api/profile/sync`, async (req, reply) => {
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
    const auth = isAuthenticated(req, true);
    if (!auth.ok) {
      reply.clearCookie('ag_session', { path: BASE_PATH });
      return reply.code(401).send({
        error: auth.expired
          ? 'Session expired after 30 minutes of inactivity. Please sign in again.'
          : 'Authentication required',
        expired: Boolean(auth.expired),
      });
    }

    const hydrated = await hydrateAntigravityProfile(
      store.getProjectStatuses(),
      GEMINI_MODEL,
      Boolean(runtimeGeminiKey)
    );

    const messagesByProject: Record<string, unknown[]> = {};
    for (const proj of hydrated.projects) {
      messagesByProject[proj.id] = store.getMessages(proj.id);
    }

    return {
      ...hydrated,
      security: buildSecurityMetadata(
        hydrated.profile.user,
        hydrated.profile.hostname,
        auth.record
      ),
      messagesByProject,
      recentHooks: store.getRecentHooks(),
    };
  });

  // 3. POST /api/projects/:id/instruct
  app.post<{ Params: { id: string } }>(
    `${prefix}/api/projects/:id/instruct`,
    async (req, reply) => {
      reply.header('Cache-Control', 'no-store');
      const auth = isAuthenticated(req, true);
      if (!auth.ok) {
        return reply.code(401).send({
          error: auth.expired
            ? 'Session expired after 30 minutes of inactivity.'
            : 'Authentication required',
          expired: Boolean(auth.expired),
        });
      }

      const parsed = InstructBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Invalid instruction payload',
          details: parsed.error.flatten(),
        });
      }

      const projectId = req.params.id;
      const hydrated = await hydrateAntigravityProfile(
        store.getProjectStatuses(),
        GEMINI_MODEL,
        Boolean(runtimeGeminiKey)
      );

      const project =
        hydrated.projects.find((p) => p.id === projectId || p.slug === projectId) ||
        hydrated.projects[0];

      const { userMessage, assistantMessage } = await dispatchProjectInstruction({
        project,
        hydrated,
        prompt: parsed.data.prompt,
        mode: parsed.data.mode,
        useGeminiRefinement: parsed.data.useGeminiRefinement,
        apiKey: runtimeGeminiKey,
        modelName: GEMINI_MODEL,
        store,
        broadcast: broadcastSse,
      });

      return {
        ok: true,
        projectId: project.id,
        userMessage,
        assistantMessage,
        messages: store.getMessages(project.id),
      };
    }
  );

  // 3b. POST /api/projects/:id/rollback — Antigravity Turn & File Checkpoint Rollback
  app.post<{ Params: { id: string } }>(
    `${prefix}/api/projects/:id/rollback`,
    async (req, reply) => {
      reply.header('Cache-Control', 'no-store');
      const auth = isAuthenticated(req, true);
      if (!auth.ok) {
        return reply.code(401).send({ error: 'Authentication required' });
      }

      const parsed = RollbackBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Invalid rollback payload',
          details: parsed.error.flatten(),
        });
      }

      const projectId = req.params.id;
      const hydrated = await hydrateAntigravityProfile(
        store.getProjectStatuses(),
        GEMINI_MODEL,
        Boolean(runtimeGeminiKey)
      );

      const project =
        hydrated.projects.find((p) => p.id === projectId || p.slug === projectId) ||
        hydrated.projects[0];

      const result = store.rollbackToMessage(
        project.id,
        parsed.data.messageId,
        project.workspacePath
      );

      if (!result.ok) {
        return reply.code(404).send({ error: 'Target message checkpoint not found' });
      }

      const hookEvt = store.addHookEvent({
        projectId: project.id,
        eventType: 'PostToolUse',
        toolName: 'rollback_checkpoint',
        summary: `Rolled back ${result.removedMessageCount} message(s) in ${project.name}${
          result.restoredFiles.length > 0
            ? ` & restored ${result.restoredFiles.join(', ')}`
            : ''
        }`,
        status: 'done',
      });

      broadcastSse('hook_event', hookEvt);
      broadcastSse('status_changed', { projectId: project.id, status: 'Idle' });
      broadcastSse('rollback_completed', {
        projectId: project.id,
        messages: result.messages,
        restoredFiles: result.restoredFiles,
        rolledBackPrompt: result.rolledBackPrompt,
      });

      return {
        ok: true,
        projectId: project.id,
        restoredFiles: result.restoredFiles,
        removedMessageCount: result.removedMessageCount,
        rolledBackPrompt: result.rolledBackPrompt,
        messages: result.messages,
      };
    }
  );

  // 4. POST /api/webhooks/antigravity — Inbound Hook Receiver for ~/.gemini/config/hooks.json
  app.post(`${prefix}/api/webhooks/antigravity`, async (req, reply) => {
    reply.header('Cache-Control', 'no-store');
    const parsed = AntigravityWebhookSchema.safeParse(req.body || {});
    const body = parsed.success ? parsed.data : {};

    const rawEvent = String(body.hook_event_name || body.event || 'PostToolUse');
    const eventType: 'PreToolUse' | 'PostToolUse' | 'Stop' | 'System' =
      rawEvent === 'PreToolUse' || rawEvent === 'PostToolUse' || rawEvent === 'Stop'
        ? rawEvent
        : 'PostToolUse';

    const toolName = String(
      body.tool_name || body.toolName || body.toolCall?.name || 'antigravity_hook'
    );
    const cwd = String(
      body.cwd || body.workspacePath || body.workspacePaths?.[0] || ''
    );

    let projectId = String(body.projectId || '');
    if (!projectId) {
      if (cwd.toLowerCase().includes('binaryday')) projectId = 'binaryday';
      else if (cwd.toLowerCase().includes('snapcal')) projectId = 'snapcal';
      else if (cwd.toLowerCase().includes('removebackground') || cwd === '/workspace')
        projectId = 'removebackground';
      else projectId = 'antigravity-remote';
    }

    const summary =
      body.summary ||
      (eventType === 'Stop'
        ? `Agent turn completed in ${projectId}`
        : `${eventType}: ${toolName}${cwd ? ` (${path.basename(cwd)})` : ''}`);

    const hookItem = store.addHookEvent({
      projectId,
      eventType,
      toolName,
      summary,
      status: eventType === 'PreToolUse' ? 'running' : 'done',
    });

    const newOrbital: OrbitalStatus =
      eventType === 'PreToolUse'
        ? 'Running'
        : eventType === 'Stop'
          ? 'Completed'
          : 'Running';

    store.setProjectStatus(projectId, newOrbital);
    broadcastSse('hook_event', hookItem);
    broadcastSse('status_changed', { projectId, status: newOrbital });

    // Always return HTTP 200 with valid JSON {"decision": "allow"} per Antigravity hooks spec
    return reply.code(200).send({ decision: 'allow', received: true, hookId: hookItem.id });
  });

  // 5. GET /api/stream — Server-Sent Events (SSE) Real-Time Stream
  app.get(`${prefix}/api/stream`, async (req, reply) => {
    const auth = isAuthenticated(req, false);
    if (!auth.ok) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    reply.raw.write(`: connected ${new Date().toISOString()}\n\n`);
    sseClients.add(reply);

    req.raw.on('close', () => {
      sseClients.delete(reply);
    });

    return reply;
  });
}

registerApiRoutes(BASE_PATH);
registerApiRoutes('');

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(
      `Antigravity Remote listening on http://${HOST}:${PORT}${BASE_PATH}`
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
