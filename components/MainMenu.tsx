"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/game/store";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { GameMode } from "@/types/database";

interface GameError {
  message: string;
  status: "error" | "warning";
}

export default function MainMenu() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GameError | null>(null);
  const router = useRouter();
  const userId = useCurrentUser();
  const { createGame } = useGameStore();

  const handleCreateGame = async (mode: GameMode) => {
    if (!userId) {
      setError({ message: "Unable to create game", status: "error" });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const roomId = await createGame(mode, userId);
      router.push(`/game/${roomId}?mode=${mode}`);
    } catch (err) {
      setError({
        message: "Failed to create game. Please try again.",
        status: "error",
      });
      console.error("Error creating game:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-8 p-4">
      {error && (
        <div
          className={`p-4 rounded-md ${
            error.status === "error"
              ? "bg-red-100 text-red-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {error.message}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Create New Game</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => handleCreateGame("classic")}
            disabled={loading}
          >
            Classic Mode
          </Button>
          <Button onClick={() => handleCreateGame("super")} disabled={loading}>
            Super Mode
          </Button>
        </div>
      </div>
    </div>
  );
}
