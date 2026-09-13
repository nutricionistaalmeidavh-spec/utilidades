import type { WorkspaceEntry, WorkspaceTree } from './types.js';

export interface IndexedWorkspaceEntry extends WorkspaceEntry {
  searchable: string;
}

function flatten(tree: WorkspaceTree): WorkspaceEntry[] {
  const result: WorkspaceEntry[] = [];
  for (const child of tree.children) {
    result.push(child);
    if (child.type === 'directory' && 'children' in child) {
      result.push(...flatten(child as WorkspaceTree));
    }
  }
  return result;
}

export class WorkspaceIndex {
  private entries: IndexedWorkspaceEntry[] = [];

  rebuild(tree: WorkspaceTree): void {
    this.entries = flatten(tree).map((entry) => ({
      ...entry,
      searchable: `${entry.name} ${entry.path} ${entry.extension ?? ''} ${entry.type}`.toLocaleLowerCase(),
    }));
  }

  search(query: string): WorkspaceEntry[] {
    const terms = query
      .trim()
      .toLocaleLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (terms.length === 0) return this.entries.map(({ searchable: _searchable, ...entry }) => entry);

    return this.entries
      .filter((entry) => terms.every((term) => entry.searchable.includes(term)))
      .map(({ searchable: _searchable, ...entry }) => entry);
  }
}
