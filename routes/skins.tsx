import { page } from "fresh";
import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { getSessionUsername, parseSessionToken } from "../lib/session.ts";
import { equipSkin, getPlayerSkins, SKIN_CATALOG } from "../lib/skins.ts";
import { Button } from "../components/Button.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const token = parseSessionToken(ctx.req.headers.get("cookie"));
    const username = await getSessionUsername(token);
    if (!username) return ctx.redirect("/play");

    const skins = await getPlayerSkins(username);
    return page({ skins });
  },
  async POST(ctx) {
    const token = parseSessionToken(ctx.req.headers.get("cookie"));
    const username = await getSessionUsername(token);
    if (!username) return ctx.redirect("/play");

    const form = await ctx.req.formData();
    const skinId = form.get("skinId")?.toString() ?? "";
    await equipSkin(username, skinId);
    return ctx.redirect("/skins");
  },
});

export default define.page<typeof handler>(function SkinsPage({ data }) {
  const { skins } = data;

  return (
    <div class="px-2 py-4 sm:px-4 sm:py-8 mx-auto min-h-screen flex items-center justify-center">
      <Head>
        <title>Chess — Skins</title>
      </Head>
      <div class="max-w-screen-sm w-full mx-auto flex flex-col items-center gap-4">
        <h1 class="text-2xl sm:text-3xl font-bold">Skin Collection</h1>
        <p class="text-gray-600">
          {skins.wins} win{skins.wins === 1 ? "" : "s"}
        </p>

        <ul class="flex flex-col gap-2 w-full max-w-xs">
          {SKIN_CATALOG.map((skin) => {
            const unlocked = skins.unlockedIds.includes(skin.id);
            const equipped = skins.equippedId === skin.id;
            return (
              <li
                key={skin.id}
                class={`border-2 rounded-sm p-3 flex items-center justify-between gap-2 ${
                  unlocked ? "border-gray-500" : "border-gray-300 opacity-50"
                }`}
              >
                <span class="flex items-center gap-2 font-semibold">
                  <span
                    class="text-2xl leading-none"
                    style={{ color: skin.color ?? undefined }}
                  >
                    ♔
                  </span>
                  {skin.name}
                  {equipped ? " (equipped)" : ""}
                </span>
                {unlocked && !equipped && (
                  <form method="POST">
                    <input type="hidden" name="skinId" value={skin.id} />
                    <Button>Equip</Button>
                  </form>
                )}
                {!unlocked && (
                  <span class="text-sm text-gray-500">
                    Win a match to unlock
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <a href="/lobby" class="underline text-sm">Back to Lobby</a>
      </div>
    </div>
  );
});
