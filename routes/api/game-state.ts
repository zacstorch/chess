import { define } from "../../utils.ts";
import { getSessionUsername, parseSessionToken } from "../../lib/session.ts";
import { getGameChecked } from "../../lib/game-play.ts";
import { isPresentInGame, touchGamePresence } from "../../lib/presence.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const token = parseSessionToken(ctx.req.headers.get("cookie"));
    const username = await getSessionUsername(token);
    if (!username) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }

    const gameId = ctx.url.searchParams.get("gameId") ?? "";
    const game = await getGameChecked(gameId);
    if (!game || (game.white !== username && game.black !== username)) {
      return Response.json({ error: "not found" }, { status: 404 });
    }

    await touchGamePresence(gameId, username);
    const opponent = game.white === username ? game.black : game.white;
    const opponentPresent = await isPresentInGame(gameId, opponent);

    return Response.json({ game, opponentPresent });
  },
});
