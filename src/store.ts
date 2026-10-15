import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { OrbitalStatus } from './profileSync.js';

export interface ToolEventItem {
  id: string;
  projectId: string;
  eventType: 'PreToolUse' | 'PostToolUse' | 'Stop' | 'System';
  toolName: string;
  summary: string;
  detail?: string;
  status: 'running' | 'done' | 'blocked';
  timestamp: string;
}

export interface FileSnapshot {
  relativePath: string;
  existed: boolean;
  originalContent: string;
  newContent?: string;
}

export interface WorkspaceCheckpoint {
  id: string;
  projectId: string;
  userMessageId: string;
  assistantMessageId?: string;
  gitBranch: string;
  gitHead: string;
  createdAt: string;
  modifiedFiles: FileSnapshot[];
}

export interface ConversationMessage {
  id: string;
  projectId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  mode?: string;
  refinedPrompt?: string;
  model?: string;
  toolEvents?: ToolEventItem[];
  checkpoint?: WorkspaceCheckpoint;
  timestamp: string;
}

interface PersistedState {
  projectStatuses: Record<string, OrbitalStatus>;
  messagesByProject: Record<string, ConversationMessage[]>;
  recentHooks: ToolEventItem[];
}

const DEFAULT_STATE: PersistedState = {
  projectStatuses: {
    'antigravity-remote': 'Idle',
    removebackground: 'Idle',
    binaryday: 'Idle',
    snapcal: 'Idle',
  },
  messagesByProject: {
    'antigravity-remote': [
      {
        id: 'welcome-ag',
        projectId: 'antigravity-remote',
        role: 'assistant',
        content:
          '**Antigravity Remote v1.1** online (`127.0.0.1:8787`).\n\nZero-Config Gemini Profile Hydration has automatically discovered **4 colocated workspaces** (`RemoveBackGround`, `BinaryDay`, `SnapCal`, `AntigravityRemote`), **7 MCP servers** (`Vast.ai`, `Cloudflare`, `OVH`, `GitHub`, `Stitch`, `Resend`, `Stripe`), and your **3-Tier Memory Hierarchy** (`~/.gemini/GEMINI.md` + `.agents/rules/infra.md`).\n\n- **Agentic Workspace Tools**: `read_file`, `edit_file`, `write_file`, and `run_command` are active.\n- **Antigravity Rollbacks**: Every prompt creates an automatic workspace snapshot so you can revert conversation turns and file edits with one tap.\n- **Session Protection**: Protected by HMAC-SHA256 JWT + `HttpOnly` strict cookie with a **30-minute sliding inactivity auto-logout**.',
        model: 'gemini-3.5-flash',
        timestamp: new Date().toISOString(),
        toolEvents: [
          {
            id: 'init-hook-1',
            projectId: 'antigravity-remote',
            eventType: 'PostToolUse',
            toolName: 'profile_sync',
            summary: 'Hydrated ~/.gemini/GEMINI.md, mcp_config.json & 4 Vast.ai workspaces',
            status: 'done',
            timestamp: new Date().toISOString(),
          },
        ],
      },
    ],
    removebackground: [
      {
        id: 'welcome-rbg',
        projectId: 'removebackground',
        role: 'assistant',
        content:
          '**RemoveBackGround** workspace synced (`/workspace` • `https://removeback.gd`).\n\n- **GPU Allocation**: 100% Dedicated NVIDIA RTX 4060 Ti (`16 GB VRAM` on `cuda:0`)\n- **Daemon**: `model_server` (`127.0.0.1:7861`)\n- **Isolation**: PostgreSQL `removebg` • Redis `DB 2` • S3 `removebg-private`',
        model: 'gemini-3.5-flash',
        timestamp: new Date().toISOString(),
      },
    ],
    binaryday: [
      {
        id: 'welcome-bd',
        projectId: 'binaryday',
        role: 'assistant',
        content:
          '**BinaryDay** workspace synced (`/workspace/binaryday` • `https://binaryday.app`).\n\n- **Daemon**: `binaryday` (`127.0.0.1:4001`)\n- **Isolation**: PostgreSQL `binaryday` • Redis `DB 0` • `0 Bytes GPU VRAM`\n- **Edge Ingress**: Cloudflare Origin Rule (`44190`) + Pooled Caddy',
        model: 'gemini-3.5-flash',
        timestamp: new Date().toISOString(),
      },
    ],
    snapcal: [
      {
        id: 'welcome-sc',
        projectId: 'snapcal',
        role: 'assistant',
        content:
          '**SnapCal** workspace synced (`/workspace/snapcal` • `https://snapcal.io`).\n\n- **Daemon**: `snapcal` (`127.0.0.1:4002`)\n- **Isolation**: PostgreSQL `snapcal` • Redis `DB 1` • `0 Bytes GPU VRAM`',
        model: 'gemini-3.5-flash',
        timestamp: new Date().toISOString(),
      },
    ],
  },
  recentHooks: [],
};

export class StateStore {
  private filePath: string;
  private state: PersistedState;

  constructor(dataDir: string) {
    fs.mkdirSync(dataDir, { recursive: true });
    this.filePath = path.join(dataDir, 'store.json');
    this.state = this.load();
  }

