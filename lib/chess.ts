// Minimal chess rules engine: move generation, check/checkmate/stalemate,
// castling, en passant and promotion. No external dependencies.

export type Color = "w" | "b";
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

export interface Piece {
  type: PieceType;
  color: Color;
}

export type Board = (Piece | null)[][];

export interface Pos {
  row: number;
  col: number;
}

export interface Move {
  from: Pos;
  to: Pos;
  promotion?: PieceType;
  isEnPassant?: boolean;
  isCastle?: "K" | "Q";
  capture?: boolean;
}

export interface CastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

export interface GameState {
  board: Board;
  turn: Color;
  castling: CastlingRights;
  enPassant: Pos | null;
  moveHistory: Move[];
}

export type GameStatus = "active" | "check" | "checkmate" | "stalemate";

const FILES = "abcdefgh";

export function squareName(pos: Pos): string {
  return `${FILES[pos.col]}${8 - pos.row}`;
}

export function moveLabel(move: Move): string {
  if (move.isCastle === "K") return "O-O";
  if (move.isCastle === "Q") return "O-O-O";
  const sep = move.capture ? "x" : "-";
  const promo = move.promotion ? `=${move.promotion.toUpperCase()}` : "";
  return `${squareName(move.from)}${sep}${squareName(move.to)}${promo}`;
}

export function posEq(a: Pos, b: Pos): boolean {
  return a.row === b.row && a.col === b.col;
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function initialGameState(): GameState {
  const back: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));

  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: back[c], color: "b" };
    board[1][c] = { type: "p", color: "b" };
    board[6][c] = { type: "p", color: "w" };
    board[7][c] = { type: back[c], color: "w" };
  }

  return {
    board,
    turn: "w",
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    moveHistory: [],
  };
}

const PIECE_TYPES = "pnbrqk";

/**
 * Parses the first four fields of Forsyth-Edwards Notation (board, turn,
 * castling rights, en passant target) into a GameState. Halfmove/fullmove
 * counters, if present, are ignored — moveHistory always starts empty since
 * this is a fresh study position, not a move-by-move replay.
 */
export function parseFen(fen: string): GameState {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) {
    throw new Error("Invalid FEN: expected board, turn, castling, en passant");
  }
  const [boardPart, turnPart, castlingPart, enPassantPart] = parts;

  const rows = boardPart.split("/");
  if (rows.length !== 8) {
    throw new Error("Invalid FEN: expected 8 ranks separated by '/'");
  }

  const board: Board = rows.map((rowStr) => {
    const row: (Piece | null)[] = [];
    for (const ch of rowStr) {
      if (/[1-8]/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) row.push(null);
      } else {
        const type = ch.toLowerCase() as PieceType;
        if (!PIECE_TYPES.includes(type)) {
          throw new Error(`Invalid FEN: unknown piece '${ch}'`);
        }
        row.push({ type, color: ch === ch.toUpperCase() ? "w" : "b" });
      }
    }
    if (row.length !== 8) {
      throw new Error("Invalid FEN: a rank does not total 8 squares");
    }
    return row;
  });

  const turn: Color = turnPart === "b" ? "b" : "w";

  const castling: CastlingRights = {
    wK: castlingPart.includes("K"),
    wQ: castlingPart.includes("Q"),
    bK: castlingPart.includes("k"),
    bQ: castlingPart.includes("q"),
  };

  let enPassant: Pos | null = null;
  if (enPassantPart && enPassantPart !== "-") {
    const file = FILES.indexOf(enPassantPart[0]);
    const rank = Number(enPassantPart[1]);
    if (file === -1 || Number.isNaN(rank)) {
      throw new Error(`Invalid FEN: bad en passant square '${enPassantPart}'`);
    }
    enPassant = { row: 8 - rank, col: file };
  }

  return { board, turn, castling, enPassant, moveHistory: [] };
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((p) => (p ? { ...p } : null)));
}

export function cloneState(state: GameState): GameState {
  return {
    board: cloneBoard(state.board),
    turn: state.turn,
    castling: { ...state.castling },
    enPassant: state.enPassant ? { ...state.enPassant } : null,
    moveHistory: [...state.moveHistory],
  };
}

function opponent(color: Color): Color {
  return color === "w" ? "b" : "w";
}

function isPathClear(
  board: Board,
  from: Pos,
  to: Pos,
  stepRow: number,
  stepCol: number,
): boolean {
  let r = from.row + stepRow;
  let c = from.col + stepCol;
  while (r !== to.row || c !== to.col) {
    if (board[r][c] !== null) return false;
    r += stepRow;
    c += stepCol;
  }
  return true;
}

