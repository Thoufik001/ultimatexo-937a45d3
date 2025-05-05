
import React, { useState, useEffect } from 'react';
import { 
  Drawer, 
  DrawerClose, 
  DrawerContent, 
  DrawerFooter, 
  DrawerHeader, 
  DrawerTitle
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useGame } from '@/context/GameContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, Users, Link, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ open, onClose }) => {
  const { state, updateSettings } = useGame();
  
  // Use state from gameContext directly to ensure sync
  const [timeLimit, setTimeLimit] = useState(state.turnTimeLimit);
  const [timerEnabled, setTimerEnabled] = useState(state.timerEnabled);
  const [xSymbol, setXSymbol] = useState(state.playerSymbols.X);
  const [oSymbol, setOSymbol] = useState(state.playerSymbols.O);
  const [botMode, setBotMode] = useState(state.botMode);
  const [difficulty, setDifficulty] = useState(state.difficulty);
  const [playerName, setPlayerName] = useState(state.playerName || '');
  
  // Update local state whenever the drawer opens or game state changes
  useEffect(() => {
    if (open) {
      setTimeLimit(state.turnTimeLimit);
      setTimerEnabled(state.timerEnabled);
      setXSymbol(state.playerSymbols.X);
      setOSymbol(state.playerSymbols.O);
      setBotMode(state.botMode);
      setDifficulty(state.difficulty);
      setPlayerName(state.playerName || '');
    }
  }, [open, state.botMode, state.difficulty, state.playerSymbols, state.timerEnabled, state.turnTimeLimit, state.playerName]);
  
  const handleSave = () => {
    updateSettings({
      turnTimeLimit: timeLimit,
      timerEnabled,
      playerSymbols: {
        X: xSymbol || 'X',
        O: oSymbol || 'O'
      },
      botMode: state.multiplayerMode ? false : botMode,
      difficulty,
      playerName
    });
    onClose();
  };
  
  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="glass-drawer">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="text-center text-xl">Game Settings</DrawerTitle>
          </DrawerHeader>
          
          <div className="p-4">
            <Tabs defaultValue="general" className="mb-4">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="general">Game Settings</TabsTrigger>
                <TabsTrigger value="multiplayer">Multiplayer</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="bot-mode" className="text-base">Bot Mode</Label>
                    <Switch 
                      id="bot-mode" 
                      checked={botMode && !state.multiplayerMode} 
                      onCheckedChange={(checked) => {
                        setBotMode(checked);
                      }}
                      disabled={state.multiplayerMode}
                    />
                  </div>
                  
                  {botMode && !state.multiplayerMode && (
                    <div className="space-y-2">
                      <Label htmlFor="difficulty">Bot Difficulty</Label>
                      <Select 
                        value={difficulty} 
                        onValueChange={(value: 'easy' | 'medium' | 'hard') => setDifficulty(value)}
                      >
                        <SelectTrigger id="difficulty">
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy (Random Moves)</SelectItem>
                          <SelectItem value="medium">Medium (Basic Strategy)</SelectItem>
                          <SelectItem value="hard">Hard (Advanced Strategy)</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <div className="mt-2 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                        {difficulty === 'easy' && "The bot will make random moves, suitable for beginners."}
                        {difficulty === 'medium' && "The bot will use basic strategy to win or block your winning moves."}
                        {difficulty === 'hard' && "The bot will use advanced strategy, focusing on optimal positions and forks."}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="timer-enabled" className="text-base">Enable Timer</Label>
                    <Switch 
                      id="timer-enabled" 
                      checked={timerEnabled} 
                      onCheckedChange={setTimerEnabled}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="time-limit">Time Limit: {timeLimit} seconds</Label>
                    </div>
                    <Slider 
                      id="time-limit"
                      defaultValue={[timeLimit]}
                      min={5}
                      max={60}
                      step={5}
                      disabled={!timerEnabled}
                      onValueChange={(value) => setTimeLimit(value[0])}
                      className="py-4"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-base font-medium">Player Symbols</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="x-symbol">Player X Symbol</Label>
                      <Input
                        id="x-symbol"
                        value={xSymbol}
                        onChange={(e) => setXSymbol(e.target.value.slice(0, 2))}
                        maxLength={2}
                        className="text-center text-lg"
                        placeholder="X"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="o-symbol">Player O Symbol</Label>
                      <Input
                        id="o-symbol"
                        value={oSymbol}
                        onChange={(e) => setOSymbol(e.target.value.slice(0, 2))}
                        maxLength={2}
                        className="text-center text-lg"
                        placeholder="O"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-center gap-2 text-2xl pt-2">
                    <div className="bg-game-board-active p-3 rounded">
                      <span className="text-game-x">{xSymbol || 'X'}</span>
                    </div>
                    <div className="bg-game-board-active p-3 rounded">
                      <span className="text-game-o">{oSymbol || 'O'}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="multiplayer" className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="player-name">Your Name</Label>
                    <Input
                      id="player-name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full"
                    />
                  </div>
                  
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Use the multiplayer button on the main screen for quick access to create or join games.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="bg-muted/30 rounded p-3 space-y-2 text-sm">
                    <p className="font-medium">How Multiplayer Works:</p>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                      <li>Create a game to generate a unique code</li>
                      <li>Share the code with your friend</li>
                      <li>They can join using the "Join Game" option</li>
                      <li>Take turns playing remotely in real-time</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <DrawerFooter className="flex-row gap-2">
            <Button variant="outline" className="w-full" asChild>
              <DrawerClose>Cancel</DrawerClose>
            </Button>
            <Button onClick={handleSave} className="w-full">
              Save Settings
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default SettingsDrawer;
