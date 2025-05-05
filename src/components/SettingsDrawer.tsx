
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
import { User, Users, Link } from "lucide-react";
import { toast } from "sonner";

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
  const [multiplayerMode, setMultiplayerMode] = useState(state.multiplayerMode);
  const [playerName, setPlayerName] = useState(state.playerName || '');
  const [gameCode, setGameCode] = useState('');
  const [showCreateGameDialog, setShowCreateGameDialog] = useState(false);
  const [showJoinGameDialog, setShowJoinGameDialog] = useState(false);
  
  // Update local state whenever the drawer opens or game state changes
  useEffect(() => {
    if (open) {
      setTimeLimit(state.turnTimeLimit);
      setTimerEnabled(state.timerEnabled);
      setXSymbol(state.playerSymbols.X);
      setOSymbol(state.playerSymbols.O);
      setBotMode(state.botMode);
      setDifficulty(state.difficulty);
      setMultiplayerMode(state.multiplayerMode);
      setPlayerName(state.playerName || '');
    }
  }, [open, state.botMode, state.difficulty, state.playerSymbols, state.timerEnabled, state.turnTimeLimit, state.multiplayerMode, state.playerName]);
  
  const handleSave = () => {
    updateSettings({
      turnTimeLimit: timeLimit,
      timerEnabled,
      playerSymbols: {
        X: xSymbol || 'X',
        O: oSymbol || 'O'
      },
      botMode: multiplayerMode ? false : botMode,
      difficulty,
      multiplayerMode,
      playerName
    });
    onClose();
  };
  
  const handleCreateGame = () => {
    // Generate a random 6-character game code
    const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGameCode(generatedCode);
    setShowCreateGameDialog(true);
  };
  
  const handleJoinGame = () => {
    setShowJoinGameDialog(true);
  };
  
  const handleJoinGameSubmit = () => {
    if (!gameCode.trim()) {
      toast("Please enter a valid game code");
      return;
    }
    
    // This would actually connect to the multiplayer game session in a real implementation
    toast("Multiplayer mode is coming soon!");
    setShowJoinGameDialog(false);
  };
  
  const copyGameCode = () => {
    navigator.clipboard.writeText(gameCode);
    toast("Game code copied to clipboard!");
  };
  
  return (
    <>
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
                        checked={botMode && !multiplayerMode} 
                        onCheckedChange={(checked) => {
                          setBotMode(checked);
                          if (checked) setMultiplayerMode(false);
                        }}
                      />
                    </div>
                    
                    {botMode && !multiplayerMode && (
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="multiplayer-mode" className="text-base">Online Multiplayer</Label>
                      <Switch 
                        id="multiplayer-mode" 
                        checked={multiplayerMode} 
                        onCheckedChange={(checked) => {
                          setMultiplayerMode(checked);
                          if (checked) setBotMode(false);
                        }}
                      />
                    </div>
                    
                    {multiplayerMode && (
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
                        
                        <div className="flex flex-col md:flex-row gap-2 pt-2">
                          <Button 
                            onClick={handleCreateGame} 
                            className="flex-1"
                            disabled={!playerName}
                          >
                            Create New Game
                          </Button>
                          <Button 
                            onClick={handleJoinGame}
                            className="flex-1" 
                            variant="outline"
                            disabled={!playerName}
                          >
                            Join Game
                          </Button>
                        </div>
                        
                        {!playerName && (
                          <p className="text-sm text-muted-foreground">
                            Please enter your name to create or join a multiplayer game.
                          </p>
                        )}
                        
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
                    )}
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
      
      {/* Create Game Dialog */}
      <Dialog open={showCreateGameDialog} onOpenChange={setShowCreateGameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Game Created!</DialogTitle>
            <DialogDescription>
              Share this code with your opponent to play together.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-6 space-y-4">
            <div className="w-full p-4 bg-muted/60 rounded-lg text-center">
              <span className="text-2xl font-mono tracking-wider">{gameCode}</span>
            </div>
            
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <Avatar className="border-2 border-primary">
                  <AvatarFallback>{playerName?.slice(0,2) || 'P1'}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{playerName || 'Player 1'}</span>
                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">Host</span>
              </div>
              <div className="h-0.5 w-12 bg-muted" />
              <div className="flex items-center space-x-2">
                <Avatar className="border-2 border-muted opacity-50">
                  <AvatarFallback>P2</AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground">Waiting...</span>
              </div>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => toast("Multiplayer mode is coming soon!")}>
              Start Game
            </Button>
            <Button onClick={copyGameCode} className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Copy Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Join Game Dialog */}
      <Dialog open={showJoinGameDialog} onOpenChange={setShowJoinGameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join Game</DialogTitle>
            <DialogDescription>
              Enter the game code shared by your opponent.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="game-code">Game Code</Label>
              <Input
                id="game-code"
                placeholder="Enter 6-character code"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                className="text-center text-lg tracking-wide"
                maxLength={6}
              />
            </div>
            
            <div className="pt-2">
              <Button onClick={handleJoinGameSubmit} className="w-full">
                Join Game
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SettingsDrawer;
