import { define } from "../../utils.ts";
import { getSessionUsername, parseSessionToken } from "../../lib/session.ts";
import { submitMove } from "../../lib/game-play.ts";
import type { Pos } from "../../lib/chess.ts";

function isValidPos(value: unknown): value is Pos {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return typeof p.row === "number" && typeof p.col === "number" &&
    p.row >= 0 && p.row <= 7 && p.col >= 0 && p.col <= 7;
}

export const handler = define.handlers({
  async POST(ctx) {
    const token = parseSessionToken(ctx.req.headers.get("cookie"));
    const username = await getSessionUsername(token);
    if (!username) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }

    const body = await ctx.req.json().catch(() => null);
    const gameId = typeof body?.gameId === "string" ? body.gameId : "";
    const promotion = typeof body?.promotion === "string"
      ? body.promotion
      : undefined;

    if (!gameId || !isValidPos(body?.from) || !isValidPos(body?.to)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await submitMove(gameId, username, {
      from: body.from,
      to: body.to,
      promotion,
    });
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    return Response.json({ game: result.game });
  },
});
