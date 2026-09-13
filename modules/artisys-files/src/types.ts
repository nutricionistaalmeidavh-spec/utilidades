export type WorkspaceEntryType = 'file' | 'directory';

export interface WorkspaceEntry {
  name: string;
  path: string;
  type: WorkspaceEntryType;
  size?: number;
  extension?: string;
  modifiedAt?: string;
}

export interface WorkspaceTree extends WorkspaceEntry {
  type: 'directory';
  children: Array<WorkspaceTree | WorkspaceEntry>;
}

export type WorkspaceChangeKind = 'created' | 'changed' | 'deleted' | 'renamed';

export interface WorkspaceChange {
  kind: WorkspaceChangeKind;
  path: string;
  previousPath?: string;
}

export type WorkspaceOperationKind =
  | 'create-directory'
  | 'write-file'
  | 'rename'
  | 'move'
  | 'copy'
  | 'remove';

export interface WorkspaceOperation {
  kind: WorkspaceOperationKind;
  source?: string;
  destination?: string;
  path?: string;
}

export interface DropRequest {
  sourcePath: string;
  targetDirectory: string;
  mode?: 'move' | 'copy';
}
