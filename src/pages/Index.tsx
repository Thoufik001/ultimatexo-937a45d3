
import React, { useState, useEffect } from 'react';
import { GameProvider } from '@/context/GameContext';
import { ThemeProvider } from '@/hooks/use-theme';
import GameBoard from '@/components/GameBoard';
import GameControls from '@/components/GameControls';
import GameModal from '@/components/GameModal';
import WelcomeModal from '@/components/WelcomeModal';
import SettingsDrawer from '@/components/SettingsDrawer';
import Confetti from '@/components/Confetti';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { toast } from 'sonner';

const Game: React.FC = () => {
  const {
    state,
    resumeGame
  } = useGame();
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  useEffect(() => {
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
  
  const handleMultiplayerClick = () => {
    setShowSettings(true);
  };
  
  return (
    <>
      <div className="flex flex-col lg:flex-row gap-4 w-full max-w-7xl mx-auto">
        {/* Left Column - Controls and Info */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <GameControls onOpenSettings={handleOpenSettings} />
          
          <Button 
            className="w-full glass-card group" 
            variant="outline" 
            onClick={handleMultiplayerClick}
          >
            <Users className="mr-2 h-5 w-5 text-primary group-hover:animate-pulse" />
            <span>{state.multiplayerMode ? 'Multiplayer Mode Active' : 'Play Online Multiplayer'}</span>
          </Button>
          
          {state.multiplayerMode && state.gameCode && (
            <div className="glass-card p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Game Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Game Code:</span>
                  <span className="font-mono font-medium">{state.gameCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Your Name:</span>
                  <span className="font-medium">{state.playerName || 'Player'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                    {state.opponentName ? 'Connected' : 'Waiting for opponent...'}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <div className="glass-card p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Game Instructions</h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>Win three mini-boards in a row to win the game</li>
              <li>Your move determines where your opponent must play next</li>
              <li>If sent to a completed board, you may play anywhere on the grid</li>
              <li>Watch the timer - if it runs out, you lose your turn</li>
              <li>Try different AI difficulty levels in bot mode</li>
            </ul>
          </div>
        </div>
        
        {/* Right Column - Game Board */}
        <div className="w-full lg:w-2/3">
          <GameBoard />
          
          {state.multiplayerMode && (
            <div className="flex justify-between items-center mt-4 p-2 rounded-md bg-muted/30">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${state.currentPlayer === 'X' ? 'bg-green-500' : 'bg-muted'}`}></div>
                <span>{state.playerName || 'You'} ({state.playerSymbols.X})</span>
              </div>
              <span className="text-xs text-muted-foreground">VS</span>
              <div className="flex items-center space-x-2">
                <span>{state.opponentName || 'Opponent'} ({state.playerSymbols.O})</span>
                <div className={`w-3 h-3 rounded-full ${state.currentPlayer === 'O' ? 'bg-green-500' : 'bg-muted'}`}></div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <GameModal open={showModal} onClose={handleCloseModal} />
      <SettingsDrawer open={showSettings} onClose={() => setShowSettings(false)} />
      <Confetti active={state.showConfetti} />
    </>
  );
};

const Index: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  
  return (
    <ThemeProvider>
      <GameProvider>
        <div className="min-h-screen flex flex-col p-4 bg-background">
          <header className="text-center my-6">
            <h1 className="text-3xl md:text-4xl font-poppins font-bold mb-2 text-gradient">Ultimate XO</h1>
            <p className="text-muted-foreground font-inter">Classic Tic-Tac-Toe with a strategic twist</p>
          </header>
          
          <main className="flex-grow">
            <Game />
          </main>
          
          <WelcomeModal open={showWelcome} onClose={() => setShowWelcome(false)} />
          
          <footer className="text-center py-4 mt-8 text-sm text-muted-foreground font-inter">
            <p>© 2025 Ultimate XO - A strategic board game</p>
          </footer>
        </div>
      </GameProvider>
    </ThemeProvider>
  );
};

export default Index;
