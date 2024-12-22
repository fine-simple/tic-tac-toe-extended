import { createClient } from "@supabase/supabase-js";
import { Board, Database, Game, GameStatus, Player } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const db = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export async function createGame(userId: string): Promise<Game | null> {
  const { data, error } = await db
    .from("games")
    .insert({
      id: Math.random().toString(36).substring(7),
      player_x: userId,
      board: Array(9).fill(""),
      current_player: "X",
      status: "waiting",
      mode: "classic",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating game:", error);
    return null;
  }

  return data;
}

export async function joinGame(
  gameId: string,
  userId: string
): Promise<Game | null> {
  const { data, error } = await db
    .from("games")
    .update({
      player_o: userId,
      status: "in_progress",
    })
    .eq("id", gameId)
    .eq("status", "waiting")
    .select()
    .single();

  if (error) {
    console.error("Error joining game:", error);
    return null;
  }

  return data;
}

export async function updateGame(
  gameId: string,
  board: Board,
  currentPlayer: Player,
  winner: Player | null,
  status: GameStatus
): Promise<Game | null> {
  const { data, error } = await db
    .from("games")
    .update({
      board,
      current_player: currentPlayer,
      winner,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId)
    .select()
    .single();

  if (error) {
    console.error("Error updating game:", error);
    return null;
  }

  return data;
}

export async function getActiveGames(): Promise<Game[]> {
  const { data, error } = await db
    .from("games")
    .select()
    .in("status", ["waiting", "in_progress"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching games:", error);
    return [];
  }

  return data;
}

export async function getGame(gameId: string): Promise<Game | null> {
  const { data, error } = await db
    .from("games")
    .select()
    .eq("id", gameId)
    .single();

  if (error) {
    console.error("Error fetching game:", error);
    return null;
  }

  return data;
}
