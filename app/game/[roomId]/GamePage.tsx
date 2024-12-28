"use client";

import { useGameRoom } from "@/hooks/useGameRoom";
import { GameLayout } from "@/components/GameLayout";
import { GameStatus } from "@/components/GameStatus";
import ClassicTicTacToe from "@/components/Classic";
import Super from "@/components/Super";
import { Button } from "@/components/ui/button";
import { GameOver } from "@/components/GameOver";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Confetti = dynamic(() => import("react-confetti"), { ssr: false });

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

  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (gameState?.winner == null) return;
    if (playerSymbol == null) return;
    if (gameState?.winner !== playerSymbol) return;

    setShowConfetti(true);
  }, [gameState?.winner, playerSymbol]);

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
    <>
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
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          onConfettiComplete={() => setShowConfetti(false)}
        />
      )}
    </>
  );
}
