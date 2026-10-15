import { GoogleGenAI } from '@google/genai';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { DiscoveredProject, HydratedProfile } from './profileSync.js';
import type { StateStore, ConversationMessage, ToolEventItem } from './store.js';

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
  memoryContext: string;
  fileList: string;
} {
  let gitSummary = `Branch: ${project.gitBranch} | Commit: ${project.lastCommit}`;
  let memoryContext = '';
  let fileList = '';

  try {
    if (fs.existsSync(project.workspacePath)) {
      const entries = fs.readdirSync(project.workspacePath).slice(0, 24);
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

  return { gitSummary, memoryContext, fileList };
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

  const userMessage = store.addMessage({
    projectId: project.id,
    role: 'user',
    content: prompt,
    mode,
  });

  broadcast('message_created', { projectId: project.id, message: userMessage });

  // Transition orbital status -> Running
  store.setProjectStatus(project.id, 'Running');
  broadcast('status_changed', { projectId: project.id, status: 'Running' });

  const toolEvents: ToolEventItem[] = [];

  // Step 1: PreToolUse (Workspace & Tier-2 Cluster Inspection)
  const preEvt = store.addHookEvent({
    projectId: project.id,
    eventType: 'PreToolUse',
    toolName: 'inspect_workspace',
    summary: `Inspecting ${project.name} (${project.workspacePath}) & port :${project.internalPort}`,
    status: 'running',
  });
  toolEvents.push(preEvt);
  broadcast('hook_event', preEvt);

  const snapshot = gatherWorkspaceSnapshot(project);

  const postEvt = store.addHookEvent({
    projectId: project.id,
    eventType: 'PostToolUse',
    toolName: 'inspect_workspace',
    summary: `Synced branch '${project.gitBranch}' (${project.healthStatus.toUpperCase()} on :${project.internalPort})`,
    detail: snapshot.gitSummary,
    status: 'done',
  });
  toolEvents.push(postEvt);
  broadcast('hook_event', postEvt);

  // Create placeholder assistant message for live streaming
  const assistantMessage = store.addMessage({
    projectId: project.id,
    role: 'assistant',
    content: '',
    mode,
    model: modelName,
    toolEvents,
  });
  broadcast('message_created', { projectId: project.id, message: assistantMessage });

  let fullText = '';
  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = [
      `You are Antigravity Remote, the official mobile companion agent connected to ${hydrated.profile.hostname} on Vast.ai (85.10.218.46:44016).`,
      `Active Workspace: ${project.name} (${project.workspacePath})`,
      `Public URL: ${project.publicUrl} | Internal Daemon: ${project.daemonName} (127.0.0.1:${project.internalPort}, status: ${project.healthStatus})`,
      `Tier 2 Allocation: ${project.tier2Allocation}`,
      `Git State: ${snapshot.gitSummary}`,
      snapshot.fileList ? `Workspace Root Entries: ${snapshot.fileList}` : '',
      snapshot.memoryContext ? `Project Memory Context:\n${snapshot.memoryContext}` : '',
      `Tier 1 Global Rules (~/.gemini/GEMINI.md):\n${hydrated.profile.geminiMdRaw}`,
      `Active Linked MCP Servers: ${hydrated.mcpServers.map((m) => `${m.name} (${m.status})`).join(', ')}`,
      `Execution Mode: ${mode.toUpperCase()}${useGeminiRefinement ? ' (Voice Prompt Refinement Active)' : ''}`,
      `Format your response concisely in GitHub-flavored Markdown optimized for mobile reading on Brave iOS. Use bullet points, inline code backticks, and clear verification steps.`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const preGenEvt = store.addHookEvent({
      projectId: project.id,
      eventType: 'PreToolUse',
      toolName: 'gemini_profile_agent',
      summary: `Dispatching to ${modelName} with hydrated GEMINI.md & MCP context`,
      status: 'running',
    });
    toolEvents.push(preGenEvt);
    broadcast('hook_event', preGenEvt);

    const candidates = Array.from(new Set([modelName, 'gemini-3.5-flash', 'gemini-3.8-flash']));
    let activeModel = modelName;
    let succeeded = false;
    let lastStreamErr: unknown = null;

    for (const candidate of candidates) {
      try {
        activeModel = candidate;
        const stream = await ai.models.generateContentStream({
          model: candidate,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.3,
          },
        });

        for await (const chunk of stream) {
          const piece = chunk.text || '';
          if (piece) {
            fullText += piece;
            store.updateMessage(project.id, assistantMessage.id, (m) => {
              m.content = fullText;
              m.model = activeModel;
              m.toolEvents = toolEvents;
            });
            broadcast('agent_chunk', {
              projectId: project.id,
              messageId: assistantMessage.id,
              delta: piece,
              content: fullText,
            });
          }
        }
        if (fullText.trim().length > 0) {
          succeeded = true;
          break;
        }
      } catch (e) {
        lastStreamErr = e;
      }
    }

    if (!succeeded) {
      throw lastStreamErr || new Error('Empty stream response');
    }

    const postGenEvt = store.addHookEvent({
      projectId: project.id,
      eventType: 'PostToolUse',
      toolName: 'gemini_profile_agent',
      summary: `Synthesized response via ${activeModel} (${fullText.length} chars)`,
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
      `- **Latest Commit**: \`${project.lastCommit}\``,
      ``,
      `> Note: Gemini API stream returned: \`${errMsg}\``,
    ].join('\n');
  }

  const stopEvt = store.addHookEvent({
    projectId: project.id,
    eventType: 'Stop',
    toolName: 'antigravity_turn_complete',
    summary: `Completed instruction in ${project.name}`,
    status: 'done',
  });
  toolEvents.push(stopEvt);
  broadcast('hook_event', stopEvt);

  const updated =
    store.updateMessage(project.id, assistantMessage.id, (m) => {
      m.content = fullText;
      m.toolEvents = toolEvents;
    }) || assistantMessage;

  store.setProjectStatus(project.id, 'Completed');
  broadcast('status_changed', { projectId: project.id, status: 'Completed' });
  broadcast('message_completed', { projectId: project.id, message: updated });

  return { userMessage, assistantMessage: updated };
}
