import { page } from "fresh";
import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { getSessionUsername, parseSessionToken } from "../../lib/session.ts";
import { getGameChecked } from "../../lib/game-play.ts";
import { isPresentInGame, touchGamePresence } from "../../lib/presence.ts";
import GameBoard from "../../islands/GameBoard.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const token = parseSessionToken(ctx.req.headers.get("cookie"));
    const username = await getSessionUsername(token);
    if (!username) return ctx.redirect("/play");

    const game = await getGameChecked(ctx.params.id);
    if (!game || (game.white !== username && game.black !== username)) {
      return ctx.redirect("/lobby");
    }

    await touchGamePresence(game.id, username);
    const opponent = game.white === username ? game.black : game.white;
    const opponentPresent = await isPresentInGame(game.id, opponent);

    return page({ game, username, opponentPresent });
  },
});

export default define.page<typeof handler>(function GamePage({ data }) {
  return (
    <div class="px-2 py-4 sm:px-4 sm:py-8 mx-auto min-h-screen">
      <Head>
        <title>Chess — Game</title>
      </Head>
      <div class="max-w-screen-md mx-auto flex flex-col items-center">
        <h1 class="text-2xl sm:text-4xl font-bold mb-3 sm:mb-6">Chess</h1>
        <GameBoard
          gameId={data.game.id}
          username={data.username}
          initialGame={data.game}
          initialOpponentPresent={data.opponentPresent}
        />
      </div>
    </div>
  );
});
