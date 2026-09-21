import type { SupabaseClient } from "@supabase/supabase-js";

export async function uploadBill(
  db: SupabaseClient,
  bucket: string,
  params: { submissionId: string; bytes: Uint8Array; mime: string },
): Promise<{ path: string }> {
  const path = `${params.submissionId}/original`;
  const { error } = await db.storage.from(bucket).upload(path, params.bytes, {
    contentType: params.mime,
    upsert: true,
  });
  if (error) throw new Error(`uploadBill fejlede: ${error.message}`);
  return { path };
}

export async function getSignedBillUrl(
  db: SupabaseClient,
  bucket: string,
  path: string,
  expiresInSec = 300,
): Promise<string> {
  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, expiresInSec);
  if (error || !data) throw new Error(`getSignedBillUrl fejlede: ${error?.message}`);
  return data.signedUrl;
}

export async function deleteBill(db: SupabaseClient, bucket: string, path: string): Promise<void> {
  const { error } = await db.storage.from(bucket).remove([path]);
  if (error) throw new Error(`deleteBill fejlede: ${error.message}`);
}
