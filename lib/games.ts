import { getKv } from "./kv.ts";

export interface Game {
  id: string;
  white: string;
  black: string;
  timerMinutes: number | null;
  createdAt: string;
}

function gameKey(id: string) {
  return ["games", id];
}

export async function createGame(
  playerA: string,
  playerB: string,
  timerMinutes: number | null,
): Promise<Game> {
  const kv = await getKv();
  const id = crypto.randomUUID();
  const aIsWhite = Math.random() < 0.5;
  const game: Game = {
    id,
    white: aIsWhite ? playerA : playerB,
    black: aIsWhite ? playerB : playerA,
    timerMinutes,
    createdAt: new Date().toISOString(),
  };
  await kv.set(gameKey(id), game);
  return game;
}

export async function getGame(id: string): Promise<Game | null> {
  const kv = await getKv();
  const entry = await kv.get<Game>(gameKey(id));
  return entry.value;
}
