
import React from 'react';
import MiniBoard from './MiniBoard';
import { useGame } from '@/context/GameContext';

const GameBoard: React.FC = () => {
  const { state } = useGame();
  const { playerSymbols } = state;
  
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 mx-auto aspect-square glass-board rounded-lg p-3 h-full max-h-[80vh]">
      {Array(9).fill(null).map((_, idx) => (
        <MiniBoard key={idx} boardIndex={idx} playerSymbols={playerSymbols} />
      ))}
    </div>
  );
};

export default GameBoard;
