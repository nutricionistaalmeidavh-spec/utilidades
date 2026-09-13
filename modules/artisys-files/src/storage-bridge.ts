import type { WorkspaceEntry } from './types.js';

export interface WorkspaceStorageBridge {
  put(path: string, data: Uint8Array): Promise<void>;
  get(path: string): Promise<Uint8Array | null>;
  remove(path: string): Promise<void>;
  list(prefix?: string): Promise<WorkspaceEntry[]>;
}
