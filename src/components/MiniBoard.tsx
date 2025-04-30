
import React from 'react';
import { cn } from '@/lib/utils';
import { useGame } from '@/context/GameContext';
import Cell from './Cell';

interface MiniBoardProps {
  boardIndex: number;
  playerSymbols: Record<string, string>;
}

const MiniBoard: React.FC<MiniBoardProps> = ({ boardIndex, playerSymbols }) => {
  const { state, makeMove } = useGame();
  const { boards, boardStatus, nextBoardIndex, gameStatus } = state;
  
  const board = boards[boardIndex];
  const boardWinner = boardStatus[boardIndex];
  const isActive = gameStatus === 'playing' && (nextBoardIndex === null || nextBoardIndex === boardIndex);
  
  const handleCellClick = (cellIndex: number) => {
    if (gameStatus === 'playing') {
      makeMove(boardIndex, cellIndex);
    }
  };
  
  const boardClasses = cn(
    'mini-board relative grid grid-cols-3 gap-1 aspect-square w-full',
    isActive && 'active ring-2 ring-primary/50 shadow-lg',
    !isActive && 'inactive opacity-80',
    boardWinner === 'X' && 'won-x',
    boardWinner === 'O' && 'won-o',
    gameStatus === 'init' && 'cursor-not-allowed opacity-70'
  );
  
  return (
    <div className={boardClasses}>
      {board.map((cell, cellIndex) => (
        <Cell 
          key={cellIndex} 
          value={cell} 
          onClick={() => handleCellClick(cellIndex)} 
          isActive={isActive && gameStatus === 'playing'}
          boardWon={boardWinner !== null}
          playerSymbols={playerSymbols}
        />
      ))}
      
      {boardWinner && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-sm rounded-md">
          <span className={`text-4xl font-bold ${boardWinner === 'X' ? 'text-game-x' : 'text-game-o'} animate-fade-in`}>
            {playerSymbols[boardWinner]}
          </span>
        </div>
      )}
      
      {gameStatus === 'init' && (
        <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px] rounded-md">
          {/* This overlay prevents interaction before game starts */}
        </div>
      )}
    </div>
  );
};

export default MiniBoard;
