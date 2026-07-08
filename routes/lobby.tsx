import { page } from "fresh";
import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { getSessionUsername, parseSessionToken } from "../lib/session.ts";
import { listOnlineUsers, touchPresence } from "../lib/presence.ts";
import Lobby from "../islands/Lobby.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const token = parseSessionToken(ctx.req.headers.get("cookie"));
    const username = await getSessionUsername(token);
    if (!username) return ctx.redirect("/play");

    await touchPresence(username);
    const online = await listOnlineUsers(username);
    return page({ username, online });
  },
});

export default define.page<typeof handler>(function LobbyPage({ data }) {
  return (
    <div class="px-2 py-4 sm:px-4 sm:py-8 mx-auto min-h-screen flex flex-col items-center">
      <Head>
        <title>Chess — Lobby</title>
      </Head>
      <div class="max-w-screen-sm w-full mx-auto flex flex-col items-center gap-4">
        <h1 class="text-2xl sm:text-3xl font-bold">Lobby</h1>
        <p class="text-center">
          Logged in as <strong>{data.username}</strong> —{" "}
          <a href="/logout" class="underline text-sm">Log out</a>
        </p>
        <Lobby initialOnline={data.online} />
      </div>
    </div>
  );
});
