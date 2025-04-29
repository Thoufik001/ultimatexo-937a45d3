
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
        'cell',
        value === 'X' && 'x',
        value === 'O' && 'o',
        isActive && !boardWon && 'hover:bg-primary/10 hover-scale',
        boardWon && 'cursor-not-allowed',
        'transition-all duration-200'
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
