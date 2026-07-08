import { define } from "../../utils.ts";
import { getSessionUsername, parseSessionToken } from "../../lib/session.ts";
import { sendChallenge } from "../../lib/challenges.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const token = parseSessionToken(ctx.req.headers.get("cookie"));
    const username = await getSessionUsername(token);
    if (!username) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }

    const body = await ctx.req.json().catch(() => null);
    const to = typeof body?.to === "string" ? body.to : "";
    const timerMinutes = typeof body?.timerMinutes === "number"
      ? body.timerMinutes
      : null;

    if (!to || to === username) {
      return Response.json({ error: "invalid opponent" }, { status: 400 });
    }

    await sendChallenge(username, to, timerMinutes);
    return Response.json({ ok: true });
  },
});
