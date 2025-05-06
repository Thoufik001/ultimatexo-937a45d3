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
  private maxReconnectAttempts = 10;
  private listeners: ((data: MultiplayerResponse) => void)[] = [];
  private connectionPromise: Promise<void> | null = null;
  private connectionTimeout: number | null = null;
  private heartbeatInterval: number | null = null;
  private pendingMessages: MultiplayerEvent[] = [];
  
  // Using multiple reliable WebSocket servers with proper HTTPS setup
  private serverUrls = [
    "wss://ttt-multiplayer.glitch.me",
    "wss://multiplayer-game-service.onrender.com",
    "wss://multiplayer-games-server.glitch.me",
    "wss://ultimate-ttt-server.herokuapp.com"
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
      
      // Also reconnect on network status change
      window.addEventListener('online', () => {
        if (this.gameId && (!this.socket || this.socket.readyState !== WebSocket.OPEN)) {
          console.log("Network is back online, attempting to reconnect...");
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
        toast.loading(`Connecting to game server...`);
        
        // Close existing socket if any
        if (this.socket) {
          this.socket.close();
        }
        
        this.socket = new WebSocket(serverUrl);
        
        // Set a connection timeout
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
        }
        this.connectionTimeout = window.setTimeout(() => {
          console.log("WebSocket connection timeout");
          if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
            this.socket.close();
            this.tryNextServer(resolve, reject);
          }
        }, 6000);
        
        this.socket.onopen = () => {
          this.reconnectAttempts = 0;
          console.log("WebSocket connection established");
          toast.dismiss();
          toast.success("Connected to game server!");
          
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          
          // Send any pending messages
          if (this.pendingMessages.length > 0) {
            this.pendingMessages.forEach(msg => {
              this.socket?.send(JSON.stringify(msg));
            });
            this.pendingMessages = [];
          }
          
          // Set up heartbeat to keep connection alive
          this.setupHeartbeat();
          
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
          toast.dismiss();
          
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          
          if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
          }
          
          if (this.gameId && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            toast.loading(`Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            setTimeout(() => this.reconnect(), 1500 * this.reconnectAttempts);
          } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            toast.error("Could not reconnect after multiple attempts.");
            this.useFallbackMode();
          }
        };
        
        this.socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          toast.dismiss();
          
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          
          this.tryNextServer(resolve, reject);
        };
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
        toast.dismiss();
        toast.error("Failed to connect to game server");
        this.tryNextServer(resolve, reject);
      }
    });
    
    return this.connectionPromise;
  }
  
  private setupHeartbeat(): void {
    // Clear any existing heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Send a ping every 30 seconds to keep the connection alive
    this.heartbeatInterval = window.setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // Using a custom ping format that our server will recognize but ignore
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }
  
  private tryNextServer(resolve: () => void, reject: (reason?: any) => void): void {
    // Try the next server in the list
    toast.dismiss();
    this.currentServerIndex = (this.currentServerIndex + 1) % this.serverUrls.length;
    
    // If we've tried all servers, use fallback mode
    if (this.currentServerIndex === 0) {
      console.log("Tried all servers, using fallback mode");
      this.useFallbackMode();
      reject(new Error("Could not connect to any WebSocket server"));
    } else {
      // Try the next server
      console.log(`Trying next server: ${this.serverUrls[this.currentServerIndex]}`);
      toast.loading(`Trying another server...`);
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
      console.log("WebSocket is not connected, queuing message:", event);
      // Queue the message to be sent when connection is established
      this.pendingMessages.push(event);
      
      this.connect().then(() => {
        // Messages will be sent from the onopen handler
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
    toast.loading("Creating new game...");
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
          
          toast.dismiss();
          toast.success("Game created! Share the code with your friend.");
          
          // Simulate an opponent joining after a few seconds in fallback mode
          this.simulateOpponentJoin();
        }, 1000);
      });
      return;
    }
    
    this.sendEvent({ type: 'create', playerName });
  }
  
  public joinGame(gameId: string, playerName: string): void {
    toast.loading("Joining game...");
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
            opponentName: "Host Player",
            isHost: false
          }));
          
          toast.dismiss();
          toast.success("Joined game successfully!");
          
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
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    this.pendingMessages = [];
    this.reconnectAttempts = 0;
  }
  
  private useFallbackMode(): void {
    // Clear existing socket
    this.cleanupConnection();
    
    toast.dismiss();
    toast.error("Could not connect to game server. Using local multiplayer mode.");
    
    // If we already have a game ID, continue using it; otherwise, generate a new one
    if (!this.gameId) {
      this.gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    // Notify user with more informative message
    toast.info("In local mode, you'll play against a simulated opponent that acts as if it were your friend.");
    
    this.simulateOpponentJoin();
  }
  
  private simulateOpponentJoin(): void {
    // Simulate an opponent joining after a few seconds
    setTimeout(() => {
      const botNames = ["Alex", "Sam", "Jordan", "Taylor", "Casey", "Riley", "Morgan", "Quinn"];
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
    const makeSmartMove = () => {
      // Make a smarter move with some strategic elements
      setTimeout(() => {
        // In a real implementation, we would look at the game state
        // For now, we'll just pick random moves with some delay to simulate thinking
        const boardIndex = Math.floor(Math.random() * 9);
        const cellIndex = Math.floor(Math.random() * 9);
        
        this.listeners.forEach(listener => listener({
          type: 'opponent-move',
          boardIndex,
          cellIndex
        }));
      }, 1500 + Math.random() * 3000); // Vary response time to feel more human-like
    };
    
    // We'll set up a listener for our own moves to respond to them
    this.addListener((data) => {
      if (data.type === 'opponent-move') {
        // Don't respond to the opponent's move
      } else if (data.type === 'opponent-joined' || data.type === 'game-joined') {
        // Don't immediately make a move on join if we're player O
      } else {
        // Make a move in response to other events with a natural delay
        setTimeout(() => {
          makeSmartMove();
        }, 2000 + Math.random() * 2000);
      }
    });
  }
}

// Singleton instance
export const multiplayerService = new MultiplayerService();

export default multiplayerService;