// Does the piece at `from` attack `target`, ignoring whose turn it is and
// ignoring check (used only to test whether a square is under attack).
function pieceAttacks(
  board: Board,
  from: Pos,
  piece: Piece,
  target: Pos,
): boolean {
  const dr = target.row - from.row;
  const dc = target.col - from.col;

  switch (piece.type) {
    case "p": {
      const dir = piece.color === "w" ? -1 : 1;
      return dr === dir && Math.abs(dc) === 1;
    }
    case "n": {
      const adr = Math.abs(dr);
      const adc = Math.abs(dc);
      return (adr === 1 && adc === 2) || (adr === 2 && adc === 1);
    }
    case "k":
      return Math.abs(dr) <= 1 && Math.abs(dc) <= 1 && !(dr === 0 && dc === 0);
    case "b":
      return Math.abs(dr) === Math.abs(dc) && dr !== 0 &&
        isPathClear(board, from, target, Math.sign(dr), Math.sign(dc));
    case "r":
      return (dr === 0) !== (dc === 0) &&
        isPathClear(board, from, target, Math.sign(dr), Math.sign(dc));
    case "q":
      return (
        (Math.abs(dr) === Math.abs(dc) && dr !== 0) ||
        (dr === 0) !== (dc === 0)
      ) && isPathClear(board, from, target, Math.sign(dr), Math.sign(dc));
  }
}

export function isSquareAttacked(
  board: Board,
  target: Pos,
  byColor: Color,
): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (
        piece && piece.color === byColor &&
        pieceAttacks(board, { row: r, col: c }, piece, target)
      ) {
        return true;
      }
    }
  }
  return false;
}

function findKing(board: Board, color: Color): Pos {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type === "k" && piece.color === color) {
        return { row: r, col: c };
      }
    }
  }
  throw new Error(`No king found for ${color}`);
}

export function isInCheck(state: GameState, color: Color): boolean {
  const kingPos = findKing(state.board, color);
  return isSquareAttacked(state.board, kingPos, opponent(color));
}

