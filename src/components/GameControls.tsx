
import React, { useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Settings, 
  RotateCcw, 
  Play, 
  Pause, 
  Bot,
  RefreshCcw,
  Users,
  Wifi,
  WifiOff,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import multiplayerService from '@/services/MultiplayerService';

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
    updateSettings,
    restartGame
  } = useGame();
  
  // Listen for the opponent-ready event in multiplayer mode
  useEffect(() => {
    if (state.multiplayerMode) {
      console.log("Setting up opponent-ready listener");
      const unsubscribe = multiplayerService.addListener((event) => {
        console.log("Multiplayer event received in GameControls:", event);
        if (event.type === 'opponent-ready') {
          // Opponent is ready to play, update our state
          console.log("Opponent is ready to play!");
          updateSettings({
            ...state,
            opponentReady: true
          });
          
          // Check if we should start the game (both players ready and host)
          if (state.playerReady && state.isHost) {
            console.log("We're the host and both players ready - initiating start");
            multiplayerService.startGame();
          }
        }
      });
      
      return () => unsubscribe();
    }
  }, [state.multiplayerMode, updateSettings, state]);
  
  const handleStart = () => {
    console.log("Start button pressed. Game status:", state.gameStatus);
    if (state.gameStatus === 'init') {
      if (state.multiplayerMode) {
        console.log("In multiplayer mode. playerReady:", state.playerReady, "opponentReady:", state.opponentReady);
        // In multiplayer mode, mark ourselves as ready
        multiplayerService.setReady();
        
        // Update our local state
        updateSettings({
          ...state,
          playerReady: true
        });
        
        // Check if we can start the game (both players ready)
        if (state.opponentReady) {
          // Initiate a synchronized game start
          toast.success("Both players ready! Syncing game start...");
          if (state.isHost) {
            console.log("We're the host and both ready - starting game");
            multiplayerService.startGame();
          }
        } else {
          toast.info("Waiting for opponent to be ready...");
        }
      } else {
        // In single player mode, just start the game directly
        startGame();
      }
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
  
  const isDisabledStart = () => {
    if (state.gameStatus === 'game-over') {
      return !state.multiplayerMode;
    }
    
    if (state.multiplayerMode) {
      // In multiplayer mode, we need both the opponent to be connected and not already ready
      if (state.gameStatus === 'init') {
        // For init state, disable if opponent isn't connected or we're already marked as ready but opponent isn't
        return !state.opponentName || (state.playerReady && !state.opponentReady) || state.waitingForSync;
      }
      return false;
    }
    
    return false;
  };
  
  const getConnectionStatus = () => {
    if (!state.multiplayerMode) return null;
    
    if (!state.opponentName) {
      return (
        <Badge variant="outline" className="text-xs animate-pulse">
          <WifiOff className="h-3 w-3 mr-1 text-red-500" />
          Waiting for opponent...
        </Badge>
      );
    }
    
    if (state.playerReady && state.opponentReady) {
      return (
        <Badge variant="default" className="text-xs bg-green-500">
          <Wifi className="h-3 w-3 mr-1" />
          Both players ready
        </Badge>
      );
    }
    
    if (state.playerReady) {
      return (
        <Badge variant="outline" className="text-xs">
          <Wifi className="h-3 w-3 mr-1 text-yellow-500" />
          Waiting for opponent...
        </Badge>
      );
    }
    
    return (
      <Badge variant="default" className="text-xs bg-green-500/50">
        <Wifi className="h-3 w-3 mr-1" />
        Connected
      </Badge>
    );
  };
  
  const getActionButtonContent = () => {
    if (state.waitingForSync) {
      return (
        <>
          <Clock className="mr-2 h-4 w-4 animate-pulse" />
          Syncing game start...
        </>
      );
    }
    
    if (state.gameStatus === 'init') {
      if (state.multiplayerMode && state.playerReady && !state.opponentReady) {
        return (
          <>
            <Wifi className="mr-2 h-4 w-4 animate-pulse" />
            Waiting for opponent
          </>
        );
      }
      
      return (
        <>
          <Play className="mr-2 h-4 w-4" />
          {state.multiplayerMode ? (state.playerReady ? "Waiting..." : "Ready to Play") : "Start Game"}
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
            disabled={isDisabledStart() || state.waitingForSync}
            className={`w-full ${state.waitingForSync ? 'animate-pulse' : ''}`}
          >
            {getActionButtonContent()}
          </Button>
          <Button 
            onClick={handleRestart} 
            variant="outline" 
            className="w-full"
            disabled={state.gameStatus === 'init' || state.waitingForSync}
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
              disabled={state.multiplayerMode}
            />
            <label htmlFor="bot-mode-control" className="text-sm font-medium cursor-pointer">Bot Mode</label>
          </div>
          {state.multiplayerMode ? (
            getConnectionStatus()
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
          <span className={`flex h-3 w-3 rounded-full ${
            state.isMyTurn && state.multiplayerMode 
              ? 'bg-green-500 animate-pulse' 
              : state.currentPlayer === 'X' 
                ? 'bg-blue-500' 
                : 'bg-amber-500'
          }`}></span>
          <span>
            {state.multiplayerMode
              ? state.isMyTurn 
                ? "Your turn" 
                : "Opponent's turn"
              : `${state.playerSymbols[state.currentPlayer]}'s turn`}
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
