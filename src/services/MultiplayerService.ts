
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
  private connectionPromise: Promise<void> | null = null;
  
  // Using multiple WebSocket servers for better reliability
  private serverUrls = [
    "wss://multiplayer-games-server.glitch.me",
    "wss://game-multiplayer-ws.onrender.com",
    "wss://ultimate-xo-multiplayer.herokuapp.com"
  ];
  private currentServerIndex = 0;
  
  constructor() {
    // Initialize connection only when needed
    this.tryReconnectOnPageVisibility();
  }
  
  // Try reconnecting when the page becomes visible again
  private tryReconnectOnPageVisibility(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.gameId && (!this.socket || this.socket.readyState !== WebSocket.OPEN)) {
          console.log("Page became visible, attempting to reconnect...");
          this.reconnect();
        }
      });
    }
  }
  
  public connect(): Promise<void> {
    // Return existing connection promise if one is in progress
    if (this.connectionPromise && this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      return this.connectionPromise;
    }
    
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // Use the current server URL
        const serverUrl = this.serverUrls[this.currentServerIndex];
        console.log(`Connecting to WebSocket server: ${serverUrl}`);
        
        // Close existing socket if any
        if (this.socket) {
          this.socket.close();
        }
        
        this.socket = new WebSocket(serverUrl);
        
        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
          console.log("WebSocket connection timeout");
          if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
            this.socket.close();
            this.tryNextServer(resolve, reject);
          }
        }, 5000);
        
        this.socket.onopen = () => {
          this.reconnectAttempts = 0;
          console.log("WebSocket connection established");
          clearTimeout(connectionTimeout);
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
          clearTimeout(connectionTimeout);
          
          if (this.gameId && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.reconnect(), 2000 * this.reconnectAttempts);
          }
        };
        
        this.socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          clearTimeout(connectionTimeout);
          this.tryNextServer(resolve, reject);
        };
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
        this.tryNextServer(resolve, reject);
      }
    });
    
    return this.connectionPromise;
  }
  
  private tryNextServer(resolve: () => void, reject: (reason?: any) => void): void {
    // Try the next server in the list
    this.currentServerIndex = (this.currentServerIndex + 1) % this.serverUrls.length;
    
    // If we've tried all servers, use fallback mode
    if (this.currentServerIndex === 0) {
      console.log("Tried all servers, using fallback mode");
      this.useFallbackMode();
      reject(new Error("Could not connect to any WebSocket server"));
    } else {
      // Try the next server
      console.log(`Trying next server: ${this.serverUrls[this.currentServerIndex]}`);
      this.connect().then(resolve).catch(reject);
    }
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
          toast.error("Could not reconnect to game server. Using fallback mode.");
          this.useFallbackMode();
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
      this.connect().then(() => {
        this.sendEvent(event);
      }).catch(() => {
        toast.error("Network error. Using fallback mode.");
        this.useFallbackMode();
      });
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
        
        // Generate a mock game ID and notify listeners
        const mockGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.gameId = mockGameId;
        
        setTimeout(() => {
          this.listeners.forEach(listener => listener({
            type: 'game-created',
            gameId: mockGameId,
            isHost: true
          }));
          
          // Simulate an opponent joining after a few seconds
          this.simulateOpponentJoin();
        }, 1000);
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
        
        // Use the provided game ID for fallback mode
        this.gameId = gameId;
        
        setTimeout(() => {
          this.listeners.forEach(listener => listener({
            type: 'game-joined',
            gameId: gameId,
            opponentName: "Simulated Player",
            isHost: false
          }));
          
          // Set up simulated opponent moves
          this.setupSimulatedOpponent();
        }, 1000);
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
    // Clear existing socket
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    toast.error("Could not connect to game server. Using simulated multiplayer mode.");
    
    // If we already have a game ID, continue using it; otherwise, generate a new one
    if (!this.gameId) {
      this.gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    // Notify user with more informative message
    toast.info("In simulated mode, you'll play against an AI opponent that acts as if it were a real player.");
    
    this.simulateOpponentJoin();
  }
  
  private simulateOpponentJoin(): void {
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
    }, 2000);
  }
  
  private setupSimulatedOpponent(): void {
    // This will simulate opponent moves in our fallback mode
    const makeRandomMove = () => {
      // Make a smarter move - try to find unoccupied spaces
      setTimeout(() => {
        // In a real implementation, we would look at the game state
        // For now, we'll just pick random moves
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
        // Don't respond to the opponent's move
      } else if (data.type === 'opponent-joined' || data.type === 'game-joined') {
        // Don't immediately make a move on join if we're player O
      } else {
        // Make a move in response to other events with a delay
        setTimeout(() => {
          makeRandomMove();
        }, 1500);
      }
    });
  }
}

// Singleton instance
export const multiplayerService = new MultiplayerService();

export default multiplayerService;
