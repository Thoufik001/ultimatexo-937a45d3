
import React from 'react';
import MiniBoard from './MiniBoard';

const GameBoard: React.FC = () => {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-3xl mx-auto aspect-square">
      {Array(9).fill(null).map((_, idx) => (
        <MiniBoard key={idx} boardIndex={idx} />
      ))}
    </div>
  );
};

export default GameBoard;
