import { getKv } from "./kv.ts";

const PRESENCE_TTL_MS = 30_000;

function presenceKey(username: string) {
  return ["presence", username];
}

export async function touchPresence(username: string): Promise<void> {
  const kv = await getKv();
  await kv.set(presenceKey(username), true, { expireIn: PRESENCE_TTL_MS });
}

export async function listOnlineUsers(excluding: string): Promise<string[]> {
  const kv = await getKv();
  const online: string[] = [];
  for await (const entry of kv.list<boolean>({ prefix: ["presence"] })) {
    const username = entry.key[1] as string;
    if (username !== excluding) online.push(username);
  }
  return online;
}
