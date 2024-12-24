"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ClassicTicTacToe, { GameClassicState } from "@/components/Classic";
import SuperTicTacToe, { GameSuperState } from "@/components/Super";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  REALTIME_SUBSCRIBE_STATES,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Player } from "@/types/database";

const handleSubscription = (
  status: REALTIME_SUBSCRIBE_STATES,
  channel: RealtimeChannel,
  callback: () => void
) => {
  if (status !== REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
    callback();
    channel.subscribe((status) =>
      handleSubscription(status, channel, callback)
    );
  }
};

type GameState = GameClassicState | GameSuperState;

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const userId = useCurrentUser();
  const [playerSymbol, setPlayerSymbol] = useState<Player | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

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
        setLoading(false);
      } catch (err) {
        console.error("Error fetching game state:", err);
        setError("Failed to load game state");
        toast({
          title: "Failed to load game",
          description: (err as Error).message,
          variant: "error",
        });
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
      (payload: RealtimePostgresChangesPayload<GameState>) => {
        const { new: gameState } = payload;
        if ("id" in gameState) {
          setGameState(gameState);
        }
      }
    );

    channel.subscribe((status) =>
      handleSubscription(status, channel, fetchGameState)
    );

    return () => {
      db.removeChannel(channel);
    };
  }, [roomId, router, toast]);

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

  const handleReturnToMenu = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleCopyRoomUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Room URL copied",
      description:
        "You can now share this URL with your friends to join the game.",
      variant: "success",
    });
  };

  const isMyTurn = useMemo(
    () => playerSymbol === gameState?.current_player,
    [gameState?.current_player, playerSymbol]
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="text-xl">Loading game...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
        <div className="text-xl text-red-600">{error}</div>
        <Button onClick={handleReturnToMenu}>Return to Main Menu</Button>
      </div>
    );
  }

  if (!gameState?.mode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
        <div className="text-xl">Invalid game mode</div>
        <Button onClick={handleReturnToMenu}>Return to Main Menu</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <Button variant="outline" onClick={handleReturnToMenu}>
          Back to Main Menu
        </Button>
        <Button variant="outline" onClick={handleCopyRoomUrl}>
          Copy join link
        </Button>
      </div>

      <div className="bg-card rounded-lg shadow-lg p-2 md:p-6">
        <div className="flex flex-col items-center space-y-8">
          <div className="text-2xl font-bold text-center space-y-2">
            {playerSymbol ? (
              <div>You play with {playerSymbol}</div>
            ) : (
              <div>Spectating: {gameState?.current_player} turn</div>
            )}
            <div>{status}</div>
          </div>
          {gameState?.mode === "classic" ? (
            <ClassicTicTacToe
              gameState={gameState as GameClassicState}
              isMyTurn={isMyTurn}
            />
          ) : (
            <SuperTicTacToe
              gameState={gameState as GameSuperState}
              isMyTurn={isMyTurn}
            />
          )}
          {gameState?.status === "completed" && (
            <div className="text-muted-foreground text-center">
              Game Over! Create a new game to play again.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
