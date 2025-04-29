
import React from 'react';
import Cell from './Cell';
import { cn } from '@/lib/utils';
import { useGame } from '@/context/GameContext';
import { CheckCircle } from 'lucide-react';

interface MiniBoardProps {
  boardIndex: number;
}

const MiniBoard: React.FC<MiniBoardProps> = ({ boardIndex }) => {
  const { state, makeMove } = useGame();
  const { boards, boardStatus, nextBoardIndex, gameStatus } = state;
  
  const board = boards[boardIndex];
  const isActive = gameStatus === 'playing' && (nextBoardIndex === null || nextBoardIndex === boardIndex);
  const boardWon = boardStatus[boardIndex] !== null;
  
  const handleCellClick = (cellIndex: number) => {
    if (isActive && !boardWon && board[cellIndex] === null) {
      makeMove(boardIndex, cellIndex);
    }
  };

  return (
    <div 
      className={cn(
        'mini-board relative',
        isActive && 'active',
        !isActive && !boardWon && 'inactive',
        boardWon && boardStatus[boardIndex] === 'X' && 'won-x',
        boardWon && boardStatus[boardIndex] === 'O' && 'won-o'
      )}
      role="group"
      aria-label={`Board ${boardIndex + 1}`}
    >
      {boardWon && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-sm z-10 animate-fade-in">
          <div className={cn(
            'text-4xl font-poppins font-bold animate-scale-in',
            boardStatus[boardIndex] === 'X' ? 'text-game-x' : 'text-game-o'
          )}>
            <CheckCircle className="w-12 h-12 mx-auto mb-2" />
            {boardStatus[boardIndex]}
          </div>
        </div>
      )}
      {board.map((cell, idx) => (
        <Cell 
          key={idx}
          value={cell}
          onClick={() => handleCellClick(idx)}
          isActive={isActive}
          boardWon={boardWon}
        />
      ))}
    </div>
  );
};

export default MiniBoard;
