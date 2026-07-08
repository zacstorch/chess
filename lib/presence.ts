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

const GAME_PRESENCE_TTL_MS = 10_000;

function gamePresenceKey(gameId: string, username: string) {
  return ["game-presence", gameId, username];
}

export async function touchGamePresence(
  gameId: string,
  username: string,
): Promise<void> {
  const kv = await getKv();
  await kv.set(gamePresenceKey(gameId, username), true, {
    expireIn: GAME_PRESENCE_TTL_MS,
  });
}

export async function isPresentInGame(
  gameId: string,
  username: string,
): Promise<boolean> {
  const kv = await getKv();
  const entry = await kv.get<boolean>(gamePresenceKey(gameId, username));
  return entry.value === true;
}
