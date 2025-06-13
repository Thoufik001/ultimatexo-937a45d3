
import React from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Settings, 
  RotateCcw, 
  Play, 
  Pause, 
  RefreshCcw
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface GameControlsProps {
  onOpenSettings: () => void;
  onRestart: () => void;
}

const GameControls: React.FC<GameControlsProps> = ({ onOpenSettings, onRestart }) => {
  const { 
    state, 
    startGame, 
    pauseGame, 
    resumeGame, 
    toggleBotMode,
    restartGame
  } = useGame();
  
  const handleStart = () => {
    if (state.gameStatus === 'init') {
      startGame();
    } else if (state.gameStatus === 'paused') {
      resumeGame();
    } else if (state.gameStatus === 'playing') {
      pauseGame();
    }
  };
  
  // Make sure we use restartGame from context to properly reset everything
  const handleRestart = () => {
    restartGame();
    onRestart();
    toast.success("Game restarted!");
  };
  
  const toggleBot = () => {
    toggleBotMode();
  };
  
  const getActionButtonContent = () => {
    if (state.gameStatus === 'init') {
      return (
        <>
          <Play className="mr-2 h-4 w-4" />
          Start Game
        </>
      );
    } else if (state.gameStatus === 'paused') {
      return (
        <>
          <Play className="mr-2 h-4 w-4" />
          Resume Game
        </>
      );
    } else if (state.gameStatus === 'game-over') {
      return (
        <>
          <RefreshCcw className="mr-2 h-4 w-4" />
          New Game
        </>
      );
    } else {
      // Playing
      return (
        <>
          <Pause className="mr-2 h-4 w-4" />
          Pause Game
        </>
      );
    }
  };
  
  return (
    <div className="glass-card p-4 rounded-lg space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Game Controls</h2>
        {state.gameStatus === 'playing' && state.turnTimeRemaining !== null && state.timerEnabled && (
          <div className="w-16 h-16 flex items-center justify-center rounded-full border-2">
            <span className={`text-xl font-medium ${state.turnTimeRemaining <= 5 ? 'text-red-500 animate-pulse' : ''}`}>
              {state.turnTimeRemaining}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={handleStart} 
            className="w-full"
          >
            {getActionButtonContent()}
          </Button>
          <Button 
            onClick={handleRestart} 
            variant="outline" 
            className="w-full"
            disabled={state.gameStatus === 'init'}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart
          </Button>
        </div>
        
        <Button onClick={onOpenSettings} variant="outline" className="w-full">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>
      
      <div className="pt-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center space-x-2">
            <Switch 
              id="bot-mode-control"
              checked={state.botMode} 
              onCheckedChange={toggleBot}
            />
            <label htmlFor="bot-mode-control" className="text-sm font-medium cursor-pointer">Bot Mode</label>
          </div>
          <Badge variant={state.botMode ? "default" : "outline"} className="text-xs">
            {state.botMode ? "vs Bot" : "Player vs Player"}
          </Badge>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-sm pt-2">
        <div className="flex items-center gap-1">
          <span className={`flex h-3 w-3 rounded-full ${
            state.currentPlayer === 'X' 
              ? 'bg-blue-500' 
              : 'bg-amber-500'
          }`}></span>
          <span>
            {`${state.playerSymbols[state.currentPlayer]}'s turn`}
          </span>
        </div>
        <div className="text-muted-foreground">
          {state.gameStatus === 'playing' && (
            <div className="flex items-center gap-1">
              <ArrowRight className="h-3 w-3" />
              {state.nextBoardIndex !== null ? (
                <span>Board {state.nextBoardIndex + 1}</span>
              ) : (
                <span>Any Board</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameControls;
