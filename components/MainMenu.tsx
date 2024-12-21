"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import type { Session } from "@supabase/supabase-js";

type GameMode = "classic" | "super";

interface GameError {
  message: string;
  status: "error" | "warning";
}

export default function MainMenu() {
  const [joinCode, setJoinCode] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GameError | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      // Check for existing session
      const {
        data: { session },
      } = await db.auth.getSession();
      setSession(session);

      // If no session, create or retrieve guest ID
      if (!session) {
        const storedGuestId = localStorage.getItem("guestId");
        if (storedGuestId) {
          setGuestId(storedGuestId);
        } else {
          const newGuestId = `guest_${Math.random().toString(36).substring(2)}`;
          localStorage.setItem("guestId", newGuestId);
          setGuestId(newGuestId);
        }
      }

      const {
        data: { subscription },
      } = db.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session) {
          // Clear guest ID if user signs in
          localStorage.removeItem("guestId");
          setGuestId(null);
        }
      });

      return () => subscription.unsubscribe();
    };

    initializeAuth();
  }, []);

  const createGame = async (mode: GameMode) => {
    setLoading(true);
    setError(null);

    try {
      const userId = session?.user?.id || guestId;
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
        is_guest_x: !session, // Flag to indicate if player X is a guest
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
  };

  const joinGame = async () => {
    if (!joinCode) {
      setError({ message: "Please enter a room code", status: "warning" });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userId = session?.user?.id || guestId;
      if (!userId) {
        setError({ message: "Unable to join game", status: "error" });
        return;
      }

      const { data, error: fetchError } = await db
        .from("games")
        .select("*")
        .eq("id", joinCode)
        .single();

      if (fetchError) throw fetchError;

      if (!data) {
        setError({ message: "Game not found", status: "error" });
        return;
      }

      if (data.player_o) {
        setError({ message: "Game is full", status: "error" });
        return;
      }

      const { error: updateError } = await db
        .from("games")
        .update({
          player_o: userId,
          is_guest_o: !session, // Flag to indicate if player O is a guest
          status: "in_progress",
        })
        .eq("id", joinCode);

      if (updateError) throw updateError;

      router.push(`/game/${joinCode}?mode=${data.mode}`);
    } catch (err) {
      setError({
        message: "Failed to join game. Please try again.",
        status: "error",
      });
      console.error("Error joining game:", err);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await db.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) throw error;
    } catch (err) {
      setError({
        message: "Failed to sign in with Google",
        status: "error",
      });
      console.error("Error logging in to Google:", err);
    }
  };

  const signInWithFacebook = async () => {
    try {
      const { error } = await db.auth.signInWithOAuth({
        provider: "facebook",
      });
      if (error) throw error;
    } catch (err) {
      setError({
        message: "Failed to sign in with Facebook",
        status: "error",
      });
      console.error("Error logging in to Facebook:", err);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await db.auth.signOut();
      if (error) throw error;
    } catch (err) {
      setError({
        message: "Failed to sign out",
        status: "error",
      });
      console.error("Error signing out:", err);
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
          <Button onClick={() => createGame("classic")} disabled={loading}>
            Classic Mode
          </Button>
          <Button onClick={() => createGame("super")} disabled={loading}>
            Super Mode
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Join Game</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            type="text"
            placeholder="Enter room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={joinGame} disabled={loading || !joinCode}>
            Join
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {
          session ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-center">
                Signed in as{" "}
                <span className="font-medium">{session.user.email}</span>
              </p>
              <Button onClick={signOut} variant="outline" disabled={loading}>
                Sign out
              </Button>
            </div>
          ) : null
          // <div className="space-y-4">
          //   <p className="text-center text-muted-foreground">
          //     Playing as guest. Sign in to save your progress and stats.
          //   </p>
          //   <div className="flex flex-col sm:flex-row justify-center gap-4">
          //     <Button
          //       onClick={signInWithGoogle}
          //       disabled={loading}
          //       variant="outline"
          //     >
          //       Sign in with Google
          //     </Button>
          //     <Button
          //       onClick={signInWithFacebook}
          //       disabled={loading}
          //       variant="outline"
          //     >
          //       Sign in with Facebook
          //     </Button>
          //   </div>
          // </div>
        }
      </div>
    </div>
  );
}
