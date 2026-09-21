import type { SupabaseClient } from "@supabase/supabase-js";

export interface Submission {
  id: string;
  createdAt: string;
  status: string;
  filePath: string | null;
  fileMime: string | null;
  result: unknown | null;
  deleteAfter: string;
}

function mapRow(r: Record<string, unknown>): Submission {
  return {
    id: r.id as string,
    createdAt: r.created_at as string,
    status: r.status as string,
    filePath: (r.file_path as string) ?? null,
    fileMime: (r.file_mime as string) ?? null,
    result: r.result ?? null,
    deleteAfter: r.delete_after as string,
  };
}

const COLS = "id, created_at, status, file_path, file_mime, result, delete_after";

export async function createSubmission(
  db: SupabaseClient,
  input: { status?: string; retentionDays?: number },
): Promise<Submission> {
  const row: Record<string, unknown> = { status: input.status ?? "received" };
  if (input.retentionDays !== undefined) {
    row.delete_after = new Date(Date.now() + input.retentionDays * 24 * 60 * 60 * 1000).toISOString();
  }
  const { data, error } = await db
    .from("submissions")
    .insert(row)
    .select(COLS)
    .single();
  if (error || !data) throw new Error(`createSubmission fejlede: ${error?.message}`);
  return mapRow(data);
}

export async function setSubmissionFile(db: SupabaseClient, id: string, filePath: string, fileMime: string): Promise<void> {
  const { error } = await db.from("submissions").update({ file_path: filePath, file_mime: fileMime }).eq("id", id);
  if (error) throw new Error(`setSubmissionFile fejlede: ${error.message}`);
}

export async function getSubmission(db: SupabaseClient, id: string): Promise<Submission | null> {
  const { data, error } = await db.from("submissions").select(COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(`getSubmission fejlede: ${error.message}`);
  return data ? mapRow(data) : null;
}

export async function listSubmissions(db: SupabaseClient, limit = 50): Promise<Submission[]> {
  const { data, error } = await db.from("submissions").select(COLS).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`listSubmissions fejlede: ${error.message}`);
  return (data ?? []).map(mapRow);
}
