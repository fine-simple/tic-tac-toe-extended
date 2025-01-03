import { create } from "zustand";
import { db } from "@/lib/db";
import { Game, GameMode } from "@/types/database";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface GameStore {
  gameState: Game | null;
  loading: boolean;
  error: string | null;
  setGameState: (state: Game | null) => void;
  createGame: (mode: GameMode, userId: string) => Promise<string>;
  fetchGame: (roomId: string) => Promise<void>;
  updateGame: (updates: Partial<Game>) => Promise<void>;
  subscribeToGame: (
    roomId: string,
    callback: (roomId: string) => void
  ) => () => void;
  requestRematch: (roomId: string, userId: string) => Promise<void>;
  acceptRematch: (roomId: string) => Promise<void>;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  loading: false,
  error: null,

  setGameState: state => set({ gameState: state }),

  createGame: async (mode, userId) => {
    set({ loading: true, error: null });
    try {
      const roomId = Math.random().toString(36).substring(2, 8);
      const initialBoard =
        mode === "classic"
          ? Array(9).fill(null)
          : Array(9).fill(Array(9).fill(null));

      await db.from("games").insert({
        id: roomId,
        mode,
        current_player: ["X", "O"][Math.floor(Math.random() * 2)],
        player_x: userId,
        board: JSON.stringify(initialBoard),
        status: "waiting",
      });

      return roomId;
    } catch (err) {
      set({ error: "Failed to create game" });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  fetchGame: async roomId => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await db
        .from("games")
        .select()
        .eq("id", roomId)
        .single();

      if (error) throw error;

      if (data) {
        set({
          gameState: {
            ...data,
            board: JSON.parse(data.board as unknown as string),
          },
        });
      }
    } catch (err) {
      set({ error: "Failed to load game" });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateGame: async updates => {
    const { gameState } = get();
    if (!gameState) return;

    try {
      const { error } = await db
        .from("games")
        .update({
          ...updates,
          board: JSON.stringify(updates.board || gameState.board),
          updated_at: new Date().toISOString(),
        })
        .eq("id", gameState.id);

      if (error) throw error;
    } catch (err) {
      set({ error: "Failed to update game" });
      throw err;
    }
  },

  subscribeToGame: (roomId, callback) => {
    const channel = db.channel(`game_changes`).on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: `id=eq.${roomId}`,
      },
      (payload: RealtimePostgresChangesPayload<Game>) => {
        const { new: gameState } = payload;
        if ("id" in gameState) {
          set({
            gameState,
          });
          callback(roomId);
        }
      }
    );

    channel.subscribe();
    return () => {
      db.removeChannel(channel);
    };
  },
  requestRematch: async (roomId, userId) => {
    try {
      await db
        .from("games")
        .update({
          rematch_requested_by: userId,
        })
        .eq("id", roomId);
    } catch (err) {
      set({ error: "Failed to request rematch" });
      throw err;
    }
  },

  acceptRematch: async roomId => {
    const { gameState } = get();
    if (!gameState) return;

    try {
      const initialBoard =
        gameState.mode === "classic"
          ? Array(9).fill(null)
          : Array(9).fill(Array(9).fill(null));

      await db
        .from("games")
        .update({
          board: JSON.stringify(initialBoard),
          current_player: ["X", "O"][Math.floor(Math.random() * 2)],
          status: "in_progress",
          winner: null,
          active_board: null,
          rematch_requested_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", roomId);
    } catch (err) {
      set({ error: "Failed to accept rematch" });
      throw err;
    }
  },
}));
