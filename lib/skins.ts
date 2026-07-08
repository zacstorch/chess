import { getKv } from "./kv.ts";

export interface Skin {
  id: string;
  name: string;
  /** CSS color for piece tinting. null = default rendering, untouched. */
  color: string | null;
}

export const SKIN_CATALOG: Skin[] = [
  { id: "basic", name: "Basic", color: null },
  { id: "bronze", name: "Bronze", color: "#a9673a" },
  { id: "silver", name: "Silver", color: "#9ca3af" },
  { id: "gold", name: "Gold", color: "#d4af37" },
  { id: "obsidian", name: "Obsidian", color: "#6b21a8" },
  { id: "crystal", name: "Crystal", color: "#22d3ee" },
];

export function skinColor(skinId: string): string | null {
  return SKIN_CATALOG.find((s) => s.id === skinId)?.color ?? null;
}

export interface PlayerSkins {
  wins: number;
  unlockedIds: string[];
  equippedId: string;
}

function skinsKey(username: string) {
  return ["skins", username];
}

export async function getPlayerSkins(username: string): Promise<PlayerSkins> {
  const kv = await getKv();
  const entry = await kv.get<PlayerSkins>(skinsKey(username));
  return entry.value ?? {
    wins: 0,
    unlockedIds: [SKIN_CATALOG[0].id],
    equippedId: SKIN_CATALOG[0].id,
  };
}

export async function recordWin(
  username: string,
): Promise<{ skins: PlayerSkins; newlyUnlocked: Skin | null }> {
  const kv = await getKv();
  const current = await getPlayerSkins(username);
  const wins = current.wins + 1;
  const unlockCount = Math.min(wins + 1, SKIN_CATALOG.length);

  let newlyUnlocked: Skin | null = null;
  const unlockedIds = [...current.unlockedIds];
  if (unlockCount > unlockedIds.length) {
    const next = SKIN_CATALOG[unlockCount - 1];
    unlockedIds.push(next.id);
    newlyUnlocked = next;
  }

  const updated: PlayerSkins = {
    wins,
    unlockedIds,
    equippedId: current.equippedId,
  };
  await kv.set(skinsKey(username), updated);
  return { skins: updated, newlyUnlocked };
}

export async function equipSkin(
  username: string,
  skinId: string,
): Promise<PlayerSkins | { error: string }> {
  const current = await getPlayerSkins(username);
  if (!current.unlockedIds.includes(skinId)) {
    return { error: "Skin not unlocked" };
  }
  const updated: PlayerSkins = { ...current, equippedId: skinId };
  const kv = await getKv();
  await kv.set(skinsKey(username), updated);
  return updated;
}
