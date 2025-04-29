
import React from 'react';
import { cn } from '@/lib/utils';

interface CellProps {
  value: 'X' | 'O' | null;
  onClick: () => void;
  isActive: boolean;
  boardWon: boolean;
}

const Cell: React.FC<CellProps> = ({ value, onClick, isActive, boardWon }) => {
  return (
    <button 
      className={cn(
        'cell',
        value === 'X' && 'x',
        value === 'O' && 'o',
        isActive && !boardWon && 'hover:bg-primary/10',
        boardWon && 'cursor-not-allowed'
      )}
      onClick={onClick}
      disabled={!isActive || boardWon}
      aria-label={`Cell ${value || 'empty'}`}
    >
      {value}
    </button>
  );
};

export default Cell;
