"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import type { Player, Game } from "@/types/database";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface ClassicTicTacToeProps {
  roomId: string;
}

export default function ClassicTicTacToe({ roomId }: ClassicTicTacToeProps) {
  const [board, setBoard] = useState<Game["board"]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>("X");
  const [winner, setWinner] = useState<Player | null>(null);
  const [gameStatus, setGameStatus] = useState<Game["status"]>("waiting");
  const [error, setError] = useState<string | null>(null);
  const userId = useCurrentUser();
  const [isMyTurn, setIsMyTurn] = useState(false);

  useEffect(() => {
    const fetchGameState = async () => {
      try {
        const { data, error } = await db
          .from("games")
          .select("board, current_player, status, winner")
          .eq("id", roomId)
          .single();

        if (error) throw error;

        if (data) {
          setBoard(data.board as Game["board"]);
          setCurrentPlayer(data.current_player);
          setGameStatus(data.status);
          setWinner(data.winner);
        }
      } catch (err) {
        console.error("Error fetching game state:", err);
        setError("Failed to load game state");
      }
    };

    fetchGameState();

    const channel = db
      .channel(`game_changes`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${roomId}`,
        },
        (payload: { new: Game }) => {
          setBoard(payload.new.board);
          setCurrentPlayer(payload.new.current_player);
          setGameStatus(payload.new.status);
          setWinner(payload.new.winner);
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    const fetchPlayerInfo = async () => {
      try {
        const { data, error } = await db
          .from("games")
          .select("player_x, player_o")
          .eq("id", roomId)
          .single();

        if (error) throw error;

        if (data && userId) {
          const isPlayerX = data.player_x === userId;

          setIsMyTurn(
            (isPlayerX && currentPlayer === "X") || currentPlayer === "O"
          );
        }
      } catch (err) {
        console.error("Error fetching player info:", err);
      }
    };

    fetchPlayerInfo();
  }, [currentPlayer, userId, roomId]);

  const handleClick = async (index: number) => {
    if (!isMyTurn) return;
    if (gameStatus === "completed" || board[index] || winner) {
      return;
    }

    try {
      const newBoard = [...board];
      newBoard[index] = currentPlayer;
      const newWinner = calculateWinner(newBoard);
      const isDraw = !newWinner && newBoard.every((cell) => cell !== null);
      const nextPlayer = currentPlayer === "X" ? "O" : "X";
      const newStatus = newWinner || isDraw ? "completed" : "in_progress";

      const { error } = await db
        .from("games")
        .update({
          board: JSON.stringify(newBoard),
          current_player: nextPlayer,
          winner: newWinner,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", roomId);

      if (error) throw error;
    } catch (err) {
      console.error("Error updating game state:", err);
      setError("Failed to update game");
    }
  };

  const renderSquare = (index: number) => (
    <Button
      className={`w-20 h-20 text-4xl font-bold ${
        !board[index] ? "bg-gray-200 hover:bg-gray-300" : ""
      }`}
      onClick={() => handleClick(index)}
      disabled={!isMyTurn || gameStatus === "completed" || !!board[index]}
      variant={board[index] ? "default" : "secondary"}
    >
      {board[index] || ""}
    </Button>
  );

  if (error) {
    return <div className="text-red-600 text-center">{error}</div>;
  }

  return (
    <div className="flex flex-col items-center space-y-8">
      <div className="text-2xl font-bold text-center space-y-2">
        {winner ? (
          <div className="text-green-600">Winner: {winner}</div>
        ) : gameStatus === "completed" ? (
          <div>Game Draw!</div>
        ) : (
          <>
            <div>Next player: {currentPlayer}</div>
            {!isMyTurn && gameStatus === "in_progress" && (
              <div className="text-yellow-600 text-lg">
                Waiting for other player&apos;s move...
              </div>
            )}
            {!isMyTurn && gameStatus === "waiting" && (
              <div className="text-yellow-600 text-lg">
                Waiting for other player to join...
              </div>
            )}
            {isMyTurn && gameStatus === "in_progress" && (
              <div className="text-green-600 text-lg">Your turn!</div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 bg-muted p-4 rounded-lg">
        {board.map((_, index) => (
          <div key={index}>{renderSquare(index)}</div>
        ))}
      </div>

      {gameStatus === "completed" && (
        <div className="text-muted-foreground text-center">
          Game Over! Create a new game to play again.
        </div>
      )}
    </div>
  );
}

function calculateWinner(squares: Game["board"]): Player | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }

  return null;
}
