
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
  Settings,
  Bot,
  RefreshCw,
  Square
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useTheme } from '@/hooks/use-theme';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface GameControlsProps {
  onOpenSettings: () => void;
}

const GameControls: React.FC<GameControlsProps> = ({ onOpenSettings }) => {
  const { state, restartGame, startGame, pauseGame, resumeGame, undoMove, redoMove, toggleSound, toggleBotMode, stopGame } = useGame();
  const { theme, setTheme } = useTheme();
  
  const { 
    currentPlayer, 
    turnTimeLimit, 
    turnTimeRemaining, 
    gameStatus, 
    isMuted, 
    moveHistory,
    currentMoveIndex,
    playerSymbols,
    botMode
  } = state;
  
  const timePercentage = (turnTimeRemaining / turnTimeLimit) * 100;
  const isTimeLow = turnTimeRemaining <= 5;
  
  return (
    <div className="flex flex-col gap-4 glass-card p-4 rounded-lg">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-lg font-semibold">
              {gameStatus === 'init' 
                ? 'Game Ready' 
                : gameStatus === 'paused' 
                  ? 'Game Paused' 
                  : gameStatus === 'game-over' 
                    ? 'Game Over' 
                    : `Current Turn`
              }
            </span>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${currentPlayer === 'X' ? 'bg-game-x' : 'bg-game-o'}`}></div>
              <span className="font-inter text-sm">
                {gameStatus === 'game-over' 
                  ? state.winner 
                    ? `${playerSymbols[state.winner]} Wins!` 
                    : "It's a Tie!" 
                  : gameStatus === 'init'
                    ? "Start the game"
                    : `Player ${playerSymbols[currentPlayer]}`
                }
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {gameStatus === 'init' ? (
              <Button 
                variant="default" 
                onClick={startGame}
                aria-label="Start game"
                className="hover-scale"
              >
                <Play className="h-4 w-4 mr-1" /> Start Game
              </Button>
            ) : gameStatus === 'playing' ? (
              <>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={pauseGame}
                  aria-label="Pause game"
                  className="hover-scale"
                >
                  <Pause className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={stopGame}
                  aria-label="Stop game"
                  className="hover-scale"
                >
                  <Square className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => restartGame()}
                  aria-label="Restart game"
                  className="hover-scale"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={gameStatus === 'paused' ? resumeGame : restartGame}
                  aria-label={gameStatus === 'paused' ? 'Resume game' : 'Restart game'}
                  className="hover-scale"
                >
                  {gameStatus === 'paused' ? <Play className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                </Button>
                {gameStatus === 'paused' && (
                  <>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={stopGame}
                      aria-label="Stop game"
                      className="hover-scale"
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => restartGame()}
                      aria-label="Restart game"
                      className="hover-scale"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="w-full">
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
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <Label htmlFor="bot-mode" className="text-sm font-medium cursor-pointer">
              Bot Mode
            </Label>
          </div>
          <Switch
            id="bot-mode"
            checked={botMode}
            onCheckedChange={toggleBotMode}
            aria-label="Toggle bot mode"
          />
        </div>
        
        {botMode && (
          <div className="bg-muted/50 p-2 rounded-md">
            <p className="text-xs text-muted-foreground">
              Bot will play as O. You play as X. {gameStatus === 'init' ? "Click Start Game to begin." : ""}
            </p>
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2 justify-center">
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
      </div>
    </div>
  );
};

export default GameControls;
