
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, RefreshCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGame } from '@/context/GameContext';
import multiplayerService from '@/services/MultiplayerService';
import { toast } from 'sonner';

const MultiplayerButton: React.FC = () => {
  const { state, updateSettings } = useGame();
  const [showDialog, setShowDialog] = useState(false);
  const [gameCode, setGameCode] = useState('');
  const [playerName, setPlayerName] = useState(state.playerName || localStorage.getItem('playerName') || '');
  const [isJoining, setIsJoining] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Automatically connect to multiplayer service when component mounts
  React.useEffect(() => {
    multiplayerService.connect().catch(() => {
      // Connection error is handled by the service
    });
  }, []);

  const handleMultiplayerClick = () => {
    if (state.multiplayerMode) {
      toast.info("You're already in multiplayer mode");
      return;
    }
    setShowDialog(true);
  };

  const handleCreateGame = async () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    
    setIsConnecting(true);
    
    try {
      // Ensure connection before creating game
      await multiplayerService.connect();
      
      updateSettings({
        ...state,
        playerName,
        multiplayerMode: true,
        turnTimeLimit: state.turnTimeLimit,
        timerEnabled: state.timerEnabled,
        playerSymbols: state.playerSymbols,
        botMode: false,
        difficulty: state.difficulty
      });
      
      localStorage.setItem('playerName', playerName);
      multiplayerService.createGame(playerName);
      setShowDialog(false);
      toast.success("Creating new game... Waiting for opponent to join");
    } catch (error) {
      toast.error("Connection error. Using fallback mode.");
    } finally {
      setIsConnecting(false);
    }
  };
  
  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    
    if (!gameCode.trim() || gameCode.length < 4) {
      toast.error("Please enter a valid game code");
      return;
    }
    
    setIsConnecting(true);
    
    try {
      // Ensure connection before joining game
      await multiplayerService.connect();
      
      updateSettings({
        ...state,
        playerName,
        multiplayerMode: true,
        turnTimeLimit: state.turnTimeLimit,
        timerEnabled: state.timerEnabled,
        playerSymbols: state.playerSymbols,
        botMode: false,
        difficulty: state.difficulty
      });
      
      localStorage.setItem('playerName', playerName);
      multiplayerService.joinGame(gameCode.toUpperCase().trim(), playerName);
      setShowDialog(false);
      toast.success("Joining game...");
    } catch (error) {
      toast.error("Connection error. Using fallback mode.");
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Function to retry connection
  const handleRetryConnection = async () => {
    toast.info("Reconnecting to multiplayer server...");
    
    try {
      await multiplayerService.connect();
      toast.success("Connection established!");
    } catch (error) {
      toast.error("Connection failed. Please try again later.");
    }
  };

  return (
    <>
      <Button 
        className="w-full glass-card group" 
        variant="outline" 
        onClick={handleMultiplayerClick}
      >
        <Users className="mr-2 h-5 w-5 text-primary group-hover:animate-pulse" />
        <span>{state.multiplayerMode ? 'Multiplayer Mode Active' : 'Play Online Multiplayer'}</span>
      </Button>
      
      {state.multiplayerMode && state.gameCode && !state.opponentName && (
        <Button 
          className="w-full mt-2" 
          variant="secondary"
          onClick={handleRetryConnection}
        >
          <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
          Reconnect to Server
        </Button>
      )}
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Multiplayer Game</DialogTitle>
            <DialogDescription>
              Play against a friend online in real-time.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="player-name">Your Name</Label>
              <Input
                id="player-name"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                autoFocus
              />
            </div>
            
            {isJoining && (
              <div className="space-y-2">
                <Label htmlFor="game-code">Game Code</Label>
                <Input
                  id="game-code"
                  placeholder="Enter game code"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  className="font-mono uppercase"
                  maxLength={6}
                />
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              {isJoining ? (
                <>
                  <Button 
                    onClick={handleJoinGame} 
                    className="flex-1"
                    disabled={isConnecting}
                  >
                    {isConnecting ? 'Connecting...' : 'Join Game'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsJoining(false)} 
                    className="flex-1"
                    disabled={isConnecting}
                  >
                    Back
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleCreateGame} 
                    className="flex-1"
                    disabled={isConnecting}
                  >
                    {isConnecting ? 'Connecting...' : 'Create New Game'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsJoining(true)} 
                    className="flex-1"
                    disabled={isConnecting}
                  >
                    Join Existing
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MultiplayerButton;
