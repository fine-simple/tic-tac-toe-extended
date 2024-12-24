import { FC, PropsWithChildren } from "react";
import { Button } from "@/components/ui/button";

interface GameLayoutProps {
  onReturnToMenu: () => void;
  onCopyRoomUrl: () => void;
}

export const GameLayout: FC<PropsWithChildren<GameLayoutProps>> = ({
  children,
  onReturnToMenu,
  onCopyRoomUrl,
}) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <Button variant="outline" onClick={onReturnToMenu}>
          Back to Main Menu
        </Button>
        <Button variant="outline" onClick={onCopyRoomUrl}>
          Copy join link
        </Button>
      </div>
      <div className="bg-card rounded-lg shadow-lg p-2 md:p-6">{children}</div>
    </div>
  );
};
