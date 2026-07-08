import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { Button } from "../components/Button.tsx";

const TIMER_OPTIONS: Array<{ label: string; minutes: number | null }> = [
  { label: "No timer", minutes: null },
  { label: "1 min", minutes: 1 },
  { label: "3 min", minutes: 3 },
  { label: "5 min", minutes: 5 },
  { label: "10 min", minutes: 10 },
];

interface IncomingChallenge {
  from: string;
  timerMinutes: number | null;
}

interface LobbyStateResponse {
  online: string[];
  challenge: IncomingChallenge | null;
  activeGameId: string | null;
}

interface LobbyProps {
  initialOnline: string[];
}

function timerLabel(minutes: number | null): string {
  return minutes ? `${minutes} min` : "no timer";
}

export default function Lobby({ initialOnline }: LobbyProps) {
  const online = useSignal<string[]>(initialOnline);
  const challenge = useSignal<IncomingChallenge | null>(null);
  const selectedOpponent = useSignal<string | null>(null);
  const selectedTimer = useSignal<number | null>(null);
  const sentTo = useSignal<string | null>(null);
  const error = useSignal<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const res = await fetch("/api/lobby-state");
      if (res.status === 401) {
        location.href = "/play";
        return;
      }
      const data: LobbyStateResponse = await res.json();
      if (cancelled) return;

      if (data.activeGameId) {
        location.href = `/game/${data.activeGameId}`;
        return;
      }
      online.value = data.online;
      challenge.value = data.challenge;
    }

    poll();
    const id = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  async function confirmChallenge() {
    const to = selectedOpponent.value;
    if (!to) return;
    error.value = null;
    const res = await fetch("/api/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, timerMinutes: selectedTimer.value }),
    });
    if (!res.ok) {
      error.value = "Couldn't send the challenge — try again.";
      return;
    }
    sentTo.value = to;
    selectedOpponent.value = null;
  }

  async function acceptIncoming() {
    error.value = null;
    const res = await fetch("/api/challenge-accept", { method: "POST" });
    if (!res.ok) {
      error.value = "That challenge is no longer available.";
      challenge.value = null;
      return;
    }
    const { gameId } = await res.json();
    location.href = `/game/${gameId}`;
  }

  return (
    <div class="w-full max-w-sm flex flex-col gap-4">
      {error.value && (
        <p class="text-red-600 text-sm text-center" role="alert">
          {error.value}
        </p>
      )}

      {challenge.value && (
        <div class="border-2 border-yellow-400 rounded-sm p-3 flex flex-col gap-2 items-center text-center">
          <p>
            <strong>{challenge.value.from}</strong> challenged you —{" "}
            {timerLabel(challenge.value.timerMinutes)}
          </p>
          <Button onClick={acceptIncoming}>Accept</Button>
        </div>
      )}

      {online.value.length === 0 && (
        <p class="text-gray-600 text-center">
          No one else is online right now. Invite a friend!
        </p>
      )}

      <ul class="flex flex-col gap-2">
        {online.value.map((player) => (
          <li
            key={player}
            class="border-gray-500 border-2 rounded-sm p-3 flex flex-col gap-2"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="font-semibold">{player}</span>
              {sentTo.value === player
                ? <span class="text-sm text-gray-600">Waiting…</span>
                : selectedOpponent.value !== player && (
                  <Button onClick={() => selectedOpponent.value = player}>
                    Challenge
                  </Button>
                )}
            </div>

            {selectedOpponent.value === player && (
              <div class="flex flex-col gap-2">
                <div class="flex flex-wrap gap-1">
                  {TIMER_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => selectedTimer.value = opt.minutes}
                      class={`px-2 py-1 text-sm border-2 rounded-sm ${
                        selectedTimer.value === opt.minutes
                          ? "border-black bg-gray-200"
                          : "border-gray-400 bg-white hover:bg-gray-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div class="flex gap-2">
                  <Button onClick={confirmChallenge}>Send Challenge</Button>
                  <Button onClick={() => selectedOpponent.value = null}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
