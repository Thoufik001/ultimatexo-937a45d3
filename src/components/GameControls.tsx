import React from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Settings, 
  RotateCcw, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Bot,
  RefreshCcw
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface GameControlsProps {
  onOpenSettings: () => void;
  onRestart: () => void; // Changed from optional to required
}

const GameControls: React.FC<GameControlsProps> = ({ onOpenSettings, onRestart }) => {
  const { 
    state, 
    startGame, 
    pauseGame, 
    resumeGame, 
    toggleSound,
    toggleBotMode,
    updateSettings
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
  
  // Always use the passed onRestart prop to ensure proper state reset
  const handleRestart = () => {
    onRestart();
  };
  
  const toggleBot = () => {
    if (state.multiplayerMode) {
      toast("Bot mode is not available in multiplayer");
      return;
    }
    toggleBotMode();
  };
  
  const handleDifficultyChange = (value: 'easy' | 'medium' | 'hard') => {
    updateSettings({
      ...state,
      difficulty: value,
      turnTimeLimit: state.turnTimeLimit,
      timerEnabled: state.timerEnabled,
      playerSymbols: state.playerSymbols,
      botMode: state.botMode
    });
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
            disabled={state.gameStatus === 'game-over' || (state.multiplayerMode && !state.opponentName)}
            className="w-full"
          >
            {getActionButtonContent()}
          </Button>
          <Button onClick={handleRestart} variant="outline" className="w-full">
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={toggleSound} variant="outline" className="w-full">
            {state.isMuted ? (
              <>
                <VolumeX className="mr-2 h-4 w-4" />
                Unmute
              </>
            ) : (
              <>
                <Volume2 className="mr-2 h-4 w-4" />
                Mute
              </>
            )}
          </Button>
          <Button onClick={onOpenSettings} variant="outline" className="w-full">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>
      
      <div className="pt-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center space-x-2">
            <Switch 
              id="bot-mode-control"
              checked={state.botMode} 
              onCheckedChange={toggleBot}
              disabled={state.multiplayerMode}
            />
            <label htmlFor="bot-mode-control" className="text-sm font-medium cursor-pointer">Bot Mode</label>
          </div>
          {state.multiplayerMode ? (
            <Badge variant="outline" className="text-xs">
              Multiplayer Active
            </Badge>
          ) : (
            <Badge variant={state.botMode ? "default" : "outline"} className="text-xs">
              {state.botMode ? `Bot: ${state.difficulty}` : "Player vs Player"}
            </Badge>
          )}
        </div>
        
        {state.botMode && !state.multiplayerMode && (
          <div className="pt-1">
            <Select 
              value={state.difficulty} 
              onValueChange={handleDifficultyChange}
            >
              <SelectTrigger className="w-full">
                <div className="flex items-center">
                  <Bot className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Select difficulty" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy (Random)</SelectItem>
                <SelectItem value="medium">Medium (Basic Strategy)</SelectItem>
                <SelectItem value="hard">Hard (Advanced Strategy)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center text-sm pt-2">
        <div className="flex items-center gap-1">
          <span className="flex h-3 w-3 rounded-full bg-green-500"></span>
          <span>{state.playerSymbols[state.currentPlayer]}'s turn</span>
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
