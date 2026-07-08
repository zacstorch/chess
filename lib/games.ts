import { getKv } from "./kv.ts";
import { type Color, type GameState, initialGameState } from "./chess.ts";

export type GameStatus = "active" | "checkmate" | "stalemate" | "timeout";

export interface GameRecord {
  id: string;
  white: string;
  black: string;
  timerMinutes: number | null;
  createdAt: string;
  state: GameState;
  whiteRemainingMs: number | null;
  blackRemainingMs: number | null;
  turnStartedAt: string;
  status: GameStatus;
  winner: Color | null;
  skinUnlocked: string | null;
}

function gameKey(id: string) {
  return ["games", id];
}

export async function createGame(
  playerA: string,
  playerB: string,
  timerMinutes: number | null,
): Promise<GameRecord> {
  const kv = await getKv();
  const id = crypto.randomUUID();
  const aIsWhite = Math.random() < 0.5;
  const timerMs = timerMinutes !== null ? timerMinutes * 60_000 : null;
  const game: GameRecord = {
    id,
    white: aIsWhite ? playerA : playerB,
    black: aIsWhite ? playerB : playerA,
    timerMinutes,
    createdAt: new Date().toISOString(),
    state: initialGameState(),
    whiteRemainingMs: timerMs,
    blackRemainingMs: timerMs,
    turnStartedAt: new Date().toISOString(),
    status: "active",
    winner: null,
    skinUnlocked: null,
  };
  await kv.set(gameKey(id), game);
  return game;
}

export async function getGame(id: string): Promise<GameRecord | null> {
  const kv = await getKv();
  const entry = await kv.get<GameRecord>(gameKey(id));
  return entry.value;
}

export async function saveGame(game: GameRecord): Promise<void> {
  const kv = await getKv();
  await kv.set(gameKey(game.id), game);
}
