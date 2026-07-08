import {
  applyMove,
  type Color,
  getGameStatus,
  legalMovesFrom,
  type Pos,
  posEq,
} from "./chess.ts";
import { type GameRecord, getGame, saveGame } from "./games.ts";
import { recordWin } from "./skins.ts";

export type MoveResult =
  | { ok: true; game: GameRecord }
  | { ok: false; error: string };

function colorOf(game: GameRecord, username: string): Color | null {
  if (game.white === username) return "w";
  if (game.black === username) return "b";
  return null;
}

async function concludeGame(
  game: GameRecord,
  winner: Color | null,
): Promise<void> {
  game.winner = winner;
  if (winner !== null) {
    const winnerUsername = winner === "w" ? game.white : game.black;
    const { newlyUnlocked } = await recordWin(winnerUsername);
    game.skinUnlocked = newlyUnlocked?.id ?? null;
  }
}

async function applyTimeout(game: GameRecord): Promise<GameRecord> {
  if (game.status !== "active" || game.timerMinutes === null) return game;

  const remaining = game.state.turn === "w"
    ? game.whiteRemainingMs
    : game.blackRemainingMs;
  const elapsed = Date.now() - new Date(game.turnStartedAt).getTime();

  if (remaining !== null && remaining - elapsed <= 0) {
    game.status = "timeout";
    await concludeGame(game, game.state.turn === "w" ? "b" : "w");
  }
  return game;
}

/** Fetches a game and lazily resolves a timeout if the clock has run out. */
export async function getGameChecked(id: string): Promise<GameRecord | null> {
  const game = await getGame(id);
  if (!game) return null;

  const wasActive = game.status === "active";
  const checked = await applyTimeout(game);
  if (wasActive && checked.status !== "active") {
    await saveGame(checked);
  }
  return checked;
}

export async function submitMove(
  gameId: string,
  username: string,
  move: { from: Pos; to: Pos; promotion?: string },
): Promise<MoveResult> {
  const game = await getGameChecked(gameId);
  if (!game) return { ok: false, error: "Game not found" };
  if (game.status !== "active") return { ok: false, error: "Game is over" };

  const color = colorOf(game, username);
  if (!color) {
    return { ok: false, error: "You are not a player in this game" };
  }
  if (game.state.turn !== color) return { ok: false, error: "Not your turn" };

  const candidates = legalMovesFrom(game.state, move.from);
  const match = candidates.find((m) =>
    posEq(m.to, move.to) &&
    (m.promotion ?? null) === (move.promotion ?? null)
  );
  if (!match) return { ok: false, error: "Illegal move" };

  const now = Date.now();
  if (game.timerMinutes !== null) {
    const elapsed = now - new Date(game.turnStartedAt).getTime();
    if (color === "w") {
      game.whiteRemainingMs = Math.max(
        0,
        (game.whiteRemainingMs ?? 0) - elapsed,
      );
    } else {
      game.blackRemainingMs = Math.max(
        0,
        (game.blackRemainingMs ?? 0) - elapsed,
      );
    }
  }

  game.state = applyMove(game.state, match);
  game.turnStartedAt = new Date(now).toISOString();

  const status = getGameStatus(game.state);
  if (status === "checkmate") {
    game.status = "checkmate";
    await concludeGame(game, color);
  } else if (status === "stalemate") {
    game.status = "stalemate";
    await concludeGame(game, null);
  }

  await saveGame(game);
  return { ok: true, game };
}
