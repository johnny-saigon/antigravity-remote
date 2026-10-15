import { GoogleGenAI, Type, type FunctionDeclaration, type Content } from '@google/genai';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { DiscoveredProject, HydratedProfile } from './profileSync.js';
import type {
  StateStore,
  ConversationMessage,
  ToolEventItem,
  WorkspaceCheckpoint,
  FileSnapshot,
} from './store.js';

export type SseBroadcaster = (event: string, payload: unknown) => void;

export async function verifyGeminiConnection(
  apiKey: string,
  modelName: string
): Promise<{ ok: boolean; model: string; latencyMs: number; error?: string }> {
  const t0 = Date.now();
  if (!apiKey || apiKey.trim().length < 10) {
    return { ok: false, model: modelName, latencyMs: 0, error: 'Missing Gemini API key' };
  }
  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
  const candidates = Array.from(new Set([modelName, 'gemini-3.5-flash', 'gemini-3.8-flash']));
  let lastErr = '';
  for (const candidate of candidates) {
    try {
      const response = await ai.models.generateContent({
        model: candidate,
        contents: 'Respond with exact word: ONLINE',
        config: {
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      const text = (response.text || '').trim();
      if (text.length > 0) {
        return {
          ok: true,
          model: candidate,
          latencyMs: Date.now() - t0,
        };
      }
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
  }
  return {
    ok: false,
    model: modelName,
    latencyMs: Date.now() - t0,
    error: lastErr,
  };
}

function gatherWorkspaceSnapshot(project: DiscoveredProject): {
  gitSummary: string;
  gitHeadSha: string;
  memoryContext: string;
  fileList: string;
} {
  let gitSummary = `Branch: ${project.gitBranch} | Commit: ${project.lastCommit}`;
  let gitHeadSha = project.lastCommit.split(' ')[0] || 'HEAD';
  let memoryContext = '';
  let fileList = '';

  try {
    if (fs.existsSync(project.workspacePath)) {
      const entries = fs.readdirSync(project.workspacePath).slice(0, 30);
      fileList = entries.join(', ');

      const agentsMd = path.join(project.workspacePath, 'AGENTS.md');
      const activeCtx = path.join(project.workspacePath, 'memory-bank', 'activeContext.md');
      const readmeMd = path.join(project.workspacePath, 'README.md');

      if (fs.existsSync(activeCtx)) {
        memoryContext = fs.readFileSync(activeCtx, 'utf-8').slice(0, 1200);
      } else if (fs.existsSync(agentsMd)) {
        memoryContext = fs.readFileSync(agentsMd, 'utf-8').slice(0, 1200);
      } else if (fs.existsSync(readmeMd)) {
        memoryContext = fs.readFileSync(readmeMd, 'utf-8').slice(0, 1000);
      }

      if (fs.existsSync(path.join(project.workspacePath, '.git'))) {
        const shaOut = execSync('git rev-parse --short HEAD', {
          cwd: project.workspacePath,
          stdio: ['ignore', 'pipe', 'ignore'],
          timeout: 1500,
        })
          .toString()
          .trim();
        if (shaOut) gitHeadSha = shaOut;

        const logOut = execSync('git log -n 3 --oneline', {
          cwd: project.workspacePath,
          stdio: ['ignore', 'pipe', 'ignore'],
          timeout: 1500,
        })
          .toString()
          .trim();
        if (logOut) gitSummary += `\nRecent Commits:\n${logOut}`;
      }
    }
  } catch {
    // ignore snapshot errors
  }

  return { gitSummary, gitHeadSha, memoryContext, fileList };
}

const WORKSPACE_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'read_file',
    description: 'Read a text file inside the active project workspace.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        relativePath: {
          type: Type.STRING,
          description: 'Relative path from workspace root (e.g. "src/server.ts" or "package.json").',
        },
      },
      required: ['relativePath'],
    },
  },
  {
    name: 'edit_file',
    description:
      'Replace an exact target snippet in an existing file inside the workspace. Automatically snapshots the original file for Antigravity Rollback.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        relativePath: {
          type: Type.STRING,
          description: 'Relative path from workspace root.',
        },
        search: {
          type: Type.STRING,
          description: 'Exact substring in the file to replace.',
        },
        replace: {
          type: Type.STRING,
          description: 'New replacement content.',
        },
      },
      required: ['relativePath', 'search', 'replace'],
    },
  },
  {
    name: 'write_file',
    description:
      'Create or overwrite a file inside the workspace. Automatically snapshots the previous state for Antigravity Rollback.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        relativePath: {
          type: Type.STRING,
          description: 'Relative path from workspace root.',
        },
        content: {
          type: Type.STRING,
          description: 'Full content to write to the file.',
        },
      },
      required: ['relativePath', 'content'],
    },
  },
  {
    name: 'run_command',
    description:
      'Run a shell command (git status, tsc --noEmit, curl health check, ls) inside the active workspace.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: {
          type: Type.STRING,
          description: 'Shell command to execute inside workspacePath.',
        },
      },
      required: ['command'],
    },
  },
];

