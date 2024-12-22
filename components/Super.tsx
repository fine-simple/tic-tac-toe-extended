"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Game, Player } from "@/types/database";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

type BoardState = (Player | null)[][];
type WinnerType = Player | null;

interface GameState extends Omit<Game, "board"> {
  board: BoardState;
}

export default function SuperTicTacToe() {
  const { roomId } = useParams();
  const userId = useCurrentUser();
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerSymbol, setPlayerSymbol] = useState<Player | null>(null);

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
            board: JSON.parse(data.board),
          });
        }
      } catch (err) {
        toast({
          title: "Failed to load game",
          description: (err as Error).message,
          variant: "error",
        });
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
        (payload: RealtimePostgresChangesPayload<GameState>) => {
          const { new: gameState } = payload;
          if ("id" in gameState) {
            setGameState(gameState);
          }
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [roomId, toast]);

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
          if (isPlayerX) {
            setPlayerSymbol(isPlayerX ? "X" : "O");
          } else if (data.player_o === userId) {
            setPlayerSymbol("O");
          } else if (data.player_o === null) {
            const { error: updateError } = await db
              .from("games")
              .update({
                player_o: userId,
                is_guest_o: userId.startsWith("guest_"),
                status: "in_progress",
              })
              .eq("id", roomId);

            if (updateError) throw updateError;

            setPlayerSymbol("O");
          }
        }
      } catch (err) {
        console.error("Error fetching player info:", err);
        toast({
          title: "Failed to fetch player info",
          description: (err as Error).message,
          variant: "error",
        });
      }
    };

    fetchPlayerInfo();
  }, [roomId, toast, userId]);

  const isMyTurn = useMemo(
    () => playerSymbol === gameState?.current_player,
    [playerSymbol, gameState]
  );

  const handleClick = useCallback(
    async (boardIndex: number, cellIndex: number) => {
      if (!gameState || !userId) return;
      if (!isMyTurn) return;
      if (gameState.status === "completed") return;
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
            winner,
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
    [gameState, isMyTurn, roomId, toast, userId]
  );

  const renderBoard = useCallback(
    (boardIndex: number) => {
      if (!gameState) return null;

      const boardWinner = calculateWinner(gameState.board[boardIndex]);

      if (boardWinner) {
        return (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-8xl md:text-9xl font-bold text-blue-600">
              {boardWinner}
            </span>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-3 place-items-center gap-2 p-1 md:p-2 bg-gray-200">
          {gameState.board[boardIndex].map((cell, cellIndex) => (
            <Button
              key={cellIndex}
              variant={cell ? "default" : "secondary"}
              className={`w-8 h-6 md:w-12 md:h-12 text-lg font-bold ${
                !isMyTurn ? "cursor-not-allowed" : ""
              }`}
              onClick={() => handleClick(boardIndex, cellIndex)}
              disabled={
                !isMyTurn ||
                gameState.status === "completed" ||
                cell !== null ||
                (gameState.active_board !== null &&
                  gameState.active_board !== boardIndex)
              }
            >
              {cell || ""}
            </Button>
          ))}
        </div>
      );
    },
    [gameState, handleClick, isMyTurn]
  );

  const status = useMemo(() => {
    if (gameState?.winner) {
      return <div className="text-green-600">Winner: {gameState.winner}</div>;
    }

    switch (gameState?.status) {
      case "completed":
        return "Game Draw!";
      case "waiting":
        return (
          <div className="text-yellow-600 text-lg">
            Waiting for other player to join...
          </div>
        );
      case "in_progress":
        if (playerSymbol) {
          if (isMyTurn)
            return <div className="text-green-600 text-lg">Your turn!</div>;
          else
            return (
              <div className="text-yellow-600 text-lg">
                Waiting for other player&apos;s move...
              </div>
            );
        }
      default:
        return null;
    }
  }, [gameState?.status, gameState?.winner, isMyTurn, playerSymbol]);

  if (loading) {
    return <div className="text-center p-4">Loading game...</div>;
  }

  if (!gameState) {
    return <div className="text-center p-4">Game not found</div>;
  }

  return (
    <div className="flex flex-col items-center">
      <div className="text-2xl font-bold text-center">
        {playerSymbol ? (
          <div>You play with {playerSymbol}</div>
        ) : (
          <div>Spectating: {gameState?.current_player} turn</div>
        )}
        <div className="my-3">{status}</div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4 w-full">
        {gameState.board.map((_, index) => (
          <div
            key={index}
            className={`rounded-lg overflow-hidden ${
              gameState.status !== "completed" &&
              gameState.active_board !== null &&
              gameState.active_board === index
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