  private load(): PersistedState {
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as PersistedState;
        return {
          projectStatuses: { ...DEFAULT_STATE.projectStatuses, ...parsed.projectStatuses },
          messagesByProject: { ...DEFAULT_STATE.messagesByProject, ...parsed.messagesByProject },
          recentHooks: Array.isArray(parsed.recentHooks) ? parsed.recentHooks.slice(-100) : [],
        };
      }
    } catch {
      // fallback to default
    }
    return structuredClone(DEFAULT_STATE);
  }

  private save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch {
      // ignore write errors
    }
  }

  public getProjectStatuses(): Record<string, OrbitalStatus> {
    return { ...this.state.projectStatuses };
  }

  public setProjectStatus(projectId: string, status: OrbitalStatus): void {
    this.state.projectStatuses[projectId] = status;
    this.save();
  }

  public getMessages(projectId: string): ConversationMessage[] {
    return this.state.messagesByProject[projectId] || [];
  }

  public addMessage(msg: Omit<ConversationMessage, 'id' | 'timestamp'>): ConversationMessage {
    const full: ConversationMessage = {
      ...msg,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    if (!this.state.messagesByProject[msg.projectId]) {
      this.state.messagesByProject[msg.projectId] = [];
    }
    this.state.messagesByProject[msg.projectId].push(full);
    if (this.state.messagesByProject[msg.projectId].length > 80) {
      this.state.messagesByProject[msg.projectId] =
        this.state.messagesByProject[msg.projectId].slice(-80);
    }
    this.save();
    return full;
  }

  public updateMessage(
    projectId: string,
    messageId: string,
    updater: (msg: ConversationMessage) => void
  ): ConversationMessage | null {
    const list = this.state.messagesByProject[projectId] || [];
    const found = list.find((m) => m.id === messageId);
    if (!found) return null;
    updater(found);
    this.save();
    return found;
  }

  /**
   * Rolls back the conversation and any workspace file modifications back to before
   * the specified message turn (just like Antigravity IDE's "Revert to this step").
   */
  public rollbackToMessage(
    projectId: string,
    targetMessageId: string,
    workspacePath: string
  ): {
    ok: boolean;
    restoredFiles: string[];
    removedMessageCount: number;
    rolledBackPrompt: string;
    messages: ConversationMessage[];
  } {
    const list = this.state.messagesByProject[projectId] || [];
    let targetIdx = list.findIndex((m) => m.id === targetMessageId);
    if (targetIdx === -1) {
      return {
        ok: false,
        restoredFiles: [],
        removedMessageCount: 0,
        rolledBackPrompt: '',
        messages: list,
      };
    }

    // If the user clicked rollback on an assistant card, include its preceding user prompt in the rollback
    if (list[targetIdx].role === 'assistant' && targetIdx > 0 && list[targetIdx - 1].role === 'user') {
      targetIdx = targetIdx - 1;
    }

    // Never delete the initial welcome message at index 0 if it's an assistant welcome card
    if (targetIdx === 0 && list[0]?.id?.startsWith('welcome-')) {
      targetIdx = 1;
    }

    const toRemove = list.slice(targetIdx);
    const rolledBackUserMsg = toRemove.find((m) => m.role === 'user');
    const rolledBackPrompt = rolledBackUserMsg?.content || '';

    const restoredSet = new Set<string>();

    // Revert file snapshots in reverse chronological order
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const msg = toRemove[i];
      const snaps = msg.checkpoint?.modifiedFiles || [];
      for (let j = snaps.length - 1; j >= 0; j--) {
        const snap = snaps[j];
        try {
          const absTarget = path.resolve(workspacePath, snap.relativePath);
          // Security boundary check: must remain inside workspacePath
          if (!absTarget.startsWith(path.resolve(workspacePath))) continue;
          if (snap.existed) {
            fs.mkdirSync(path.dirname(absTarget), { recursive: true });
            fs.writeFileSync(absTarget, snap.originalContent, 'utf-8');
          } else if (fs.existsSync(absTarget)) {
            fs.rmSync(absTarget, { force: true });
          }
          restoredSet.add(snap.relativePath);
        } catch {
          // ignore individual file restore failure
        }
      }
    }

    this.state.messagesByProject[projectId] = list.slice(0, targetIdx);
    this.state.projectStatuses[projectId] = 'Idle';
    this.save();

    return {
      ok: true,
      restoredFiles: Array.from(restoredSet),
      removedMessageCount: toRemove.length,
      rolledBackPrompt,
      messages: this.state.messagesByProject[projectId],
    };
  }

  public addHookEvent(evt: Omit<ToolEventItem, 'id' | 'timestamp'>): ToolEventItem {
    const full: ToolEventItem = {
      ...evt,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    this.state.recentHooks.push(full);
    if (this.state.recentHooks.length > 100) {
      this.state.recentHooks = this.state.recentHooks.slice(-100);
    }
    this.save();
    return full;
  }

  public getRecentHooks(projectId?: string): ToolEventItem[] {
    if (!projectId) return this.state.recentHooks.slice(-40);
    return this.state.recentHooks.filter((h) => h.projectId === projectId).slice(-40);
  }
}