const KNIGHT_OFFSETS = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];
const KING_OFFSETS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];
const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function pseudoMovesForPiece(state: GameState, from: Pos): Move[] {
  const piece = state.board[from.row][from.col];
  if (!piece) return [];
  const moves: Move[] = [];
  const board = state.board;

  const addSliding = (dirs: number[][]) => {
    for (const [dr, dc] of dirs) {
      let r = from.row + dr;
      let c = from.col + dc;
      while (inBounds(r, c)) {
        const target = board[r][c];
        if (!target) {
          moves.push({ from, to: { row: r, col: c } });
        } else {
          if (target.color !== piece.color) {
            moves.push({ from, to: { row: r, col: c }, capture: true });
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }
  };

  switch (piece.type) {
    case "p": {
      const dir = piece.color === "w" ? -1 : 1;
      const startRow = piece.color === "w" ? 6 : 1;
      const promoRow = piece.color === "w" ? 0 : 7;

      const addPawnMove = (to: Pos, capture: boolean, isEnPassant = false) => {
        if (to.row === promoRow) {
          for (const promotion of ["q", "r", "b", "n"] as PieceType[]) {
            moves.push({ from, to, capture, promotion });
          }
        } else {
          moves.push({ from, to, capture, isEnPassant });
        }
      };

      const oneStep = { row: from.row + dir, col: from.col };
      if (
        inBounds(oneStep.row, oneStep.col) && !board[oneStep.row][oneStep.col]
      ) {
        addPawnMove(oneStep, false);
        const twoStep = { row: from.row + dir * 2, col: from.col };
        if (from.row === startRow && !board[twoStep.row][twoStep.col]) {
          moves.push({ from, to: twoStep, capture: false });
        }
      }

      for (const dc of [-1, 1]) {
        const to = { row: from.row + dir, col: from.col + dc };
        if (!inBounds(to.row, to.col)) continue;
        const target = board[to.row][to.col];
        if (target && target.color !== piece.color) {
          addPawnMove(to, true);
        } else if (!target && state.enPassant && posEq(state.enPassant, to)) {
          addPawnMove(to, true, true);
        }
      }
      break;
    }
    case "n": {
      for (const [dr, dc] of KNIGHT_OFFSETS) {
        const r = from.row + dr;
        const c = from.col + dc;
        if (!inBounds(r, c)) continue;
        const target = board[r][c];
        if (!target || target.color !== piece.color) {
          moves.push({ from, to: { row: r, col: c }, capture: !!target });
        }
      }
      break;
    }
    case "b":
      addSliding(BISHOP_DIRS);
      break;
    case "r":
      addSliding(ROOK_DIRS);
      break;
    case "q":
      addSliding([...BISHOP_DIRS, ...ROOK_DIRS]);
      break;
    case "k": {
      for (const [dr, dc] of KING_OFFSETS) {
        const r = from.row + dr;
        const c = from.col + dc;
        if (!inBounds(r, c)) continue;
        const target = board[r][c];
        if (!target || target.color !== piece.color) {
          moves.push({ from, to: { row: r, col: c }, capture: !!target });
        }
      }

      const rights = state.castling;
      const homeRow = piece.color === "w" ? 7 : 0;
      if (from.row === homeRow && from.col === 4) {
        const opp = opponent(piece.color);
        const canCastleKingSide = piece.color === "w" ? rights.wK : rights.bK;
        const canCastleQueenSide = piece.color === "w" ? rights.wQ : rights.bQ;
        const inCheckNow = isSquareAttacked(board, from, opp);

        if (
          canCastleKingSide && !inCheckNow &&
          !board[homeRow][5] && !board[homeRow][6] &&
          board[homeRow][7]?.type === "r" &&
          board[homeRow][7]?.color === piece.color &&
          !isSquareAttacked(board, { row: homeRow, col: 5 }, opp) &&
          !isSquareAttacked(board, { row: homeRow, col: 6 }, opp)
        ) {
          moves.push({ from, to: { row: homeRow, col: 6 }, isCastle: "K" });
        }

        if (
          canCastleQueenSide && !inCheckNow &&
          !board[homeRow][1] && !board[homeRow][2] && !board[homeRow][3] &&
          board[homeRow][0]?.type === "r" &&
          board[homeRow][0]?.color === piece.color &&
          !isSquareAttacked(board, { row: homeRow, col: 3 }, opp) &&
          !isSquareAttacked(board, { row: homeRow, col: 2 }, opp)
        ) {
          moves.push({ from, to: { row: homeRow, col: 2 }, isCastle: "Q" });
        }
      }
      break;
    }
  }

  return moves;
}

export function applyMove(state: GameState, move: Move): GameState {
  const next = cloneState(state);
  const piece = next.board[move.from.row][move.from.col];
  if (!piece) throw new Error("No piece at source square");

  next.board[move.from.row][move.from.col] = null;
  next.board[move.to.row][move.to.col] = move.promotion
    ? { type: move.promotion, color: piece.color }
    : piece;

  if (move.isEnPassant) {
    next.board[move.from.row][move.to.col] = null;
  }

  if (move.isCastle) {
    const homeRow = move.from.row;
    if (move.isCastle === "K") {
      next.board[homeRow][5] = next.board[homeRow][7];
      next.board[homeRow][7] = null;
    } else {
      next.board[homeRow][3] = next.board[homeRow][0];
      next.board[homeRow][0] = null;
    }
  }

  if (piece.type === "k") {
    if (piece.color === "w") {
      next.castling.wK = false;
      next.castling.wQ = false;
    } else {
      next.castling.bK = false;
      next.castling.bQ = false;
    }
  }
  const clearRookRight = (row: number, col: number) => {
    if (row === 7 && col === 0) next.castling.wQ = false;
    if (row === 7 && col === 7) next.castling.wK = false;
    if (row === 0 && col === 0) next.castling.bQ = false;
    if (row === 0 && col === 7) next.castling.bK = false;
  };
  clearRookRight(move.from.row, move.from.col);
  clearRookRight(move.to.row, move.to.col);

  next.enPassant = null;
  if (piece.type === "p" && Math.abs(move.to.row - move.from.row) === 2) {
    next.enPassant = {
      row: (move.to.row + move.from.row) / 2,
      col: move.from.col,
    };
  }

  next.turn = opponent(state.turn);
  next.moveHistory = [...state.moveHistory, move];

  return next;
}

export function legalMovesFrom(state: GameState, from: Pos): Move[] {
  const piece = state.board[from.row][from.col];
  if (!piece || piece.color !== state.turn) return [];

  return pseudoMovesForPiece(state, from).filter((move) => {
    const result = applyMove(state, move);
    return !isInCheck(result, piece.color);
  });
}

export function allLegalMoves(state: GameState, color: Color): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (piece && piece.color === color) {
        moves.push(...legalMovesFrom(state, { row: r, col: c }));
      }
    }
  }
  return moves;
}

export function getGameStatus(state: GameState): GameStatus {
  const inCheck = isInCheck(state, state.turn);
  const hasMoves = allLegalMoves(state, state.turn).length > 0;

  if (!hasMoves) return inCheck ? "checkmate" : "stalemate";
  return inCheck ? "check" : "active";
}
