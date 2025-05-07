
import React, { useState, useEffect } from 'react';
import { GameProvider, useGame } from '@/context/GameContext';
import { ThemeProvider } from '@/hooks/use-theme';
import GameBoard from '@/components/GameBoard';
import GameControls from '@/components/GameControls';
import GameModal from '@/components/GameModal';
import WelcomeModal from '@/components/WelcomeModal';
import SettingsDrawer from '@/components/SettingsDrawer';
import Confetti from '@/components/Confetti';
import MultiplayerButton from '@/components/MultiplayerButton';
import { Button } from '@/components/ui/button';
import { Copy, Link, Users, Wifi, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import multiplayerService from '@/services/MultiplayerService';

// Game component that uses the context
const Game: React.FC = () => {
  const {
    state,
    resumeGame,
    restartGame,
    updateSettings
  } = useGame();
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  
  // Effect to handle multiplayer events and sync game state
  useEffect(() => {
    if (state.multiplayerMode) {
      const unsubscribe = multiplayerService.addListener((event) => {
        if (event.type === 'opponent-ready') {
          updateSettings({
            ...state,
            opponentReady: true
          });
          
          // If both players are ready and we're the host, initiate the game start
          if (state.playerReady && !state.gameStarted && state.isHost) {
            toast.success("Both players are ready! Starting game...");
            multiplayerService.startGame();
          }
        } else if (event.type === 'game-started') {
          // Game is starting with a synchronized timestamp
          toast.success("Game starting soon...");
        }
      });
      
      return () => unsubscribe();
    }
  }, [state, updateSettings]);
  
  useEffect(() => {
    if (state.gameStatus === 'game-over' || state.gameStatus === 'paused') {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [state.gameStatus]);
  
  // Listen for multiplayer restart event
  useEffect(() => {
    const unsubscribe = multiplayerService.addListener((event) => {
      if (event.type === 'opponent-restart') {
        // Opponent requested a restart
        restartGame();
        toast.info('Game restarted by opponent');
      }
    });
    
    return () => unsubscribe();
  }, [restartGame]);
  
  const handleCloseModal = () => {
    if (state.gameStatus === 'paused') {
      resumeGame();
    }
    setShowModal(false);
  };
  
  const handleOpenSettings = () => {
    setShowSettings(true);
  };
  
  // Force a complete game restart when confirmed
  const handleRestartConfirmed = () => {
    restartGame();
    
    // Reset ready states in multiplayer mode
    if (state.multiplayerMode) {
      updateSettings({
        ...state,
        playerReady: false,
        opponentReady: false,
        gameStarted: false
      });
      
      multiplayerService.restartGame();
    }
    
    setShowRestartDialog(false);
    toast.success("Game restarted!");
  };
  
  // Show confirmation before restarting
  const handleRestartRequested = () => {
    if (state.multiplayerMode && state.opponentName) {
      toast.info("Warning: Restarting will affect both players");
    }
    setShowRestartDialog(true);
  };
  
  const copyGameCode = () => {
    if (state.gameCode) {
      navigator.clipboard.writeText(state.gameCode);
      toast.success("Game code copied to clipboard!");
    }
  };
  
  return (
    <>
      <div className="flex flex-col lg:flex-row gap-4 w-full max-w-7xl mx-auto">
        {/* Left Column - Controls and Info */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <GameControls 
            onOpenSettings={handleOpenSettings}
            onRestart={handleRestartRequested}
          />
          
          <Tabs defaultValue="multiplayer" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="multiplayer">Multiplayer</TabsTrigger>
              <TabsTrigger value="instructions">Instructions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="multiplayer" className="space-y-4">
              {!state.multiplayerMode ? (
                <MultiplayerButton />
              ) : (
                <div className="glass-card p-4 rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Game Information</h3>
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={copyGameCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Game Code:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{state.gameCode}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Your Name:</span>
                      <span className="font-medium">{state.playerName || 'Player'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Opponent:</span>
                      {state.opponentName ? (
                        <span className="font-medium">{state.opponentName}</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full animate-pulse">
                          Waiting...
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Current Turn:</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${state.isMyTurn 
                        ? 'bg-green-500/20 text-green-600' 
                        : 'bg-yellow-500/20 text-yellow-600'}`}
                      >
                        {state.isMyTurn ? 'Your Turn' : 'Opponent\'s Turn'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Your Symbol:</span>
                      <span className="font-medium">
                        {state.isHost ? state.playerSymbols.X : state.playerSymbols.O}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Player Status:</span>
                      <div className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-600 flex items-center gap-1">
                        <Wifi className="h-3 w-3" />
                        <span>
                          {state.playerReady ? (state.opponentReady ? "Both Ready" : "You're Ready") : "Not Ready"}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    variant="outline" 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: 'Join my Ultimate XO game!',
                          text: `Join my game with code: ${state.gameCode}`,
                          url: window.location.href,
                        }).catch(() => {
                          copyGameCode();
                        });
                      } else {
                        copyGameCode();
                        toast.success("Game code copied! Send it to your friend to join.");
                      }
                    }}
                  >
                    <Link className="mr-2 h-4 w-4" />
                    Share Game Link
                  </Button>
                  
                  {state.waitingForSync && (
                    <div className="p-2 border border-blue-500/30 rounded-md bg-blue-500/10">
                      <div className="flex items-center gap-2 justify-center text-sm">
                        <Clock className="h-4 w-4 animate-pulse" />
                        <span>Synchronizing game start...</span>
                      </div>
                    </div>
                  )}
                  
                  {!state.playerReady && state.opponentName && !state.waitingForSync && (
                    <Button 
                      className="w-full" 
                      variant="default" 
                      onClick={() => {
                        multiplayerService.setReady();
                        updateSettings({
                          ...state,
                          playerReady: true
                        });
                        toast.success("You're ready to play!");
                        
                        // If both players are now ready and we're the host, start the game
                        if (state.opponentReady && state.isHost) {
                          multiplayerService.startGame();
                        }
                      }}
                    >
                      <Wifi className="mr-2 h-4 w-4" />
                      I'm Ready to Play
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="instructions" className="mt-0">
              <div className="glass-card p-4 rounded-lg">
                <h2 className="text-xl font-semibold mb-3">Game Instructions</h2>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Win three mini-boards in a row to win the game</li>
                  <li>Your move determines where your opponent must play next</li>
                  <li>If sent to a completed board, you may play anywhere on the grid</li>
                  <li>Watch the timer - if it runs out, you lose your turn</li>
                  <li>Try different AI difficulty levels in bot mode</li>
                  <li>Challenge friends on the same WiFi in multiplayer mode</li>
                  <li>Both players must click "Ready" before the game can start</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Right Column - Game Board */}
        <div className="w-full lg:w-2/3">
          <GameBoard />
          
          {state.multiplayerMode && (
            <div className="flex justify-between items-center mt-4 p-2 rounded-md bg-muted/30">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${state.currentPlayer === 'X' ? 'bg-green-500' : 'bg-muted'}`}></div>
                <span>
                  {state.isHost ? state.playerName || 'You' : state.opponentName || 'Opponent'} ({state.playerSymbols.X})
                </span>
              </div>
              <span className="text-xs text-muted-foreground">VS</span>
              <div className="flex items-center space-x-2">
                <span>
                  {!state.isHost ? state.playerName || 'You' : state.opponentName || 'Opponent'} ({state.playerSymbols.O})
                </span>
                <div className={`w-3 h-3 rounded-full ${state.currentPlayer === 'O' ? 'bg-green-500' : 'bg-muted'}`}></div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <GameModal open={showModal} onClose={handleCloseModal} />
      <SettingsDrawer open={showSettings} onClose={() => setShowSettings(false)} />
      <Confetti active={state.showConfetti} />
      
      {/* Restart Confirmation Dialog */}
      <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Game?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the current game. All progress will be lost. 
              {state.multiplayerMode && " This will affect both players."}
              Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestartConfirmed}>Restart</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Main Index component that provides the context
const Index: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  
  return (
    <ThemeProvider>
      <GameProvider>
        <div className="min-h-screen flex flex-col p-4 bg-background">
          <header className="text-center my-6">
            <h1 className="text-3xl md:text-4xl font-poppins font-bold mb-2 text-gradient">Ultimate XO</h1>
            <p className="text-muted-foreground font-inter">Challenge friends on the same WiFi network</p>
          </header>
          
          <main className="flex-grow">
            <Game />
          </main>
          
          <WelcomeModal open={showWelcome} onClose={() => setShowWelcome(false)} />
          
          <footer className="text-center py-4 mt-8 text-sm text-muted-foreground font-inter">
            <p>© 2025 Ultimate XO - A WiFi multiplayer strategy game</p>
          </footer>
        </div>
      </GameProvider>
    </ThemeProvider>
  );
};

export default Index;
