import React, { useState, useEffect } from 'react';
import { GameProvider, useGame } from '@/context/GameContext';
import { ThemeProvider } from '@/hooks/use-theme';
import GameBoard from '@/components/GameBoard';
import GameControls from '@/components/GameControls';
import GameModal from '@/components/GameModal';
import WelcomeModal from '@/components/WelcomeModal';
import SettingsDrawer from '@/components/SettingsDrawer';
import Confetti from '@/components/Confetti';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

// Game component that uses the context
const Game: React.FC = () => {
  const {
    state,
    resumeGame,
    restartGame
  } = useGame();
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);

  // Show/hide game over modal
  React.useEffect(() => {
    if (state.gameStatus === 'game-over' || state.gameStatus === 'paused') {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [state.gameStatus]);
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
    setShowRestartDialog(false);
    toast.success("Game restarted!");
  };

  // Show confirmation before restarting
  const handleRestartRequested = () => {
    setShowRestartDialog(true);
  };
  return <>
      <div className="flex flex-col lg:flex-row gap-4 w-full max-w-7xl mx-auto">
        {/* Left Column - Controls and Info */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <GameControls onOpenSettings={handleOpenSettings} onRestart={handleRestartRequested} />
          
          <div className="glass-card p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Game Instructions</h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>Win three mini-boards in a row to win the game</li>
              <li>Your move determines where your opponent must play next</li>
              <li>If sent to a completed board, you may play anywhere on the grid</li>
              <li>Watch the timer - if it runs out, you lose your turn</li>
              <li>Try different AI difficulty levels in bot mode</li>
              <li>The "Impossible" difficulty is extremely challenging</li>
              <li>Use the settings menu to customize your game experience</li>
            </ul>
          </div>
        </div>
        
        {/* Right Column - Game Board */}
        <div className="w-full lg:w-2/3">
          <GameBoard />
          
          <div className="flex justify-between items-center mt-4 p-2 rounded-md bg-muted/30">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${state.currentPlayer === 'X' ? 'bg-green-500' : 'bg-muted'}`}></div>
              <span>
                Player ({state.playerSymbols.X})
              </span>
            </div>
            <span className="text-xs text-muted-foreground">VS</span>
            <div className="flex items-center space-x-2">
              <span>
                {state.botMode ? 'Bot' : 'Player'} ({state.playerSymbols.O})
              </span>
              <div className={`w-3 h-3 rounded-full ${state.currentPlayer === 'O' ? 'bg-green-500' : 'bg-muted'}`}></div>
            </div>
          </div>
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
              Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestartConfirmed}>Restart</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
};

// Main Index component that provides the context
const Index: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    // Check if user has chosen not to show the welcome modal
    const hideWelcomeModal = localStorage.getItem('hideWelcomeModal');
    if (hideWelcomeModal !== 'true') {
      setShowWelcome(true);
    }
  }, []);
  return <ThemeProvider>
      <GameProvider>
        <div className="min-h-screen flex flex-col p-4 bg-background">
          <header className="text-center my-6">
            <h1 className="text-3xl md:text-4xl font-poppins font-bold mb-2 text-gradient">UltimateXO</h1>
            <p className="text-muted-foreground font-inter">Ultimate Strategy - Ultimate Challenge</p>
          </header>
          
          <main className="flex-grow">
            <Game />
          </main>
          
          <WelcomeModal open={showWelcome} onClose={() => setShowWelcome(false)} />
          
          <footer className="text-center py-4 mt-8 text-sm text-muted-foreground font-inter">
            <p>© 2025 Ultimate XO - A strategic tic-tac-toe game</p>
          </footer>
        </div>
      </GameProvider>
    </ThemeProvider>;
};
export default Index;