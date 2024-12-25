"use client";

import { FC } from "react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/store";
import { calculateWinner } from "@/lib/utils";
import { Board } from "@/types/database";

interface Super {
  isMyTurn: boolean;
}

const Super: FC<Super> = ({ isMyTurn }) => {
  const { gameState, updateGame } = useGameStore();

  const handleClick = async (boardIndex: number, cellIndex: number) => {
    if (
      !gameState ||
      !isMyTurn ||
      gameState.status === "completed" ||
      gameState.status === "waiting"
    )
      return;

    if (
      gameState.active_board !== null &&
      gameState.active_board !== boardIndex
    )
      return;

    const boards = gameState.board as Board[];
    if (calculateWinner(boards[boardIndex])) return;

    const newBoards = boards.map((board, index) =>
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

    await updateGame({
      board: newBoards,
      current_player: nextPlayer,
      active_board: newActiveBoard,
      winner: winner === "draw" ? null : winner,
      status: winner ? "completed" : "in_progress",
    });
  };

  const renderBoard = (boardIndex: number) => {
    if (!gameState) return null;

    const boards = gameState.board as Board[];
    const boardWinner = calculateWinner(boards[boardIndex]);

    if (boardWinner === "draw") {
      return (
        <div className="h-full rounded-lg overflow-hidden ring-1 ring-gray-200">
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-4xl md:text-7xl font-bold text-gray-600">
              Draw
            </span>
          </div>
        </div>
      );
    }

    if (boardWinner) {
      return (
        <div className="h-full rounded-lg overflow-hidden ring-1 ring-gray-200">
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
          {boards[boardIndex].map((cell, cellIndex) => (
            <Button
              key={cellIndex}
              variant={cell ? "default" : "secondary"}
              className={`w-8 h-8 md_sm:w-10 md_sm:h-10 text-lg font-bold`}
              onClick={() => handleClick(boardIndex, cellIndex)}
              disabled={
                !isMyTurn || gameState.status !== "in_progress" || !!cell
              }
            >
              {cell || ""}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-4 w-full md:w-3/4">
      {Array(9)
        .fill(null)
        .map((_, index) => (
          <div key={index}>{renderBoard(index)}</div>
        ))}
    </div>
  );
};

export default Super;
