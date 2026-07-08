import { define } from "../../utils.ts";
import { getSessionUsername, parseSessionToken } from "../../lib/session.ts";
import { acceptChallenge } from "../../lib/challenges.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const token = parseSessionToken(ctx.req.headers.get("cookie"));
    const username = await getSessionUsername(token);
    if (!username) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }

    const game = await acceptChallenge(username);
    if (!game) {
      return Response.json({ error: "no pending challenge" }, {
        status: 400,
      });
    }

    return Response.json({ gameId: game.id });
  },
});
