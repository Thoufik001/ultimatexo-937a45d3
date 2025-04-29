
import React, { useState } from 'react';
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

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ open, onClose }) => {
  const { state, updateSettings } = useGame();
  
  const [timeLimit, setTimeLimit] = useState(state.turnTimeLimit);
  const [timerEnabled, setTimerEnabled] = useState(state.timerEnabled);
  const [xSymbol, setXSymbol] = useState(state.playerSymbols.X);
  const [oSymbol, setOSymbol] = useState(state.playerSymbols.O);
  
  const handleSave = () => {
    updateSettings({
      turnTimeLimit: timeLimit,
      timerEnabled,
      playerSymbols: {
        X: xSymbol || 'X',
        O: oSymbol || 'O'
      }
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
          
          <div className="p-4 space-y-6">
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
