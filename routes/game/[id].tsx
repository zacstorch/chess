import { page } from "fresh";
import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { getSessionUsername, parseSessionToken } from "../../lib/session.ts";
import { getGame } from "../../lib/games.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const token = parseSessionToken(ctx.req.headers.get("cookie"));
    const username = await getSessionUsername(token);
    if (!username) return ctx.redirect("/play");

    const game = await getGame(ctx.params.id);
    if (!game || (game.white !== username && game.black !== username)) {
      return ctx.redirect("/lobby");
    }

    return page({ game, username });
  },
});

export default define.page<typeof handler>(function GamePage({ data }) {
  const { game } = data;
  const timerLabel = game.timerMinutes ? `${game.timerMinutes} min` : "Untimed";

  return (
    <div class="px-2 py-4 sm:px-4 sm:py-8 mx-auto min-h-screen flex items-center justify-center">
      <Head>
        <title>Chess — Game</title>
      </Head>
      <div class="max-w-screen-sm w-full mx-auto flex flex-col items-center gap-4 text-center">
        <h1 class="text-2xl sm:text-3xl font-bold">Game Starting</h1>
        <p>
          <strong>{game.white}</strong> (White) vs <strong>{game.black}</strong>
          {" "}
          (Black)
        </p>
        <p class="text-gray-600">Time control: {timerLabel}</p>
        <p class="text-gray-600">The live board is coming soon.</p>
        <a href="/lobby" class="underline text-sm">Back to Lobby</a>
      </div>
    </div>
  );
});
