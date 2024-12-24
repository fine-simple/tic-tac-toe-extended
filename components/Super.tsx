"use client";

import { useCallback, FC } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import type { Board, Game } from "@/types/database";
import { useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { calculateWinner } from "@/lib/utils";

export interface GameSuperState extends Omit<Game, "board"> {
  board: Board[];
}

interface ISuperTicTacToeProps {
  gameState: GameSuperState;
  isMyTurn: boolean;
}

const SuperTicTacToe: FC<ISuperTicTacToeProps> = ({ gameState, isMyTurn }) => {
  const { roomId } = useParams();
  const { toast } = useToast();

  const handleClick = useCallback(
    async (boardIndex: number, cellIndex: number) => {
      if (!gameState) return;
      if (!isMyTurn) return;
      if (gameState.status === "completed" || gameState.status === "waiting")
        return;
      if (
        gameState.active_board !== null &&
        gameState.active_board !== boardIndex
      )
        return;
      if (calculateWinner(gameState.board[boardIndex])) return;

      const newBoards = gameState.board.map((board, index) =>
        index === boardIndex
          ? board.map((cell, idx) =>
              idx === cellIndex ? gameState.current_player : cell
            )
          : board
      );

      const bigBoard = newBoards.map(calculateWinner);
      const winner = calculateWinner(bigBoard);

      const nextPlayer = gameState.current_player === "X" ? "O" : "X";
      const newActiveBoard = calculateWinner(newBoards[cellIndex])
        ? null
        : cellIndex;

      try {
        const { error } = await db
          .from("games")
          .update({
            board: JSON.stringify(newBoards),
            current_player: nextPlayer,
            active_board: newActiveBoard,
            updated_at: new Date().toISOString(),
            winner: winner === "draw" ? null : winner,
            status: winner ? "completed" : "in_progress",
          })
          .eq("id", roomId);

        if (error) throw error;
      } catch (err) {
        toast({
          title: "Error updating game state",
          description: (err as Error).message,
          variant: "error",
        });
        console.error(
          "Error updating game state:",
          err instanceof Error ? err.message : "Unknown error"
        );
      }
    },
    [gameState, isMyTurn, roomId, toast]
  );

  const renderBoard = useCallback(
    (boardIndex: number) => {
      if (!gameState) return null;

      const boardWinner = calculateWinner(gameState.board[boardIndex]);

      if (boardWinner === "draw") {
        return (
          <div
            key={boardIndex}
            className="rounded-lg overflow-hidden ring-1 ring-gray-200"
          >
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-4xl md:text-7xl font-bold text-gray-600">
                Draw
              </span>
            </div>
          </div>
        );
      } else if (boardWinner) {
        return (
          <div
            key={boardIndex}
            className="rounded-lg overflow-hidden ring-1 ring-gray-200"
          >
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-8xl md:text-9xl font-bold text-blue-600">
                {boardWinner}
              </span>
            </div>
          </div>
        );
      }

      return (
        <div
          key={boardIndex}
          className={`rounded-lg overflow-hidden ${
            gameState.status === "in_progress" &&
            (gameState.active_board === null ||
              gameState.active_board === boardIndex)
              ? "ring-4 ring-blue-500"
              : "ring-1 ring-gray-200"
          }`}
        >
          <div className="grid grid-cols-3 place-items-center gap-2 p-1 bg-gray-200">
            {gameState.board[boardIndex].map((cell, cellIndex) => (
              <Button
                key={cellIndex}
                variant={cell ? "default" : "secondary"}
                className={`w-8 h-8 md_sm:w-10 md_sm:h-10 text-lg font-bold ${
                  !isMyTurn ? "cursor-not-allowed" : ""
                }`}
                onClick={() => handleClick(boardIndex, cellIndex)}
                disabled={
                  !isMyTurn ||
                  gameState.status === "completed" ||
                  gameState.status === "waiting" ||
                  cell !== null ||
                  (gameState.active_board !== null &&
                    gameState.active_board !== boardIndex)
                }
              >
                {cell || ""}
              </Button>
            ))}
          </div>
        </div>
      );
    },
    [gameState, handleClick, isMyTurn]
  );

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-4 w-full md:w-3/4">
      {gameState.board.map((_, index) => renderBoard(index))}
    </div>
  );
};

export default SuperTicTacToe;
