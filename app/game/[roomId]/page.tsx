"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ClassicTicTacToe from "@/components/Classic";
import SuperTicTacToe from "@/components/Super";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface GameError {
  message: string;
  code?: string;
}

export default function GamePage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<GameError | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const { data, error } = await db
          .from("games")
          .select("mode, status, player_x, player_o")
          .eq("id", params.roomId)
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          setError({ message: "Game not found", code: "404" });
          return;
        }

        router.replace(`/game/${params.roomId}?mode=${data.mode}`);
      } catch (err: unknown) {
        console.error("Error fetching game:", err);
        setError({
          message: "Failed to load game. Please try again.",
          code: err instanceof Error ? err.message : "unknown",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [params.roomId, router]);

  const gameMode = searchParams.get("mode") as "classic" | "super" | null;

  const handleReturnToMenu = () => {
    router.push("/");
  };

  const handleCopyRoomUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Room URL copied",
      description:
        "You can now share this URL with your friends to join the game.",
      variant: "success",
    });
  };

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
        <div className="text-xl text-red-600">{error.message}</div>
        <Button onClick={handleReturnToMenu}>Return to Main Menu</Button>
      </div>
    );
  }

  if (!gameMode) {
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
        {gameMode === "classic" ? <ClassicTicTacToe /> : <SuperTicTacToe />}
      </div>
    </div>
  );
}
