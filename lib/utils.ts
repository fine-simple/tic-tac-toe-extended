import { Board, Winner } from "@/types/database";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

const winningPatterns = [
  // horizontal
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // vertical
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // diagonal
  [0, 4, 8],
  [2, 4, 6],
];

export const calculateWinner = (squares: Board): Winner | null => {
  for (const [a, b, c] of winningPatterns) {
    if (
      squares[a] &&
      squares[a] !== "draw" &&
      squares[a] === squares[b] &&
      squares[a] === squares[c]
    ) {
      return squares[a];
    }
  }

  if (squares.every(cell => cell !== null)) {
    return "draw";
  }

  return null;
};
