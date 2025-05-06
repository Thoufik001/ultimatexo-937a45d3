
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Users, RefreshCcw, Copy, Share2, Wifi, WifiOff } from 'lucide-react';
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
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Automatically connect to multiplayer service when component mounts
  React.useEffect(() => {
    const checkConnection = async () => {
      setConnectionStatus('connecting');
      try {
        await multiplayerService.connect();
        setConnectionStatus('connected');
      } catch (error) {
        setConnectionStatus('disconnected');
      }
    };
    
    checkConnection();
    
    // Recheck connection every minute
    const intervalId = setInterval(checkConnection, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleMultiplayerClick = () => {
    if (state.multiplayerMode) {
      toast.info("You're already in multiplayer mode");
      return;
    }
    
    // Check if we're already in a game
    if (state.gameStatus === 'playing') {
      toast.info("Finish or restart your current game before starting multiplayer");
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
    setConnectionStatus('connecting');
    
    try {
      // Ensure connection before creating game
      await multiplayerService.connect();
      setConnectionStatus('connected');
      
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
      toast.success("Creating new multiplayer game...");
    } catch (error) {
      setConnectionStatus('disconnected');
      toast.error("Connection error. Using local multiplayer mode instead.");
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
    setConnectionStatus('connecting');
    
    try {
      // Ensure connection before joining game
      await multiplayerService.connect();
      setConnectionStatus('connected');
      
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
      setConnectionStatus('disconnected');
      toast.error("Connection error. Using local multiplayer mode instead.");
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Function to retry connection
  const handleRetryConnection = async () => {
    toast.info("Reconnecting to multiplayer server...");
    setConnectionStatus('connecting');
    
    try {
      await multiplayerService.connect();
      setConnectionStatus('connected');
      toast.success("Connection established!");
    } catch (error) {
      setConnectionStatus('disconnected');
      toast.error("Connection failed. Please try again later.");
    }
  };
  
  const handleShareGame = () => {
    if (state.gameCode) {
      // Try to use the Web Share API if available
      if (navigator.share) {
        navigator.share({
          title: 'Join my Ultimate XO game!',
          text: `Join my game with code: ${state.gameCode}`,
          url: window.location.href,
        }).catch(() => {
          navigator.clipboard.writeText(state.gameCode);
          toast.success("Game code copied to clipboard!");
        });
      } else {
        navigator.clipboard.writeText(state.gameCode);
        toast.success("Game code copied! Share it with your friend to join.");
      }
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
        {!state.multiplayerMode && connectionStatus !== 'disconnected' && (
          <span className={`ml-auto rounded-full w-2 h-2 ${
            connectionStatus === 'connected' ? 'bg-green-500' : 'bg-amber-500 animate-pulse'
          }`}></span>
        )}
      </Button>
      
      {state.multiplayerMode && (
        <div className="flex gap-2 mt-2 w-full">
          <Button 
            className="flex-1" 
            variant="outline"
            onClick={handleShareGame}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share Game
          </Button>
          
          {(!state.opponentName || connectionStatus === 'disconnected') && (
            <Button 
              className="flex-1" 
              variant="secondary"
              onClick={handleRetryConnection}
            >
              {connectionStatus === 'connecting' ? (
                <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
              ) : connectionStatus === 'connected' ? (
                <Wifi className="mr-2 h-4 w-4" />
              ) : (
                <WifiOff className="mr-2 h-4 w-4" />
              )}
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Reconnect'}
            </Button>
          )}
        </div>
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
            
            <div className="text-center text-sm text-muted-foreground">
              {connectionStatus === 'connected' ? (
                <div className="flex items-center justify-center gap-2">
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span>Connected to game server</span>
                </div>
              ) : connectionStatus === 'connecting' ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCcw className="h-4 w-4 animate-spin text-amber-500" />
                  <span>Connecting to server...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span>Not connected (will use local mode)</span>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MultiplayerButton;
