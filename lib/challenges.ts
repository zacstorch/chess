import { getKv } from "./kv.ts";
import { createGame, type GameRecord } from "./games.ts";

export interface PendingChallenge {
  from: string;
  timerMinutes: number | null;
}

const CHALLENGE_TTL_MS = 60_000;
const ACTIVE_GAME_TTL_MS = 20_000;

function challengeKey(to: string) {
  return ["challenges", to];
}

function activeGameKey(username: string) {
  return ["active-game", username];
}

export async function sendChallenge(
  from: string,
  to: string,
  timerMinutes: number | null,
): Promise<void> {
  const kv = await getKv();
  await kv.set(challengeKey(to), { from, timerMinutes }, {
    expireIn: CHALLENGE_TTL_MS,
  });
}

export async function getPendingChallenge(
  username: string,
): Promise<PendingChallenge | null> {
  const kv = await getKv();
  const entry = await kv.get<PendingChallenge>(challengeKey(username));
  return entry.value;
}

export async function acceptChallenge(
  username: string,
): Promise<GameRecord | null> {
  const kv = await getKv();
  const entry = await kv.get<PendingChallenge>(challengeKey(username));
  if (!entry.value) return null;

  const { from, timerMinutes } = entry.value;
  await kv.delete(challengeKey(username));

  const game = await createGame(from, username, timerMinutes);
  await kv.set(activeGameKey(from), game.id, { expireIn: ACTIVE_GAME_TTL_MS });
  await kv.set(activeGameKey(username), game.id, {
    expireIn: ACTIVE_GAME_TTL_MS,
  });
  return game;
}

export async function getActiveGameId(
  username: string,
): Promise<string | null> {
  const kv = await getKv();
  const entry = await kv.get<string>(activeGameKey(username));
  return entry.value;
}
