import { page } from "fresh";
import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { getSessionUsername, parseSessionToken } from "../../lib/session.ts";
import { getGameChecked } from "../../lib/game-play.ts";
import { moveLabel } from "../../lib/chess.ts";
import { SKIN_CATALOG } from "../../lib/skins.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const token = parseSessionToken(ctx.req.headers.get("cookie"));
    const username = await getSessionUsername(token);
    if (!username) return ctx.redirect("/play");

    const game = await getGameChecked(ctx.params.id);
    if (!game || (game.white !== username && game.black !== username)) {
      return ctx.redirect("/lobby");
    }
    if (game.status === "active") return ctx.redirect(`/game/${game.id}`);

    return page({ game, username });
  },
});

export default define.page<typeof handler>(function PostGamePage({ data }) {
  const { game, username } = data;
  const myColor = game.white === username ? "w" : "b";
  const opponent = game.white === username ? game.black : game.white;

  let resultText: string;
  if (game.status === "stalemate") {
    resultText = "Draw by stalemate";
  } else {
    const won = game.winner === myColor;
    const how = game.status === "checkmate" ? "checkmate" : "timeout";
    resultText = won ? `You won by ${how}!` : `You lost by ${how}.`;
  }

  const unlockedSkin = game.skinUnlocked
    ? SKIN_CATALOG.find((s) => s.id === game.skinUnlocked)
    : null;
  const showUnlockBanner = unlockedSkin && game.winner === myColor;

  return (
    <div class="px-2 py-4 sm:px-4 sm:py-8 mx-auto min-h-screen flex items-center justify-center">
      <Head>
        <title>Chess — Result</title>
      </Head>
      <div class="max-w-screen-sm w-full mx-auto flex flex-col items-center gap-4 text-center">
        <h1 class="text-2xl sm:text-3xl font-bold">{resultText}</h1>
        <p class="text-gray-600">vs {opponent}</p>

        {showUnlockBanner && (
          <div class="border-2 border-yellow-400 rounded-sm p-3">
            <p>
              🎉 New skin unlocked: <strong>{unlockedSkin!.name}</strong>
            </p>
          </div>
        )}

        <div class="w-full max-w-xs">
          <p class="font-semibold mb-1">Moves</p>
          <ol class="text-sm max-h-64 overflow-y-auto list-decimal list-inside space-y-0.5 text-left">
            {game.state.moveHistory.map((move, i) => (
              <li key={i}>
                {i % 2 === 0 ? "White" : "Black"}: {moveLabel(move)}
              </li>
            ))}
          </ol>
        </div>

        <div class="flex gap-4">
          <a href="/lobby" class="underline text-sm">Play Again</a>
          <a href="/skins" class="underline text-sm">Skin Collection</a>
        </div>
      </div>
    </div>
  );
});
