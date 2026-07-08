import { define } from "../utils.ts";
import {
  clearSessionCookieHeader,
  deleteSession,
  parseSessionToken,
} from "../lib/session.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const token = parseSessionToken(ctx.req.headers.get("cookie"));
    await deleteSession(token);
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": clearSessionCookieHeader(),
      },
    });
  },
});
