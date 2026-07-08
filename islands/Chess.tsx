import { useSignal } from "@preact/signals";
import {
  applyMove,
  type Color,
  type GameState,
  getGameStatus,
  initialGameState,
  legalMovesFrom,
  type Move,
  moveLabel,
  parseFen,
  type Pos,
  posEq,
} from "../lib/chess.ts";
import { evaluate } from "../lib/evaluate.ts";
import { Button } from "../components/Button.tsx";

const PIECE_UNICODE: Record<Color, Record<string, string>> = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

const PROMOTION_CHOICES: Array<"q" | "r" | "b" | "n"> = ["q", "r", "b", "n"];

// Percentage of the eval bar filled from White's side (0-100). Centipawn
// scores are squashed through a sigmoid so huge material swings don't
// immediately max out the bar.
function evalToWhitePercent(scoreCp: number): number {
  if (scoreCp === Infinity) return 100;
  if (scoreCp === -Infinity) return 0;
  return 50 + 50 * Math.tanh(scoreCp / 400);
}

function formatScore(scoreCp: number): string {
  if (scoreCp === Infinity) return "1-0";
  if (scoreCp === -Infinity) return "0-1";
  const pawns = scoreCp / 100;
  return pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
}

interface PendingPromotion {
  from: Pos;
  to: Pos;
  moves: Move[];
}

