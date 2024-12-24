import { FC } from "react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/store";

interface GameOverProps {
  roomId: string;
  userId: string | null;
  playerSymbol: string | null;
}

export const GameOver: FC<GameOverProps> = ({
  roomId,
  userId,
  playerSymbol,
}) => {
  const { gameState, requestRematch, acceptRematch } = useGameStore();

  if (!gameState || !userId || gameState.status !== "completed") return null;

  const handleRequestRematch = () => {
    requestRematch(roomId, userId);
  };

  const handleAcceptRematch = () => {
    acceptRematch(roomId);
  };

  const showRematchButton = playerSymbol && !gameState.rematch_requested_by;
  const showAcceptButton =
    playerSymbol &&
    gameState.rematch_requested_by &&
    gameState.rematch_requested_by !== userId;

  return (
    <div className="text-center space-y-4">
      <div className="text-muted-foreground">
        Game Over! <br />
        {gameState.rematch_requested_by && "Rematch requested..."}
      </div>
      {showRematchButton && (
        <Button onClick={handleRequestRematch}>Request Rematch</Button>
      )}
      {showAcceptButton && (
        <Button onClick={handleAcceptRematch} variant="success">
          Accept Rematch
        </Button>
      )}
    </div>
  );
};
