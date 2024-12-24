import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "./use-toast";
import { useGameStore } from "@/lib/store";
import { useCurrentUser } from "./useCurrentUser";

export const useGameRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const userId = useCurrentUser();
  const [playerSymbol, setPlayerSymbol] = useState<string | null>(null);

  const { gameState, fetchGame, updateGame, subscribeToGame } = useGameStore();

  useEffect(() => {
    fetchGame(roomId);
    return subscribeToGame(roomId, fetchGame);
  }, [fetchGame, roomId, subscribeToGame]);

  useEffect(() => {
    const joinGame = async () => {
      if (!gameState || !userId) return;

      const isPlayerX = gameState.player_x === userId;
      if (isPlayerX) {
        setPlayerSymbol("X");
      } else if (gameState.player_o === userId) {
        setPlayerSymbol("O");
      } else if (gameState.player_o === null) {
        await updateGame({
          player_o: userId,
          status: "in_progress",
        });
        setPlayerSymbol("O");
      }
    };

    joinGame();
  }, [gameState, updateGame, userId]);

  return {
    gameState,
    playerSymbol,
    isMyTurn: playerSymbol === gameState?.current_player,
    loading: !gameState,
    handleCopyRoomUrl: () => {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Room URL copied",
        description: "Share this URL with friends to join the game.",
        variant: "success",
      });
    },
    handleReturnToMenu: () => router.push("/"),
    userId,
    roomId,
  };
};