export default function Chess() {
  const startingPosition = useSignal<GameState>(initialGameState());
  const history = useSignal<GameState[]>([startingPosition.value]);
  const selected = useSignal<Pos | null>(null);
  const pendingPromotion = useSignal<PendingPromotion | null>(null);
  const fenInput = useSignal("");
  const fenError = useSignal<string | null>(null);

  const state = history.value[history.value.length - 1];

  const status = getGameStatus(state);
  const turnName = state.turn === "w" ? "White" : "Black";
  const evalScore = evaluate(state);
  const whitePercent = evalToWhitePercent(evalScore);

  let statusText: string;
  if (status === "checkmate") {
    statusText = `Checkmate — ${
      turnName === "White" ? "Black" : "White"
    } wins!`;
  } else if (status === "stalemate") {
    statusText = "Stalemate — draw";
  } else if (status === "check") {
    statusText = `${turnName} is in check`;
  } else {
    statusText = `${turnName} to move`;
  }

  const checkedKingPos = (() => {
    if (status !== "check" && status !== "checkmate") return null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = state.board[r][c];
        if (piece?.type === "k" && piece.color === state.turn) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  })();

  const legalTargets = selected.value
    ? legalMovesFrom(state, selected.value)
    : [];

  const gameOver = status === "checkmate" || status === "stalemate";
  const canUndo = history.value.length > 1;

  function handleSquareClick(row: number, col: number) {
    if (pendingPromotion.value || gameOver) return;

    const piece = state.board[row][col];

    if (selected.value) {
      const matches = legalMovesFrom(state, selected.value).filter((m) =>
        posEq(m.to, { row, col })
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
        history.value = [...history.value, applyMove(state, matches[0])];
        selected.value = null;
        return;
      }

      selected.value = piece && piece.color === state.turn
        ? { row, col }
        : null;
      return;
    }

    if (piece && piece.color === state.turn) {
      selected.value = { row, col };
    }
  }

  function choosePromotion(type: "q" | "r" | "b" | "n") {
    const pending = pendingPromotion.value;
    if (!pending) return;
    const move = pending.moves.find((m) => m.promotion === type);
    if (move) history.value = [...history.value, applyMove(state, move)];
    pendingPromotion.value = null;
  }

  function undoMove() {
    if (!canUndo) return;
    history.value = history.value.slice(0, -1);
    selected.value = null;
    pendingPromotion.value = null;
  }

  function resetToStartingPosition() {
    history.value = [startingPosition.value];
    selected.value = null;
    pendingPromotion.value = null;
  }

  function newStandardGame() {
    startingPosition.value = initialGameState();
    history.value = [startingPosition.value];
    selected.value = null;
    pendingPromotion.value = null;
    fenError.value = null;
  }

  function loadFen() {
    try {
      const parsed = parseFen(fenInput.value);
      getGameStatus(parsed); // throws if the position has no king, etc.
      startingPosition.value = parsed;
      history.value = [parsed];
      selected.value = null;
      pendingPromotion.value = null;
      fenError.value = null;
    } catch (e) {
      fenError.value = e instanceof Error ? e.message : "Invalid position";
    }
  }

  return (
    <div class="flex flex-col md:flex-row gap-4 md:gap-8 items-center md:items-start w-full">
      <div class="flex gap-2 sm:gap-3">
        <div class="flex flex-col items-center gap-1">
          <div class="w-4 sm:w-5 md:w-6 flex-1 relative bg-neutral-800 border-2 border-gray-800 overflow-hidden">
            <div
              class="absolute bottom-0 left-0 w-full bg-white transition-[height] duration-300"
              style={{ height: `${whitePercent}%` }}
            />
          </div>
          <span class="text-xs font-bold tabular-nums">
            {formatScore(evalScore)}
          </span>
        </div>

        <div class="relative">
          <div class="grid grid-cols-8 border-4 border-gray-800 select-none">
            {state.board.map((rowPieces, row) =>
              rowPieces.map((piece, col) => {
                const isDark = (row + col) % 2 === 1;
                const isSelected = selected.value &&
                  posEq(selected.value, { row, col });
                const target = legalTargets.find((m) =>
                  posEq(m.to, { row, col })
                );
                const isChecked = checkedKingPos &&
                  posEq(checkedKingPos, { row, col });

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
                    } ${isChecked ? "bg-red-400!" : ""}`}
                  >
                    {piece && (
                      <span class="leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
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
                  >
                    {PIECE_UNICODE[state.turn][type]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div class="flex flex-col gap-4 w-full md:w-auto md:min-w-48">
        <p class="text-lg sm:text-xl font-bold text-center md:text-left">
          {statusText}
        </p>

        <div class="flex gap-2 flex-wrap">
          <Button
            id="undo"
            onClick={undoMove}
            disabled={!canUndo || !!pendingPromotion.value}
          >
            Undo
          </Button>
          <Button
            id="reset-position"
            onClick={resetToStartingPosition}
            disabled={!!pendingPromotion.value}
          >
            Reset
          </Button>
          <Button
            id="new-game"
            onClick={newStandardGame}
            disabled={!!pendingPromotion.value}
          >
            New game
          </Button>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-semibold" for="fen-input">
            Load a position (FEN)
          </label>
          <div class="flex gap-2">
            <input
              id="fen-input"
              type="text"
              value={fenInput.value}
              onInput={(e) => fenInput.value = e.currentTarget.value}
              placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
              class="flex-1 min-w-0 px-2 py-1 border-gray-500 border-2 rounded-sm text-sm"
            />
            <Button onClick={loadFen} disabled={!!pendingPromotion.value}>
              Load
            </Button>
          </div>
          {fenError.value && (
            <p class="text-red-600 text-sm" role="alert">{fenError.value}</p>
          )}
        </div>

        <div>
          <p class="font-semibold mb-1">Moves</p>
          <ol class="text-sm max-h-48 sm:max-h-64 overflow-y-auto list-decimal list-inside space-y-0.5">
            {state.moveHistory.map((move, i) => {
              // A loaded position can start with Black to move, so parity
              // alone isn't enough — anchor off the starting position's turn.
              const firstMoverIsWhite = startingPosition.value.turn === "w";
              const isWhiteMove = i % 2 === 0
                ? firstMoverIsWhite
                : !firstMoverIsWhite;
              return (
                <li key={i}>
                  {isWhiteMove ? "White" : "Black"}: {moveLabel(move)}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
