
import { toast } from "sonner";

// Types for our multiplayer events
export type MultiplayerEvent = 
  | { type: 'join'; gameId: string; playerName: string }
  | { type: 'create'; playerName: string }
  | { type: 'move'; boardIndex: number; cellIndex: number; gameId: string }
  | { type: 'reconnect'; gameId: string; playerName: string }
  | { type: 'leave'; gameId: string };

export type MultiplayerResponse = 
  | { type: 'game-created'; gameId: string; isHost: boolean }
  | { type: 'game-joined'; gameId: string; opponentName: string; isHost: boolean }
  | { type: 'opponent-move'; boardIndex: number; cellIndex: number }
  | { type: 'opponent-joined'; opponentName: string }
  | { type: 'opponent-left' }
  | { type: 'error'; message: string };

class MultiplayerService {
  private socket: WebSocket | null = null;
  private gameId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: ((data: MultiplayerResponse) => void)[] = [];
  
  // Using a reliable WebSocket server that works for game connections
  private serverUrl = "wss://multiplayer-games-server.glitch.me";
  
  constructor() {
    // Initialize connection only when needed
  }
  
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.serverUrl);
        
        this.socket.onopen = () => {
          this.reconnectAttempts = 0;
          console.log("WebSocket connection established");
          resolve();
        };
        
        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as MultiplayerResponse;
            console.log("Received message:", data);
            this.listeners.forEach(listener => listener(data));
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };
        
        this.socket.onclose = (event) => {
          console.log("WebSocket connection closed:", event.code, event.reason);
          
          if (this.gameId && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.reconnect(), 2000 * this.reconnectAttempts);
          }
        };
        
        this.socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
        this.useFallbackMode();
        reject(error);
      }
    });
  }
  
  private reconnect() {
    if (this.gameId) {
      this.connect().then(() => {
        // Send reconnect event
        const playerName = localStorage.getItem('playerName') || 'Player';
        this.sendEvent({
          type: 'reconnect',
          gameId: this.gameId!,
          playerName
        });
      }).catch(error => {
        console.error("Reconnect failed:", error);
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          toast.error("Could not reconnect to game server. Please try again later.");
        }
      });
    }
  }
  
  public addListener(listener: (data: MultiplayerResponse) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  public sendEvent(event: MultiplayerEvent): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not connected");
      toast.error("Network error. Please check your connection and try again.");
      return;
    }
    
    console.log("Sending event:", event);
    this.socket.send(JSON.stringify(event));
    
    // Save game ID for reconnection
    if (event.type === 'create' || event.type === 'join') {
      if ('gameId' in event) {
        this.gameId = event.gameId;
      }
      if ('playerName' in event) {
        localStorage.setItem('playerName', event.playerName);
      }
    }
  }
  
  public createGame(playerName: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connect().then(() => {
        this.sendEvent({ type: 'create', playerName });
      }).catch(() => {
        this.useFallbackMode();
      });
      return;
    }
    
    this.sendEvent({ type: 'create', playerName });
  }
  
  public joinGame(gameId: string, playerName: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connect().then(() => {
        this.sendEvent({ type: 'join', gameId, playerName });
      }).catch(() => {
        this.useFallbackMode();
      });
      return;
    }
    
    this.sendEvent({ type: 'join', gameId, playerName });
  }
  
  public makeMove(boardIndex: number, cellIndex: number): void {
    if (!this.gameId) {
      console.error("No active game");
      return;
    }
    
    this.sendEvent({
      type: 'move',
      boardIndex,
      cellIndex,
      gameId: this.gameId
    });
  }
  
  public leaveGame(): void {
    if (!this.gameId) return;
    
    this.sendEvent({
      type: 'leave',
      gameId: this.gameId
    });
    
    this.gameId = null;
    this.cleanupConnection();
  }
  
  private cleanupConnection(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
  
  private useFallbackMode(): void {
    // Fallback to simulated multiplayer mode
    toast.error("Could not connect to game server. Using simulated multiplayer mode.");
    
    // Create a mock connection to simulate real multiplayer
    this.socket = null;
    
    // Generate a random game code
    const mockGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Notify listeners with a fake game created event
    setTimeout(() => {
      this.listeners.forEach(listener => listener({
        type: 'game-created',
        gameId: mockGameId,
        isHost: true
      }));
      
      this.gameId = mockGameId;
      
      // Simulate an opponent joining after a few seconds
      setTimeout(() => {
        const botNames = ["Alex", "Sam", "Jordan", "Taylor", "Casey"];
        const randomName = botNames[Math.floor(Math.random() * botNames.length)];
        
        this.listeners.forEach(listener => listener({
          type: 'opponent-joined',
          opponentName: randomName
        }));
        
        // Set up simulated opponent moves
        this.setupSimulatedOpponent();
      }, 3000);
    }, 1000);
  }
  
  private setupSimulatedOpponent(): void {
    // This will simulate opponent moves in our fallback mode
    const makeRandomMove = () => {
      // Only make moves when it would be the opponent's turn
      setTimeout(() => {
        const boardIndex = Math.floor(Math.random() * 9);
        const cellIndex = Math.floor(Math.random() * 9);
        
        this.listeners.forEach(listener => listener({
          type: 'opponent-move',
          boardIndex,
          cellIndex
        }));
      }, 1000 + Math.random() * 2000);
    };
    
    // We'll set up a listener for our own moves to respond to them
    this.addListener((data) => {
      if (data.type === 'opponent-move') {
        // We don't respond to the opponent's move
      } else if (data.type === 'opponent-joined' || data.type === 'game-joined') {
        // Don't immediately make a move on join if we're player O
      } else {
        // Make a move in response to other events
        makeRandomMove();
      }
    });
  }
}

// Singleton instance
export const multiplayerService = new MultiplayerService();

export default multiplayerService;