function executeWorkspaceTool(
  toolName: string,
  args: Record<string, unknown>,
  workspacePath: string,
  modifiedFiles: FileSnapshot[]
): { ok: boolean; summary: string; output: string } {
  const rootAbs = path.resolve(workspacePath);

  const resolveSafe = (rel: string): string => {
    const cleaned = rel.replace(/^\/+/, '');
    const resolved = path.resolve(rootAbs, cleaned);
    if (!resolved.startsWith(rootAbs)) {
      throw new Error(`Path traversal blocked outside workspace: ${rel}`);
    }
    return resolved;
  };

  const snapshotBeforeWrite = (rel: string, absPath: string): void => {
    // Only snapshot the initial state before the first modification in this turn
    if (modifiedFiles.some((f) => f.relativePath === rel)) return;
    const existed = fs.existsSync(absPath);
    const originalContent = existed ? fs.readFileSync(absPath, 'utf-8') : '';
    modifiedFiles.push({
      relativePath: rel,
      existed,
      originalContent,
    });
  };

  try {
    if (toolName === 'read_file') {
      const rel = String(args.relativePath || '');
      const abs = resolveSafe(rel);
      if (!fs.existsSync(abs)) {
        return { ok: false, summary: `read_file(${rel}) — not found`, output: 'File does not exist.' };
      }
      const content = fs.readFileSync(abs, 'utf-8').slice(0, 14000);
      return {
        ok: true,
        summary: `Read ${rel} (${content.length} chars)`,
        output: content,
      };
    }

    if (toolName === 'edit_file') {
      const rel = String(args.relativePath || '');
      const search = String(args.search || '');
      const replace = String(args.replace || '');
      const abs = resolveSafe(rel);
      if (!fs.existsSync(abs)) {
        return { ok: false, summary: `edit_file(${rel}) — not found`, output: 'Target file does not exist.' };
      }
      const current = fs.readFileSync(abs, 'utf-8');
      if (!current.includes(search)) {
        return {
          ok: false,
          summary: `edit_file(${rel}) — target snippet not found`,
          output: 'Search block did not match existing file content.',
        };
      }
      snapshotBeforeWrite(rel, abs);
      const updated = current.replace(search, replace);
      fs.writeFileSync(abs, updated, 'utf-8');
      const snap = modifiedFiles.find((f) => f.relativePath === rel);
      if (snap) snap.newContent = updated;
      return {
        ok: true,
        summary: `Edited ${rel} (checkpoint saved for rollback)`,
        output: `Successfully updated ${rel}.`,
      };
    }

    if (toolName === 'write_file') {
      const rel = String(args.relativePath || '');
      const content = String(args.content || '');
      const abs = resolveSafe(rel);
      snapshotBeforeWrite(rel, abs);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content, 'utf-8');
      const snap = modifiedFiles.find((f) => f.relativePath === rel);
      if (snap) snap.newContent = content;
      return {
        ok: true,
        summary: `Wrote ${rel} (${content.length} bytes · checkpoint saved)`,
        output: `Successfully wrote ${rel}.`,
      };
    }

    if (toolName === 'run_command') {
      const cmd = String(args.command || '').trim();
      if (
        /supervisorctl\s+restart\s+all/i.test(cmd) ||
        /rm\s+-rf\s+\/($|\s)/i.test(cmd) ||
        /mkfs|shutdown|reboot/i.test(cmd)
      ) {
        return {
          ok: false,
          summary: `Blocked unsafe command: ${cmd}`,
          output: 'Blocked by Tier 2 cluster invariant guardrails.',
        };
      }
      const out = execSync(cmd, {
        cwd: rootAbs,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 8000,
      })
        .toString()
        .slice(0, 6000);
      return {
        ok: true,
        summary: `Ran \`${cmd.slice(0, 56)}\``,
        output: out || '(exit 0)',
      };
    }

    return { ok: false, summary: `Unknown tool ${toolName}`, output: 'Unsupported tool.' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      summary: `${toolName} failed: ${msg.slice(0, 80)}`,
      output: msg.slice(0, 2000),
    };
  }
}

