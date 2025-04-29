
import React from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Undo, 
  Redo, 
  Volume2, 
  VolumeX,
  Moon,
  Sun,
  Settings
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useTheme } from '@/hooks/use-theme';

interface GameControlsProps {
  onOpenSettings: () => void;
}

const GameControls: React.FC<GameControlsProps> = ({ onOpenSettings }) => {
  const { state, restartGame, pauseGame, resumeGame, undoMove, redoMove, toggleSound } = useGame();
  const { theme, setTheme } = useTheme();
  
  const { 
    currentPlayer, 
    turnTimeLimit, 
    turnTimeRemaining, 
    gameStatus, 
    isMuted, 
    moveHistory,
    currentMoveIndex,
    playerSymbols
  } = state;
  
  const timePercentage = (turnTimeRemaining / turnTimeLimit) * 100;
  const isTimeLow = turnTimeRemaining <= 5;
  
  return (
    <div className="flex flex-col gap-4 max-w-3xl mx-auto px-2 sm:px-4 glass-card">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 rounded-lg">
        <div className="flex flex-col items-center sm:items-start">
          <div className="text-xl font-poppins font-semibold">
            {gameStatus === 'paused' 
              ? 'Game Paused' 
              : gameStatus === 'game-over' 
                ? 'Game Over' 
                : `Current Turn: ${playerSymbols[currentPlayer]}`
            }
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-4 h-4 rounded-full ${currentPlayer === 'X' ? 'bg-game-x' : 'bg-game-o'}`}></div>
            <span className="font-inter">
              {gameStatus === 'game-over' 
                ? state.winner 
                  ? `${playerSymbols[state.winner]} Wins!` 
                  : "It's a Tie!" 
                : `Player ${playerSymbols[currentPlayer]}'s turn`
              }
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="hover-scale"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleSound}
            aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
            className="hover-scale"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={undoMove}
            disabled={currentMoveIndex <= 0}
            aria-label="Undo move"
            className="hover-scale"
          >
            <Undo className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={redoMove}
            disabled={currentMoveIndex >= moveHistory.length - 1}
            aria-label="Redo move"
            className="hover-scale"
          >
            <Redo className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={onOpenSettings}
            aria-label="Game Settings"
            className="hover-scale"
          >
            <Settings className="h-4 w-4" />
          </Button>
          
          {gameStatus === 'playing' ? (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={pauseGame}
              aria-label="Pause game"
              className="hover-scale"
            >
              <Pause className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={gameStatus === 'paused' ? resumeGame : restartGame}
              aria-label={gameStatus === 'paused' ? 'Resume game' : 'Restart game'}
              className="hover-scale"
            >
              {gameStatus === 'paused' ? <Play className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
      
      <div className="w-full px-4 pb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-inter">Time remaining</span>
          <span className="font-mono">{turnTimeRemaining}s</span>
        </div>
        <Progress 
          value={timePercentage} 
          className={`h-2 ${isTimeLow ? 'bg-red-200' : ''}`}
          indicatorClassName={isTimeLow ? 'animate-pulse bg-red-500' : ''}
        />
      </div>
    </div>
  );
};

export default GameControls;
