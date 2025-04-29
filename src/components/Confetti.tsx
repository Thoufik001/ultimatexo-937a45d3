
import React, { useEffect, useState } from 'react';

interface ConfettiProps {
  active: boolean;
}

const Confetti: React.FC<ConfettiProps> = ({ active }) => {
  const [pieces, setPieces] = useState<Array<{ id: number, color: string, left: string, delay: string }>>([]);

  useEffect(() => {
    if (active) {
      // Generate confetti pieces
      const newPieces = Array.from({ length: 50 }, (_, i) => {
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff'];
        return {
          id: i,
          color: colors[Math.floor(Math.random() * colors.length)],
          left: `${Math.random() * 100}%`,
          delay: `${Math.random() * 3}s`
        };
      });
      setPieces(newPieces);
    } else {
      setPieces([]);
    }
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {pieces.map(piece => (
        <div
          key={piece.id}
          className="absolute top-0 animate-confetti-fall"
          style={{
            left: piece.left,
            backgroundColor: piece.color,
            width: '10px',
            height: '10px',
            borderRadius: '2px',
            animationDelay: piece.delay
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;
