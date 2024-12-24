"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import type { Player, Game, Board, Winner } from "@/types/database";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useParams } from "next/navigation";
import {
  REALTIME_SUBSCRIBE_STATES,
  RealtimeChannel,
} from "@supabase/supabase-js";

const handleSubscription = (
  status: REALTIME_SUBSCRIBE_STATES,
  channel: RealtimeChannel
) => {
  if (status !== REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
    channel.subscribe((status) => handleSubscription(status, channel));
  }
};

interface GameState extends Omit<Game, "board"> {
  board: Board;
}

export default function ClassicTicTacToe() {
  const { roomId } = useParams();
  const userId = useCurrentUser();

  const [gameState, setGameState] = useState<GameState | null>(null);

  const [error, setError] = useState<string | null>(null);
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
        console.error("Error fetching game state:", err);
        setError("Failed to load game state");
      }
    };

    fetchGameState();

    const channel = db.channel(`game_changes`).on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: `id=eq.${roomId}`,
      },
      (payload: { new: GameState }) => {
        setGameState({
          ...payload.new,
          board: payload.new.board,
        });
      }
    );

    channel.subscribe((status) => handleSubscription(status, channel));

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
      }
    };

    fetchPlayerInfo();
  }, [userId, roomId]);

  const isMyTurn = useMemo(
    () => playerSymbol === gameState?.current_player,
    [gameState, playerSymbol]
  );

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
        const isDraw = !newWinner && newBoard.every((cell) => cell !== null);
        const nextPlayer = current_player === "X" ? "O" : "X";
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
    },
    [gameState, isMyTurn, roomId]
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

  const status = useMemo(() => {
    if (!gameState) return null;

    const { status, winner } = gameState;

    if (winner) {
      return <div className="text-green-600">Winner: {winner}</div>;
    }

    switch (status) {
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
  }, [gameState, isMyTurn, playerSymbol]);

  if (error) {
    return <div className="text-red-600 text-center">{error}</div>;
  }

  return (
    <div className="flex flex-col items-center space-y-8">
      <div className="text-2xl font-bold text-center space-y-2">
        {playerSymbol ? (
          <div>You play with {playerSymbol}</div>
        ) : (
          <div>Spectating: {gameState?.current_player} turn</div>
        )}
        <div>{status}</div>
      </div>

      <div className="grid grid-cols-3 gap-2 bg-muted p-4 rounded-lg">
        {gameState?.board.map((_, index) => (
          <div key={index}>{renderSquare(index)}</div>
        ))}
      </div>

      {gameState?.status === "completed" && (
        <div className="text-muted-foreground text-center">
          Game Over! Create a new game to play again.
        </div>
      )}
    </div>
  );
}

function calculateWinner(squares: Board): Winner | null {
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
