"use client";

import { FC } from "react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/game/store";
import { calculateWinner } from "@/lib/utils";
import { Board } from "@/types/database";

interface ClassicTicTacToeProps {
  isMyTurn: boolean;
}

const ClassicTicTacToe: FC<ClassicTicTacToeProps> = ({ isMyTurn }) => {
  const { gameState, updateGame } = useGameStore();

  const handleClick = async (index: number) => {
    if (
      !isMyTurn ||
      !gameState ||
      gameState.status !== "in_progress" ||
      gameState.board[index]
    ) {
      return;
    }

    const board = [...gameState.board] as Board;
    board[index] = gameState.current_player;

    const winner = calculateWinner(board);
    const nextPlayer = gameState.current_player === "X" ? "O" : "X";

    await updateGame({
      board,
      current_player: nextPlayer,
      winner: winner === "draw" ? null : winner,
      status: winner ? "completed" : "in_progress",
    });
  };

  if (!gameState) return null;

  return (
    <div className="grid grid-cols-3 gap-2 bg-muted p-4 rounded-lg">
      {gameState.board.map((cell, index) => (
        <Button
          key={index}
          className={`w-20 h-20 text-4xl font-bold isolate ${
            !cell ? "bg-gray-200 hover:bg-gray-300" : ""
          }`}
          onClick={() => handleClick(index)}
          disabled={!isMyTurn || gameState.status !== "in_progress" || !!cell}
          variant={cell ? "default" : "secondary"}
          translate="no"
        >
          {cell || ""}
        </Button>
      ))}
    </div>
  );
};

export default ClassicTicTacToe;
