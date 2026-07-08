import { getKv } from "./kv.ts";

const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function sessionKey(token: string) {
  return ["sessions", token];
}

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSession(username: string): Promise<string> {
  const kv = await getKv();
  const token = generateToken();
  await kv.set(sessionKey(token), { username }, {
    expireIn: SESSION_TTL_MS,
  });
  return token;
}

export async function getSessionUsername(
  token: string | undefined,
): Promise<string | null> {
  if (!token) return null;
  const kv = await getKv();
  const entry = await kv.get<{ username: string }>(sessionKey(token));
  return entry.value?.username ?? null;
}

export async function deleteSession(token: string | undefined): Promise<void> {
  if (!token) return;
  const kv = await getKv();
  await kv.delete(sessionKey(token));
}

export function sessionCookieHeader(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
    Math.floor(SESSION_TTL_MS / 1000)
  }`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function parseSessionToken(
  cookieHeader: string | null,
): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  return match?.slice(SESSION_COOKIE.length + 1);
}
