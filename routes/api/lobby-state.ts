import { define } from "../../utils.ts";
import { getSessionUsername, parseSessionToken } from "../../lib/session.ts";
import { listOnlineUsers, touchPresence } from "../../lib/presence.ts";
import { getActiveGameId, getPendingChallenge } from "../../lib/challenges.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const token = parseSessionToken(ctx.req.headers.get("cookie"));
    const username = await getSessionUsername(token);
    if (!username) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }

    await touchPresence(username);
    const [online, challenge, activeGameId] = await Promise.all([
      listOnlineUsers(username),
      getPendingChallenge(username),
      getActiveGameId(username),
    ]);

    return Response.json({ online, challenge, activeGameId });
  },
});
