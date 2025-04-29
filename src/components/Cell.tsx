
import React from 'react';
import { cn } from '@/lib/utils';

interface CellProps {
  value: 'X' | 'O' | null;
  onClick: () => void;
  isActive: boolean;
  boardWon: boolean;
  playerSymbols: Record<string, string>;
}

const Cell: React.FC<CellProps> = ({ value, onClick, isActive, boardWon, playerSymbols }) => {
  return (
    <button 
      className={cn(
        'cell aspect-square w-full flex items-center justify-center text-2xl font-bold rounded-md',
        value === 'X' && 'text-game-x',
        value === 'O' && 'text-game-o',
        isActive && !boardWon && 'hover:bg-primary/10 hover-scale',
        boardWon && 'cursor-not-allowed',
        'transition-all duration-200 bg-background/50'
      )}
      onClick={onClick}
      disabled={!isActive || boardWon}
      aria-label={`Cell ${value || 'empty'}`}
    >
      {value ? playerSymbols[value] : ''}
    </button>
  );
};

export default Cell;
