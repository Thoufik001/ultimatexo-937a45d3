import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Users, RefreshCcw, Copy, Share2, Wifi, WifiOff, Clock } from 'lucide-react';
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
import { Badge } from "@/components/ui/badge";

const MultiplayerButton: React.FC = () => {
  const { state, updateSettings, syncStartMultiplayer, setWaitingForSync } = useGame();
  const [showDialog, setShowDialog] = useState(false);
  const [gameCode, setGameCode] = useState('');
  const [playerName, setPlayerName] = useState(state.playerName || localStorage.getItem('playerName') || '');
  const [isJoining, setIsJoining] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Handle connection status updates
  useEffect(() => {
    if (state.multiplayerMode) {
      const handleMultiplayerEvents = (event: any) => {
        if (event.type === 'opponent-ready') {
          updateSettings({
            ...state,
            opponentReady: true
          });
          
          toast.success("Opponent is ready to play!");
          
          // If both players are ready and I'm the host, initiate game start
          if (state.playerReady && state.isHost) {
            console.log("Both players ready, host initiating game start");
            setTimeout(() => {
              multiplayerService.startGame();
            }, 1000);
          }
        } else if (event.type === 'game-started') {
          // Handle synchronized game start
          console.log("Received game-started event with timestamp:", event.timestamp);
          syncStartMultiplayer(event.timestamp);
          setWaitingForSync(true);
          toast.success("Game is starting! Synchronizing...");
        }
      };
      
      const unsubscribe = multiplayerService.addListener(handleMultiplayerEvents);
      
      return () => unsubscribe();
    }
  }, [state, updateSettings, syncStartMultiplayer, setWaitingForSync]);
  
  // Listen for opponent joined event
  useEffect(() => {
    const handleOpponentJoined = (event: any) => {
      if (event.type === 'opponent-joined') {
        toast.success(`${event.opponentName} joined the game!`);
      }
    };
    
    const unsubscribe = multiplayerService.addListener(handleOpponentJoined);
    
    return () => unsubscribe();
  }, []);
  
  // Auto-select text when focused
  const handleCodeFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

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
    
    try {
      updateSettings({
        ...state,
        playerName,
        multiplayerMode: true,
        turnTimeLimit: 30, // Set a reasonable time limit for multiplayer
        timerEnabled: true, // Enable timer for multiplayer
        playerSymbols: state.playerSymbols,
        botMode: false,
        difficulty: state.difficulty,
        playerReady: false,
        opponentReady: false,
        waitingForSync: false
      });
      
      localStorage.setItem('playerName', playerName);
      multiplayerService.createGame(playerName);
      setShowDialog(false);
    } catch (error) {
      toast.error("There was an error creating the game");
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
      updateSettings({
        ...state,
        playerName,
        multiplayerMode: true,
        turnTimeLimit: 30, // Set a reasonable time limit for multiplayer
        timerEnabled: true, // Enable timer for multiplayer
        playerSymbols: state.playerSymbols,
        botMode: false,
        difficulty: state.difficulty,
        playerReady: false,
        opponentReady: false
      });
      
      localStorage.setItem('playerName', playerName);
      multiplayerService.joinGame(gameCode.toUpperCase().trim(), playerName);
      setShowDialog(false);
    } catch (error) {
      toast.error("There was an error joining the game");
    } finally {
      setIsConnecting(false);
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
  
  const handleReadyClick = () => {
    if (state.playerReady) {
      toast.info("You're already marked as ready");
      return;
    }
    
    if (!state.opponentName) {
      toast.error("Waiting for an opponent to join");
      return;
    }
    
    // Mark as ready
    multiplayerService.setReady();
    
    // Update local state
    updateSettings({
      ...state,
      playerReady: true
    });
    
    toast.success("You are ready to play! Waiting for opponent...");
    
    // If both players are ready, host should initiate the synchronized game start
    if (state.opponentReady && state.isHost) {
      console.log("Both players ready, initiating game start");
      multiplayerService.startGame();
    }
  };
  
  return (
    <>
      <Button 
        className="w-full glass-card group" 
        variant="outline" 
        onClick={handleMultiplayerClick}
        disabled={isConnecting || state.waitingForSync}
      >
        {state.waitingForSync ? (
          <>
            <Clock className="mr-2 h-5 w-5 text-primary animate-pulse" />
            <span>Synchronizing Game Start...</span>
          </>
        ) : (
          <>
            <Users className="mr-2 h-5 w-5 text-primary group-hover:animate-pulse" />
            <span>{state.multiplayerMode ? 'Multiplayer Mode Active' : 'Play Same-WiFi Multiplayer'}</span>
            {!state.multiplayerMode && (
              <span className={`ml-auto rounded-full w-2 h-2 bg-green-500 animate-pulse`}></span>
            )}
          </>
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
          
          {state.opponentName && !state.playerReady && (
            <Button
              className="flex-1"
              variant="default"
              onClick={handleReadyClick}
              disabled={state.playerReady}
            >
              <Wifi className="mr-2 h-4 w-4" />
              Ready to Play
            </Button>
          )}
        </div>
      )}
      
      {state.multiplayerMode && state.gameCode && (
        <div className="mt-2 p-2 border rounded-md bg-muted/20">
          <div className="flex justify-between items-center">
            <div className="text-sm font-mono">
              Game Code: <Badge variant="outline">{state.gameCode}</Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2"
              onClick={() => {
                navigator.clipboard.writeText(state.gameCode);
                toast.success("Game code copied!");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          <div className="mt-2 flex items-center justify-between text-xs">
            <span>Connection Status:</span>
            {!state.opponentName ? (
              <Badge variant="outline" className="animate-pulse">
                <WifiOff className="h-3 w-3 mr-1 text-yellow-500" />
                Waiting for player...
              </Badge>
            ) : (
              <Badge variant={state.playerReady && state.opponentReady ? "default" : "outline"} 
                className={state.playerReady && state.opponentReady ? "bg-green-500" : ""}>
                <Wifi className="h-3 w-3 mr-1" />
                {state.playerReady && state.opponentReady ? "Both Ready" : 
                  state.playerReady ? "Waiting for opponent" : "Not Ready"}
              </Badge>
            )}
          </div>
        </div>
      )}
      
      {state.multiplayerMode && state.gameStatus === 'init' && state.opponentName && !state.playerReady && (
        <div className="mt-2 p-2 border border-green-500/30 rounded-md bg-green-500/10">
          <div className="text-sm text-center">
            Click <strong>Ready to Play</strong> when you're ready to start the game
          </div>
        </div>
      )}
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Same-WiFi Multiplayer</DialogTitle>
            <DialogDescription>
              Play against a friend on the same WiFi network. Just share the game code!
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
                  onFocus={handleCodeFocus}
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
                    {isConnecting ? 'Creating...' : 'Create New Game'}
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
              <div className="flex items-center justify-center gap-2">
                <Wifi className="h-4 w-4 text-green-500" />
                <span>Ready for same-WiFi multiplayer</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MultiplayerButton;
