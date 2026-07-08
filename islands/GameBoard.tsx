import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import {
  type Color,
  legalMovesFrom,
  type Move,
  moveLabel,
  type Pos,
  posEq,
} from "../lib/chess.ts";
import type { GameRecord } from "../lib/games.ts";
import { skinColor } from "../lib/skins.ts";

const PIECE_UNICODE: Record<Color, Record<string, string>> = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

const PROMOTION_CHOICES: Array<"q" | "r" | "b" | "n"> = ["q", "r", "b", "n"];

function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

interface PendingPromotion {
  from: Pos;
  to: Pos;
  moves: Move[];
}

interface GameBoardProps {
  gameId: string;
  username: string;
  initialGame: GameRecord;
  initialOpponentPresent: boolean;
  initialWhiteSkinId: string;
  initialBlackSkinId: string;
}

export default function GameBoard(
  {
    gameId,
    username,
    initialGame,
    initialOpponentPresent,
    initialWhiteSkinId,
    initialBlackSkinId,
  }: GameBoardProps,
) {
  const game = useSignal<GameRecord>(initialGame);
  const opponentPresent = useSignal<boolean>(initialOpponentPresent);
  const whiteSkinId = useSignal<string>(initialWhiteSkinId);
  const blackSkinId = useSignal<string>(initialBlackSkinId);
  const selected = useSignal<Pos | null>(null);
  const pendingPromotion = useSignal<PendingPromotion | null>(null);
  const error = useSignal<string | null>(null);
  const now = useSignal<number>(Date.now());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const res = await fetch(`/api/game-state?gameId=${gameId}`);
      if (res.status === 401) {
        location.href = "/play";
        return;
      }
      if (res.status === 404) {
        location.href = "/lobby";
        return;
      }
      const data = await res.json();
      if (cancelled) return;
      if (data.game.status !== "active") {
        location.href = `/post-game/${gameId}`;
        return;
      }
      game.value = data.game;
      opponentPresent.value = data.opponentPresent;
      whiteSkinId.value = data.whiteSkinId;
      blackSkinId.value = data.blackSkinId;
      now.value = Date.now();
    }

    poll();
    const id = setInterval(poll, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const myColor: Color = game.value.white === username ? "w" : "b";
  const opponentName = game.value.white === username
    ? game.value.black
    : game.value.white;
  const pieceColor = (color: Color): string | undefined =>
    skinColor(color === "w" ? whiteSkinId.value : blackSkinId.value) ??
      undefined;
  const isMyTurn = game.value.status === "active" &&
    game.value.state.turn === myColor;

  const legalTargets = selected.value && isMyTurn
    ? legalMovesFrom(game.value.state, selected.value)
    : [];

  function displayedRemaining(color: Color): number | null {
    const stored = color === "w"
      ? game.value.whiteRemainingMs
      : game.value.blackRemainingMs;
    if (stored === null) return null;
    if (game.value.status === "active" && game.value.state.turn === color) {
      const elapsed = now.value - new Date(game.value.turnStartedAt).getTime();
      return Math.max(0, stored - elapsed);
    }
    return stored;
  }

  async function sendMove(from: Pos, to: Pos, promotion?: string) {
    error.value = null;
    const res = await fetch("/api/game-move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, from, to, promotion }),
    });
    const data = await res.json();
    if (!res.ok) {
      error.value = data.error ?? "Couldn't make that move.";
      selected.value = null;
      return;
    }
    if (data.game.status !== "active") {
      location.href = `/post-game/${gameId}`;
      return;
    }
    game.value = data.game;
    now.value = Date.now();
  }

  function handleSquareClick(row: number, col: number) {
    if (!isMyTurn || pendingPromotion.value) return;

    const piece = game.value.state.board[row][col];

    if (selected.value) {
      const matches = legalMovesFrom(game.value.state, selected.value).filter(
        (m) => posEq(m.to, { row, col }),
      );

      if (matches.length > 1) {
        pendingPromotion.value = {
          from: selected.value,
          to: { row, col },
          moves: matches,
        };
        selected.value = null;
        return;
      }

      if (matches.length === 1) {
        const move = matches[0];
        selected.value = null;
        sendMove(move.from, move.to, move.promotion);
        return;
      }

      selected.value = piece && piece.color === myColor ? { row, col } : null;
      return;
    }

    if (piece && piece.color === myColor) {
      selected.value = { row, col };
    }
  }

  function choosePromotion(type: "q" | "r" | "b" | "n") {
    const pending = pendingPromotion.value;
    if (!pending) return;
    const move = pending.moves.find((m) => m.promotion === type);
    pendingPromotion.value = null;
    if (move) sendMove(move.from, move.to, move.promotion);
  }

  // Game-over states redirect to /post-game/{id} (see poll/sendMove above),
  // so this only ever needs to describe the active game.
  const statusText = isMyTurn ? "Your move" : `Waiting for ${opponentName}`;

  return (
    <div class="flex flex-col md:flex-row gap-4 md:gap-8 items-center md:items-start w-full">
      <div class="relative">
        <div class="grid grid-cols-8 border-4 border-gray-800 select-none">
          {game.value.state.board.map((rowPieces, row) =>
            rowPieces.map((piece, col) => {
              const isDark = (row + col) % 2 === 1;
              const isSelected = selected.value &&
                posEq(selected.value, { row, col });
              const target = legalTargets.find((m) =>
                posEq(m.to, { row, col })
              );

              return (
                <div
                  key={`${row}-${col}`}
                  onClick={() => handleSquareClick(row, col)}
                  class={`w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center relative cursor-pointer text-2xl sm:text-3xl md:text-4xl lg:text-5xl ${
                    isDark ? "bg-emerald-700" : "bg-emerald-50"
                  } ${
                    isSelected
                      ? "outline outline-4 outline-yellow-400 -outline-offset-4"
                      : ""
                  }`}
                >
                  {piece && (
                    <span
                      class="leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]"
                      style={{ color: pieceColor(piece.color) }}
                    >
                      {PIECE_UNICODE[piece.color][piece.type]}
                    </span>
                  )}
                  {target && (
                    <span
                      class={`absolute rounded-full ${
                        target.capture
                          ? "w-full h-full border-4 border-black/40 box-border"
                          : "w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-black/40"
                      }`}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {pendingPromotion.value && (
          <div class="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-2">
            <p class="font-bold text-sm sm:text-base">Promote to:</p>
            <div class="flex gap-1 sm:gap-2">
              {PROMOTION_CHOICES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => choosePromotion(type)}
                  class="text-2xl sm:text-3xl md:text-4xl border-2 border-gray-500 rounded-sm bg-white hover:bg-gray-200 w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center"
                  style={{ color: pieceColor(myColor) }}
                >
                  {PIECE_UNICODE[myColor][type]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div class="flex flex-col gap-4 w-full md:w-auto md:min-w-48">
        {error.value && (
          <p class="text-red-600 text-sm text-center" role="alert">
            {error.value}
          </p>
        )}

        {game.value.timerMinutes !== null && (
          <div class="flex justify-between text-sm font-bold tabular-nums">
            <span>White: {formatClock(displayedRemaining("w") ?? 0)}</span>
            <span>Black: {formatClock(displayedRemaining("b") ?? 0)}</span>
          </div>
        )}

        <p class="text-lg sm:text-xl font-bold text-center md:text-left">
          {statusText}
        </p>

        {!opponentPresent.value && (
          <p class="text-sm text-gray-600 text-center md:text-left">
            {opponentName}{" "}
            appears disconnected — the game is saved and will resume when
            they're back.
          </p>
        )}

        <div>
          <p class="font-semibold mb-1">Moves</p>
          <ol class="text-sm max-h-48 sm:max-h-64 overflow-y-auto list-decimal list-inside space-y-0.5">
            {game.value.state.moveHistory.map((move, i) => (
              <li key={i}>
                {i % 2 === 0 ? "White" : "Black"}: {moveLabel(move)}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
