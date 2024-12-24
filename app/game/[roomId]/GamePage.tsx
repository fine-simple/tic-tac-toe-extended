"use client";

import { useGameRoom } from "@/hooks/useGameRoom";
import { GameLayout } from "@/components/GameLayout";
import { GameStatus } from "@/components/GameStatus";
import ClassicTicTacToe from "@/components/Classic";
import Super from "@/components/Super";
import { Button } from "@/components/ui/button";
import { GameOver } from "@/components/GameOver";

export function GamePage() {
  const {
    gameState,
    playerSymbol,
    isMyTurn,
    loading,
    handleCopyRoomUrl,
    handleReturnToMenu,
    roomId,
    userId,
  } = useGameRoom();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="text-xl">Loading game...</div>
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
    <GameLayout
      onReturnToMenu={handleReturnToMenu}
      onCopyRoomUrl={handleCopyRoomUrl}
    >
      <div className="flex flex-col items-center space-y-8">
        <div className="text-2xl font-bold text-center space-y-2">
          {playerSymbol ? (
            <div>You play with {playerSymbol}</div>
          ) : (
            <div>Spectating: {gameState.current_player} turn</div>
          )}
          <GameStatus playerSymbol={playerSymbol} isMyTurn={isMyTurn} />
        </div>

        {gameState.mode === "classic" ? (
          <ClassicTicTacToe isMyTurn={isMyTurn} />
        ) : (
          <Super isMyTurn={isMyTurn} />
        )}

        {gameState.status === "completed" && (
          <GameOver
            roomId={roomId}
            userId={userId}
            playerSymbol={playerSymbol}
          />
        )}
      </div>
    </GameLayout>
  );
}
