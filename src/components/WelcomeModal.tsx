
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useGame } from '@/context/GameContext';
import { Scroll } from 'lucide-react';

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ open, onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  
  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('ultimateXO_hideWelcome', 'true');
    }
    onClose();
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg glass-modal">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-poppins flex justify-center items-center gap-2">
            <Scroll className="h-6 w-6" /> Welcome to Ultimate XO
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          <DialogDescription className="text-center text-lg mb-4">
            A strategic twist on classic Tic-Tac-Toe
          </DialogDescription>
          
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">How to Play:</h3>
            
            <div className="space-y-2 text-sm">
              <p className="font-medium">1. The Big Picture</p>
              <p>Ultimate XO consists of 9 mini Tic-Tac-Toe boards arranged in a 3×3 grid.</p>
              
              <p className="font-medium mt-3">2. Your First Move</p>
              <p>The first player can place their mark in any cell on any mini-board.</p>
              
              <p className="font-medium mt-3">3. Sending Your Opponent</p>
              <p>Here's the twist: The cell you choose determines which mini-board your opponent must play in next.</p>
              <p>Example: If you place your mark in the top-right cell of any mini-board, your opponent must play in the top-right mini-board.</p>
              
              <p className="font-medium mt-3">4. Winning Mini-Boards</p>
              <p>Win a mini-board by getting three of your marks in a row (horizontally, vertically, or diagonally).</p>
              
              <p className="font-medium mt-3">5. Winning the Game</p>
              <p>Win the entire game by winning three mini-boards in a row!</p>
              
              <p className="font-medium mt-3">6. When a Board is Full</p>
              <p>If you're sent to a mini-board that's already won or full, you can place your mark in any available cell on any mini-board.</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox 
            id="dontShowAgain" 
            checked={dontShowAgain} 
            onCheckedChange={(checked) => setDontShowAgain(checked === true)}
          />
          <label
            htmlFor="dontShowAgain"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Don't show this again
          </label>
        </div>
        
        <DialogFooter className="flex sm:justify-between gap-3">
          <Button variant="outline" onClick={handleClose} className="w-full">
            Skip
          </Button>
          <Button onClick={handleClose} className="w-full">
            Let's Play!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeModal;
