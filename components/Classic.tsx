"use client";

import { useCallback, FC } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import type { Board, Game } from "@/types/database";
import { useParams } from "next/navigation";
import { calculateWinner } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface GameClassicState extends Omit<Game, "board"> {
  board: Board;
}

interface IClassicTicTacToeProps {
  gameState: GameClassicState | null;
  isMyTurn: boolean;
}

const ClassicTicTacToe: FC<IClassicTicTacToeProps> = ({
  gameState,
  isMyTurn,
}) => {
  const { roomId } = useParams();
  const { toast } = useToast();

  const handleClick = useCallback(
    async (index: number) => {
      if (!isMyTurn) return;
      if (!gameState) return;

      const { board, current_player, status, winner } = gameState;

      if (status === "completed" || board[index] || winner) {
        return;
      }

      try {
        const newBoard = [...board];
        newBoard[index] = current_player;
        const newWinner = calculateWinner(newBoard);
        const nextPlayer = current_player === "X" ? "O" : "X";
        const newStatus = newWinner ? "completed" : "in_progress";

        const { error } = await db
          .from("games")
          .update({
            board: JSON.stringify(newBoard),
            current_player: nextPlayer,
            winner: newWinner === "draw" ? null : newWinner,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", roomId);

        if (error) throw error;
      } catch (err) {
        console.error("Error updating game state:", err);
        toast({
          title: "Error updating game state",
          description: (err as Error).message,
          variant: "error",
        });
      }
    },
    [gameState, isMyTurn, roomId, toast]
  );

  const renderSquare = useCallback(
    (index: number) => {
      if (!gameState) return null;
      const { board, status } = gameState;

      return (
        <Button
          className={`w-20 h-20 text-4xl font-bold isolate ${
            !board[index] ? "bg-gray-200 hover:bg-gray-300" : ""
          }`}
          onClick={() => handleClick(index)}
          disabled={!isMyTurn || status !== "in_progress" || !!board[index]}
          variant={board[index] ? "default" : "secondary"}
          translate="no"
        >
          {board[index] || ""}
        </Button>
      );
    },
    [gameState, handleClick, isMyTurn]
  );

  return (
    <div className="grid grid-cols-3 gap-2 bg-muted p-4 rounded-lg">
      {gameState?.board.map((_, index) => (
        <div key={index}>{renderSquare(index)}</div>
      ))}
    </div>
  );
};

export default ClassicTicTacToe;
