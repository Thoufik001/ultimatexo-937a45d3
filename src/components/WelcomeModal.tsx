
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Scroll } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ open, onClose }) => {
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  
  const handleClose = () => {
    if (doNotShowAgain) {
      localStorage.setItem('hideWelcomeModal', 'true');
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
          <DialogDescription className="text-center text-lg mb-2">
            A strategic twist on classic Tic-Tac-Toe
          </DialogDescription>
          
          <div className="space-y-3">
            <h3 className="text-xl font-semibold mb-2">How to Play:</h3>
            
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">1. The Board:</span> 9 mini Tic-Tac-Toe boards arranged in a 3×3 grid.</p>
              
              <p><span className="font-medium">2. Special Rule:</span> Your move determines which mini-board your opponent must play in next.</p>
              
              <p><span className="font-medium">3. Mini-Board Wins:</span> Get three marks in a row within a mini-board.</p>
              
              <p><span className="font-medium">4. Game Win:</span> Win three mini-boards in a row to win the game!</p>
              
              <p><span className="font-medium">5. Free Choice:</span> If sent to a completed board, you may play anywhere.</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 mt-2">
          <Checkbox 
            id="doNotShowAgain" 
            checked={doNotShowAgain} 
            onCheckedChange={(checked) => setDoNotShowAgain(checked as boolean)}
          />
          <label 
            htmlFor="doNotShowAgain" 
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
