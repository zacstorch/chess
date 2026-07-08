import { page } from "fresh";
import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { getSessionUsername, parseSessionToken } from "../lib/session.ts";
import { getPlayerSkins } from "../lib/skins.ts";
import Chess from "../islands/Chess.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const token = parseSessionToken(ctx.req.headers.get("cookie"));
    const username = await getSessionUsername(token);
    // Training mode never requires login — this is a best-effort lookup so a
    // logged-in player sees their own skin, not a gate.
    const skinId = username
      ? (await getPlayerSkins(username)).equippedId
      : null;
    return page({ skinId });
  },
});

export default define.page<typeof handler>(function Training({ data }) {
  return (
    <div class="px-2 py-4 sm:px-4 sm:py-8 mx-auto min-h-screen">
      <Head>
        <title>Chess — Training</title>
      </Head>
      <div class="max-w-screen-md mx-auto flex flex-col items-center">
        <h1 class="text-2xl sm:text-4xl font-bold mb-3 sm:mb-6">Training</h1>
        <Chess skinId={data.skinId} />
      </div>
    </div>
  );
});
