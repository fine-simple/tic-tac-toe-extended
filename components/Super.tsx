"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { db, GameStatus, type Game, type Player } from "@/lib/db";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface SuperTicTacToeProps {
  roomId: string;
}

type BoardState = (Player | null)[][];
type WinnerType = Player | null;

interface GameState extends Omit<Game, "board"> {
  boards: BoardState;
  activeBoard: number | null;
}

interface GamePayload {
  id: string;
  board: BoardState;
  active_board: number | null;
  current_player: Player;
  status: string;
  winner: Player | null;
  player_x: string;
  player_o: string | null;
  created_at: string;
  updated_at: string;
}

export default function SuperTicTacToe({ roomId }: SuperTicTacToeProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = useCurrentUser();
  const [isMyTurn, setIsMyTurn] = useState(false);

  useEffect(() => {
    const fetchGameState = async () => {
      try {
        const { data, error } = await db
          .from("games")
          .select("*")
          .eq("id", roomId)
          .single();

        if (error) throw error;

        if (data) {
          setGameState({
            ...data,
            boards: JSON.parse(data.board as string),
            activeBoard: data.active_board ?? null,
          });
        }
      } catch (err) {
        setError("Failed to load game");
        console.error("Error fetching game state:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGameState();

    // Set up real-time subscription
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
        (payload: RealtimePostgresChangesPayload<GamePayload>) => {
          if (payload.new) {
            const state: GamePayload = payload.new as GamePayload;
            const newState: GameState = {
              id: state.id,
              player_x: state.player_x,
              player_o: state.player_o,
              current_player: state.current_player,
              status: state.status as GameStatus,
              winner: state.winner,
              created_at: state.created_at,
              updated_at: state.updated_at,
              boards: state.board,
              activeBoard: state.active_board,
            };
            setGameState(newState);
          }
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    // Update isMyTurn whenever game state or userId changes
    if (gameState && userId) {
      const isPlayerX = gameState.player_x === userId;
      const isPlayerO = gameState.player_o === userId;
      setIsMyTurn(
        (isPlayerX && gameState.current_player === "X") ||
          (isPlayerO && gameState.current_player === "O")
      );
    }
  }, [gameState, userId]);

  const handleClick = async (boardIndex: number, cellIndex: number) => {
    if (!gameState || !userId) return;
    if (!isMyTurn) return;
    if (gameState.status === "completed") return;
    if (gameState.activeBoard !== null && gameState.activeBoard !== boardIndex)
      return;
    if (calculateWinner(gameState.boards[boardIndex])) return;

    const newBoards = gameState.boards.map((board, index) =>
      index === boardIndex
        ? board.map((cell, idx) =>
            idx === cellIndex ? gameState.current_player : cell
          )
        : board
    );

    const nextPlayer = gameState.current_player === "X" ? "O" : "X";
    const newActiveBoard = calculateWinner(newBoards[boardIndex])
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
        })
        .eq("id", roomId);

      if (error) throw error;
    } catch (err) {
      setError("Failed to update game");
      console.error(
        "Error updating game state:",
        err instanceof Error ? err.message : "Unknown error"
      );
    }
  };

  const renderBoard = (boardIndex: number) => {
    if (!gameState) return null;

    const boardWinner = calculateWinner(gameState.boards[boardIndex]);

    if (boardWinner) {
      return (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          <span className="text-9xl font-bold text-blue-600">
            {boardWinner}
          </span>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-3 gap-1 p-2 bg-gray-200">
        {gameState.boards[boardIndex].map((cell, cellIndex) => (
          <Button
            key={cellIndex}
            variant={cell ? "default" : "secondary"}
            className={`w-12 h-12 text-lg font-bold ${
              !isMyTurn ? "cursor-not-allowed" : ""
            }`}
            onClick={() => handleClick(boardIndex, cellIndex)}
            disabled={
              !isMyTurn ||
              gameState.status === "completed" ||
              cell !== null ||
              (gameState.activeBoard !== null &&
                gameState.activeBoard !== boardIndex)
            }
          >
            {cell || ""}
          </Button>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center p-4">Loading game...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 p-4">{error}</div>;
  }

  if (!gameState) {
    return <div className="text-center p-4">Game not found</div>;
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 space-y-2">
        {!isMyTurn && gameState?.status === "in_progress" && (
          <div className="text-yellow-600">
            Waiting for other player&apos;s move...
          </div>
        )}
        {isMyTurn && <div className="text-green-600">Your turn!</div>}{" "}
        {gameState.status === "completed" && (
          <div className="text-xl font-bold text-center text-green-600">
            Game Over! Winner: {gameState.winner || "Draw"}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-2xl w-full">
        {Array(9)
          .fill(null)
          .map((_, index) => (
            <div
              key={index}
              className={`rounded-lg overflow-hidden ${
                gameState.activeBoard === index
                  ? "ring-4 ring-blue-500"
                  : "ring-1 ring-gray-200"
              }`}
            >
              {renderBoard(index)}
            </div>
          ))}
      </div>
    </div>
  );
}

function calculateWinner(squares: (Player | null)[]): WinnerType {
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
