export interface ExpiredRow {
  id: string;
  filePath: string | null;
}

export async function findExpired(deps: {
  listExpired: () => Promise<ExpiredRow[]>;
}): Promise<ExpiredRow[]> {
  return deps.listExpired();
}

export async function cleanupExpired(deps: {
  listExpired: () => Promise<ExpiredRow[]>;
  deleteFile: (path: string) => Promise<void>;
  deleteRow: (id: string) => Promise<void>;
}): Promise<{ deleted: number }> {
  const expired = await deps.listExpired();
  let deleted = 0;
  for (const row of expired) {
    if (row.filePath) await deps.deleteFile(row.filePath);
    await deps.deleteRow(row.id);
    deleted++;
  }
  return { deleted };
}
