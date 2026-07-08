import { page } from "fresh";
import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { getSessionUsername, parseSessionToken } from "../lib/session.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const token = parseSessionToken(ctx.req.headers.get("cookie"));
    const username = await getSessionUsername(token);
    if (!username) return ctx.redirect("/play");
    return page({ username });
  },
});

export default define.page<typeof handler>(function Lobby({ data }) {
  return (
    <div class="px-2 py-4 sm:px-4 sm:py-8 mx-auto min-h-screen flex items-center justify-center">
      <Head>
        <title>Chess — Lobby</title>
      </Head>
      <div class="max-w-screen-sm w-full mx-auto flex flex-col items-center gap-4 text-center">
        <h1 class="text-2xl sm:text-3xl font-bold">Lobby</h1>
        <p>
          Logged in as <strong>{data.username}</strong>
        </p>
        <p class="text-gray-600">Matchmaking is coming soon.</p>
        <a href="/logout" class="underline text-sm">Log out</a>
      </div>
    </div>
  );
});
