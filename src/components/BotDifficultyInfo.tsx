
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from "@/components/ui/badge";
import { useGame } from '@/context/GameContext';

const BotDifficultyInfo: React.FC = () => {
  const { state, updateSettings } = useGame();
  const [showDialog, setShowDialog] = React.useState(false);
  
  const handleSetDifficulty = (difficulty: 'easy' | 'medium' | 'hard' | 'impossible') => {
    updateSettings({
      ...state,
      difficulty,
      turnTimeLimit: state.turnTimeLimit,
      timerEnabled: state.timerEnabled,
      playerSymbols: state.playerSymbols,
      botMode: true
    });
    setShowDialog(false);
  };
  
  return (
    <>
      <Button 
        className="w-full glass-card group" 
        variant="outline" 
        onClick={() => setShowDialog(true)}
      >
        <Bot className="mr-2 h-5 w-5 text-primary group-hover:animate-pulse" />
        <span>Challenge the AI Opponents</span>
        <span className="ml-auto rounded-full w-2 h-2 bg-green-500 animate-pulse"></span>
      </Button>
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bot Difficulty Levels</DialogTitle>
            <DialogDescription>
              Challenge yourself against different AI difficulties
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2 border-b pb-4">
              <div className="flex justify-between items-center">
                <div className="font-medium">Easy</div>
                <Badge variant="outline">Beginner</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Makes completely random moves. Perfect for beginners or casual play.
              </p>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => handleSetDifficulty('easy')}
              >
                Play Easy
              </Button>
            </div>
            
            <div className="space-y-2 border-b pb-4">
              <div className="flex justify-between items-center">
                <div className="font-medium">Medium</div>
                <Badge variant="outline">Intermediate</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Will try to win mini-boards and block your winning moves. More strategic than Easy.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handleSetDifficulty('medium')}
              >
                Play Medium
              </Button>
            </div>
            
            <div className="space-y-2 border-b pb-4">
              <div className="flex justify-between items-center">
                <div className="font-medium">Hard</div>
                <Badge variant="default">Advanced</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Uses advanced strategies like forks and strategic board selection. A serious challenge.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handleSetDifficulty('hard')}
              >
                Play Hard
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="font-medium">Impossible</div>
                <Badge variant="destructive">Expert</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Uses perfect strategy and deep analysis. Nearly unbeatable. Only for masters.
              </p>
              <Button 
                variant="default" 
                className="w-full bg-red-500 hover:bg-red-600"
                onClick={() => handleSetDifficulty('impossible')}
              >
                <Info className="mr-2 h-4 w-4" />
                Play Impossible
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BotDifficultyInfo;
