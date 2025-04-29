
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

const Game: React.FC = () => {
  const { state, resumeGame } = useGame();
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
      // Use the resumeGame function from context instead of calling dispatch directly
      resumeGame();
    }
    setShowModal(false);
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };
  
  return (
    <>
      <GameControls onOpenSettings={handleOpenSettings} />
      <div className="py-4 px-2">
        <GameBoard />
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
            <p className="text-muted-foreground font-inter">Ultimate Tic-Tac-Toe with a strategic twist</p>
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
