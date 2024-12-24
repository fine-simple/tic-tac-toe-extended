import { FC } from "react";
import { useGameStore } from "@/lib/game/store";

interface GameStatusProps {
  playerSymbol: string | null;
  isMyTurn: boolean;
}

export const GameStatus: FC<GameStatusProps> = ({ playerSymbol, isMyTurn }) => {
  const { gameState } = useGameStore();

  if (!gameState) return null;

  if (gameState.winner) {
    return <div className="text-green-600">Winner: {gameState.winner}</div>;
  }

  switch (gameState.status) {
    case "completed":
      return <div>Game Draw!</div>;
    case "waiting":
      return (
        <div className="text-yellow-600 text-lg">
          Waiting for other player to join...
        </div>
      );
    case "in_progress":
      if (playerSymbol) {
        return isMyTurn ? (
          <div className="text-green-600 text-lg">Your turn!</div>
        ) : (
          <div className="text-yellow-600 text-lg">
            Waiting for other player&apos;s move...
          </div>
        );
      }
    default:
      return null;
  }
};