export async function dispatchProjectInstruction(params: {
  project: DiscoveredProject;
  hydrated: HydratedProfile;
  prompt: string;
  mode: string;
  useGeminiRefinement: boolean;
  apiKey: string;
  modelName: string;
  store: StateStore;
  broadcast: SseBroadcaster;
}): Promise<{ userMessage: ConversationMessage; assistantMessage: ConversationMessage }> {
  const {
    project,
    hydrated,
    prompt,
    mode,
    useGeminiRefinement,
    apiKey,
    modelName,
    store,
    broadcast,
  } = params;

  const snapshot = gatherWorkspaceSnapshot(project);
  const checkpointId = `cp-${crypto.randomBytes(3).toString('hex')}`;
  const modifiedFiles: FileSnapshot[] = [];

  const checkpoint: WorkspaceCheckpoint = {
    id: checkpointId,
    projectId: project.id,
    userMessageId: '',
    gitBranch: project.gitBranch,
    gitHead: snapshot.gitHeadSha,
    createdAt: new Date().toISOString(),
    modifiedFiles,
  };

  const userMessage = store.addMessage({
    projectId: project.id,
    role: 'user',
    content: prompt,
    mode,
    checkpoint,
  });
  checkpoint.userMessageId = userMessage.id;

  broadcast('message_created', { projectId: project.id, message: userMessage });

  // Transition orbital status -> Running
  store.setProjectStatus(project.id, 'Running');
  broadcast('status_changed', { projectId: project.id, status: 'Running' });

  const toolEvents: ToolEventItem[] = [];

  // Step 1: PreToolUse (Create Antigravity Rollback Checkpoint & Inspect Workspace)
  const preEvt = store.addHookEvent({
    projectId: project.id,
    eventType: 'PreToolUse',
    toolName: 'create_checkpoint',
    summary: `Created Rollback Checkpoint #${checkpointId} (${project.gitBranch} @ ${snapshot.gitHeadSha})`,
    status: 'done',
  });
  toolEvents.push(preEvt);
  broadcast('hook_event', preEvt);

  // Create placeholder assistant message for live streaming
  const assistantMessage = store.addMessage({
    projectId: project.id,
    role: 'assistant',
    content: '',
    mode,
    model: modelName,
    toolEvents,
    checkpoint,
  });
  checkpoint.assistantMessageId = assistantMessage.id;
  broadcast('message_created', { projectId: project.id, message: assistantMessage });

  let fullText = '';
  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = [
      `You are Antigravity Remote, the official agentic mobile companion connected to ${hydrated.profile.hostname} (${hydrated.profile.user}) on Vast.ai (85.10.218.46:44016).`,
      `Active Workspace: ${project.name} (${project.workspacePath})`,
      `Public URL: ${project.publicUrl} | Internal Daemon: ${project.daemonName} (127.0.0.1:${project.internalPort}, status: ${project.healthStatus})`,
      `Tier 2 Allocation: ${project.tier2Allocation}`,
      `Git State: ${snapshot.gitSummary}`,
      `Rollback Checkpoint ID: #${checkpointId} (Every file edit via edit_file/write_file is automatically snapshotted so the user can one-tap Rollback in the UI).`,
      snapshot.fileList ? `Workspace Root Entries: ${snapshot.fileList}` : '',
      snapshot.memoryContext ? `Project Memory Context:\n${snapshot.memoryContext}` : '',
      `Tier 1 Global Rules (~/.gemini/GEMINI.md):\n${hydrated.profile.geminiMdRaw}`,
      `Active Linked MCP Servers: ${hydrated.mcpServers.map((m) => `${m.name} (${m.status})`).join(', ')}`,
      `Execution Mode: ${mode.toUpperCase()}${useGeminiRefinement ? ' (Voice Prompt Refinement Active)' : ''}`,
      `IMPORTANT INSTRUCTIONS:`,
      `1. You have real workspace tools: read_file, edit_file, write_file, and run_command. When the user asks you to inspect files, check logs, run commands, or modify code in ${project.workspacePath}, CALL THE TOOLS to actually perform the work rather than pretending!`,
      `2. Never claim a feature was changed in a file unless you actually called edit_file or write_file on that file.`,
      `3. Format your response cleanly in Markdown using "- " on its own line for every bullet point, "### " for section headers, and inline backticks for code/paths.`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const candidates = Array.from(new Set([modelName, 'gemini-3.5-flash', 'gemini-3.8-flash']));
    let activeModel = candidates[0];

    const contents: Content[] = [{ role: 'user', parts: [{ text: prompt }] }];

    // Multi-turn function-calling loop (up to 4 tool iterations)
    for (let step = 0; step < 4; step++) {
      let response = null;
      let lastErr: unknown = null;

      for (const candidate of candidates) {
        try {
          activeModel = candidate;
          response = await ai.models.generateContent({
            model: candidate,
            contents,
            config: {
              systemInstruction,
              temperature: 0.2,
              thinkingConfig: { thinkingBudget: 0 },
              tools: [{ functionDeclarations: WORKSPACE_TOOL_DECLARATIONS }],
            },
          });
          break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!response) {
        throw lastErr || new Error('Gemini API call failed');
      }

      const fnCalls = response.functionCalls;
      if (fnCalls && fnCalls.length > 0) {
        const modelContent = response.candidates?.[0]?.content;
        if (modelContent) {
          contents.push(modelContent);
        }

        const responseParts: Array<{
          functionResponse: { name: string; response: Record<string, unknown> };
        }> = [];

        for (const call of fnCalls) {
          const fnName = call.name || 'workspace_tool';
          const fnArgs = (call.args || {}) as Record<string, unknown>;

          const preToolEvt = store.addHookEvent({
            projectId: project.id,
            eventType: 'PreToolUse',
            toolName: fnName,
            summary: `Running ${fnName}(${Object.values(fnArgs).map((v) => String(v).slice(0, 32)).join(', ')})`,
            status: 'running',
          });
          toolEvents.push(preToolEvt);
          broadcast('hook_event', preToolEvt);

          const execResult = executeWorkspaceTool(
            fnName,
            fnArgs,
            project.workspacePath,
            modifiedFiles
          );

          const postToolEvt = store.addHookEvent({
            projectId: project.id,
            eventType: 'PostToolUse',
            toolName: fnName,
            summary: execResult.summary,
            detail: execResult.output.slice(0, 300),
            status: execResult.ok ? 'done' : 'blocked',
          });
          toolEvents.push(postToolEvt);
          broadcast('hook_event', postToolEvt);

          store.updateMessage(project.id, assistantMessage.id, (m) => {
            m.toolEvents = toolEvents;
            m.checkpoint = checkpoint;
          });

          responseParts.push({
            functionResponse: {
              name: fnName,
              response: {
                ok: execResult.ok,
                summary: execResult.summary,
                output: execResult.output,
              },
            },
          });
        }

        contents.push({
          role: 'user',
          parts: responseParts,
        });
        continue;
      }

      // No more function calls; capture final text response
      const finalText = response.text || '';
      if (finalText.trim().length > 0) {
        fullText = finalText;
        store.updateMessage(project.id, assistantMessage.id, (m) => {
          m.content = fullText;
          m.model = activeModel;
          m.toolEvents = toolEvents;
          m.checkpoint = checkpoint;
        });
        broadcast('agent_chunk', {
          projectId: project.id,
          messageId: assistantMessage.id,
          delta: fullText,
          content: fullText,
        });
      }
      break;
    }

    if (!fullText.trim()) {
      fullText =
        modifiedFiles.length > 0
          ? `Completed workspace modifications (${modifiedFiles.map((f) => `\`${f.relativePath}\``).join(', ')}). Checkpoint \`#${checkpointId}\` is ready for rollback if needed.`
          : `Processed instruction in **${project.name}** (\`${project.workspacePath}\`).`;
    }

    const postGenEvt = store.addHookEvent({
      projectId: project.id,
      eventType: 'PostToolUse',
      toolName: 'gemini_profile_agent',
      summary: `Synthesized response via ${activeModel} (${modifiedFiles.length} file(s) snapshotted)`,
      status: 'done',
    });
    toolEvents.push(postGenEvt);
    broadcast('hook_event', postGenEvt);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    fullText = [
      `### ⚡ Antigravity Workspace Telemetry (${project.name})`,
      `- **Workspace**: \`${project.workspacePath}\` (\`${project.gitBranch}\`)`,
      `- **Daemon**: \`${project.daemonName}\` on \`127.0.0.1:${project.internalPort}\` (**${project.healthStatus.toUpperCase()}**)`,
      `- **Tier 2 Guardrail**: ${project.tier2Allocation}`,
      `- **Checkpoint**: \`#${checkpointId}\``,
      ``,
      `> Note: Gemini API returned: \`${errMsg}\``,
    ].join('\n');
  }

  const stopEvt = store.addHookEvent({
    projectId: project.id,
    eventType: 'Stop',
    toolName: 'antigravity_turn_complete',
    summary: `Completed instruction in ${project.name} (Checkpoint #${checkpointId})`,
    status: 'done',
  });
  toolEvents.push(stopEvt);
  broadcast('hook_event', stopEvt);

  store.updateMessage(project.id, userMessage.id, (m) => {
    m.checkpoint = checkpoint;
  });

  const updated =
    store.updateMessage(project.id, assistantMessage.id, (m) => {
      m.content = fullText;
      m.toolEvents = toolEvents;
      m.checkpoint = checkpoint;
    }) || assistantMessage;

  store.setProjectStatus(project.id, 'Completed');
  broadcast('status_changed', { projectId: project.id, status: 'Completed' });
  broadcast('message_completed', { projectId: project.id, message: updated });

  return { userMessage, assistantMessage: updated };
}
