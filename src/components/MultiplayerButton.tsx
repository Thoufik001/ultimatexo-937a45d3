
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
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

  const handleMultiplayerClick = () => {
    if (state.multiplayerMode) {
      toast.info("You're already in multiplayer mode");
      return;
    }
    setShowDialog(true);
  };

  const handleCreateGame = () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    
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
    
    multiplayerService.createGame(playerName);
    setShowDialog(false);
    toast.info("Creating game...");
  };
  
  const handleJoinGame = () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    
    if (!gameCode.trim() || gameCode.length < 4) {
      toast.error("Please enter a valid game code");
      return;
    }
    
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
    
    multiplayerService.joinGame(gameCode, playerName);
    setShowDialog(false);
    toast.info("Joining game...");
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
                />
              </div>
            )}
            
            <div className="flex gap-2 pt-2">
              {isJoining ? (
                <>
                  <Button onClick={handleJoinGame} className="flex-1">
                    Join Game
                  </Button>
                  <Button variant="outline" onClick={() => setIsJoining(false)} className="flex-1">
                    Back
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={handleCreateGame} className="flex-1">
                    Create New Game
                  </Button>
                  <Button variant="outline" onClick={() => setIsJoining(true)} className="flex-1">
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
