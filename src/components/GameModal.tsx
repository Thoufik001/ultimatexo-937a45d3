
import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGame } from '@/context/GameContext';
import { Trophy } from 'lucide-react';

interface GameModalProps {
  open: boolean;
  onClose: () => void;
}

const GameModal: React.FC<GameModalProps> = ({ open, onClose }) => {
  const { state, restartGame } = useGame();
  const { winner, gameStatus } = state;
  
  let title = '';
  let content = '';
  
  if (gameStatus === 'game-over') {
    if (winner) {
      title = `${winner} Wins!`;
      content = `Congratulations Player ${winner}! You have won the game!`;
    } else {
      title = "It's a Tie!";
      content = "Well played by both sides. The game has ended in a draw.";
    }
  } else if (gameStatus === 'paused') {
    title = "Game Paused";
    content = "The game is currently paused. Press 'Resume' to continue playing.";
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-poppins">
            {title}
          </DialogTitle>
        </DialogHeader>
        
        {gameStatus === 'game-over' && (
          <div className="flex flex-col items-center py-4">
            {winner && (
              <Trophy className={`w-16 h-16 ${winner === 'X' ? 'text-game-x' : 'text-game-o'} animate-celebrate mb-4`} />
            )}
            <p className="text-center text-lg">{content}</p>
          </div>
        )}
        
        {gameStatus === 'paused' && (
          <div className="py-4">
            <p className="text-center">{content}</p>
          </div>
        )}
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          {gameStatus === 'game-over' && (
            <Button 
              onClick={() => {
                restartGame();
                onClose();
              }} 
              className="w-full"
            >
              Play Again
            </Button>
          )}
          
          {gameStatus === 'paused' && (
            <Button onClick={onClose} className="w-full">
              Resume Game
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GameModal;
