
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Users, RefreshCcw, Copy, Share2, Wifi, MessageCircle } from 'lucide-react';
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
  const { state, updateSettings } = useGame();
  const [showDialog, setShowDialog] = useState(false);
  const [gameCode, setGameCode] = useState('');
  const [playerName, setPlayerName] = useState(state.playerName || localStorage.getItem('playerName') || '');
  const [isJoining, setIsJoining] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
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
        turnTimeLimit: state.turnTimeLimit,
        timerEnabled: true, // Enable timer for multiplayer
        playerSymbols: state.playerSymbols,
        botMode: false,
        difficulty: state.difficulty
      });
      
      localStorage.setItem('playerName', playerName);
      multiplayerService.createGame(playerName);
      setShowDialog(false);
      toast.success("Creating new multiplayer game...");
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
        turnTimeLimit: state.turnTimeLimit,
        timerEnabled: true, // Enable timer for multiplayer
        playerSymbols: state.playerSymbols,
        botMode: false,
        difficulty: state.difficulty
      });
      
      localStorage.setItem('playerName', playerName);
      multiplayerService.joinGame(gameCode.toUpperCase().trim(), playerName);
      setShowDialog(false);
      toast.success("Joining game...");
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
  
  return (
    <>
      <Button 
        className="w-full glass-card group" 
        variant="outline" 
        onClick={handleMultiplayerClick}
        disabled={isConnecting}
      >
        <Users className="mr-2 h-5 w-5 text-primary group-hover:animate-pulse" />
        <span>{state.multiplayerMode ? 'Multiplayer Mode Active' : 'Play Same-WiFi Multiplayer'}</span>
        {!state.multiplayerMode && (
          <span className={`ml-auto rounded-full w-2 h-2 bg-green-500 animate-pulse`}></span>
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
