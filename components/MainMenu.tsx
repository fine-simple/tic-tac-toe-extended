"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";

type GameMode = "classic" | "super";

interface GameError {
  message: string;
  status: "error" | "warning";
}

export default function MainMenu() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GameError | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedGuestId = localStorage.getItem("guestId");
    if (storedGuestId) {
      setGuestId(storedGuestId);
    } else {
      const newGuestId = `guest_${Math.random().toString(36).substring(2)}`;
      localStorage.setItem("guestId", newGuestId);
      setGuestId(newGuestId);
    }
  }, []);

  const handleCreateGame = useCallback(
    async (mode: GameMode) => {
      setLoading(true);
      setError(null);

      try {
        const userId = guestId;
        if (!userId) {
          setError({ message: "Unable to create game", status: "error" });
          return;
        }

        const roomId = Math.random().toString(36).substring(2, 8);
        const initialBoard =
          mode === "classic"
            ? Array(9).fill(null)
            : Array(9).fill(Array(9).fill(null));

        const { error: dbError } = await db.from("games").insert({
          id: roomId,
          mode,
          current_player: "X",
          player_x: userId,
          board: JSON.stringify(initialBoard),
          status: "waiting",
          is_guest_x: true,
        });

        if (dbError) throw dbError;

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
    },
    [guestId, router]
  );

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
