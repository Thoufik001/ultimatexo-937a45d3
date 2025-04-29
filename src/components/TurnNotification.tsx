
import React from 'react';
import { useGame } from '@/context/GameContext';
import { cn } from '@/lib/utils';

const TurnNotification: React.FC = () => {
  const { state } = useGame();
  const { currentPlayer, nextBoardIndex, gameStatus, playerSymbols } = state;
  
  if (gameStatus !== 'playing') {
    return null;
  }

  return (
    <div className={cn(
      "glass-card p-4 rounded-lg transition-all duration-300",
      "border-l-4",
      currentPlayer === 'X' ? "border-l-game-x" : "border-l-game-o"
    )}>
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className={`text-xl ${currentPlayer === 'X' ? 'text-game-x' : 'text-game-o'}`}>
            {playerSymbols[currentPlayer]}
          </span>
          <span>Your Turn</span>
        </h3>
        
        <p className="text-sm text-muted-foreground">
          {nextBoardIndex !== null 
            ? `Play in board ${nextBoardIndex + 1}` 
            : "You can play in any available board"}
        </p>
      </div>
    </div>
  );
};

export default TurnNotification;
