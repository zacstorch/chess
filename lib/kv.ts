let kvInstance: Deno.Kv | null = null;

export async function getKv(): Promise<Deno.Kv> {
  if (!kvInstance) kvInstance = await Deno.openKv();
  return kvInstance;
}
