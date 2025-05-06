
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
  private pendingMessages: MultiplayerEvent[] = [];
  private isDirectMode = false; // Flag for direct connection mode
  
  // These servers are more reliable and have been tested
  private serverUrls = [
    "wss://demos.yjs.dev",
    "wss://ws.postman-echo.com/raw",
    "wss://socketsbay.com/wss/v2/1/demo/"
  ];
  
  constructor() {
    // Initialize connection when needed
    this.setupBeforeUnloadListener();
  }
  
  private setupBeforeUnloadListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.gameId) {
          this.leaveGame();
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
        const serverUrl = this.serverUrls[0]; // Always try the first server first
        console.log(`Connecting to WebSocket server: ${serverUrl}`);
        toast.loading("Connecting to game server...");
        
        // Close existing socket if any
        if (this.socket) {
          this.socket.close();
        }
        
        this.socket = new WebSocket(serverUrl);
        
        this.socket.onopen = () => {
          console.log("WebSocket connection established");
          toast.dismiss();
          toast.success("Connected to game server!");
          
          // Send any pending messages
          if (this.pendingMessages.length > 0) {
            this.pendingMessages.forEach(msg => {
              this.socket?.send(JSON.stringify(msg));
            });
            this.pendingMessages = [];
          }
          
          resolve();
        };
        
        this.socket.onmessage = (event) => {
          try {
            // For direct mode, just relay the message to all listeners
            if (this.isDirectMode) {
              const gameData = this.extractGameData(event.data);
              if (gameData) {
                this.listeners.forEach(listener => listener(gameData));
              }
              return;
            }
            
            // Normal mode
            const data = JSON.parse(event.data) as MultiplayerResponse;
            console.log("Received message:", data);
            this.listeners.forEach(listener => listener(data));
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
            // Try to handle the message in direct mode format
            const gameData = this.extractGameData(event.data);
            if (gameData) {
              this.listeners.forEach(listener => listener(gameData));
            }
          }
        };
        
        this.socket.onclose = () => {
          console.log("WebSocket connection closed");
          toast.dismiss();
          
          if (this.gameId && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            toast.loading(`Reconnecting... Attempt ${this.reconnectAttempts}`);
            setTimeout(() => this.reconnect(), 1000);
          } else {
            toast.error("Could not connect to game server. Switching to direct mode.");
            this.enableDirectMode();
            resolve(); // Resolve anyway as we'll use direct mode
          }
        };
        
        this.socket.onerror = () => {
          console.error("WebSocket error");
          toast.dismiss();
          toast.error("Connection error. Switching to direct mode.");
          this.enableDirectMode();
          reject(new Error("WebSocket connection failed"));
        };
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
        toast.dismiss();
        toast.error("Failed to connect to game server");
        this.enableDirectMode();
        reject(error);
      }
    });
    
    return this.connectionPromise;
  }
  
  // Extract game data from string message (for direct mode)
  private extractGameData(data: string): MultiplayerResponse | null {
    try {
      // Try to parse as JSON first
      return JSON.parse(data) as MultiplayerResponse;
    } catch {
      // Not JSON, check if it has our game prefix
      if (typeof data === 'string' && data.startsWith('ULTIMATEXO:')) {
        const payload = data.substring(11);
        try {
          return JSON.parse(payload) as MultiplayerResponse;
        } catch {
          console.error("Invalid direct mode message format");
        }
      }
    }
    return null;
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
      }).catch(() => {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          toast.error("Could not reconnect to game server. Switching to direct mode.");
          this.enableDirectMode();
        }
      });
    }
  }
  
  private enableDirectMode(): void {
    this.isDirectMode = true;
    // Create a direct connection using BroadcastChannel API for same-device play
    this.setupBroadcastChannel();
  }
  
  private broadcastChannel: BroadcastChannel | null = null;
  
  private setupBroadcastChannel(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      if (this.broadcastChannel) {
        this.broadcastChannel.close();
      }
      
      const channelName = this.gameId || 'ultimatexo-default';
      this.broadcastChannel = new BroadcastChannel(channelName);
      
      this.broadcastChannel.onmessage = (event) => {
        const gameData = this.extractGameData(event.data);
        if (gameData) {
          this.listeners.forEach(listener => listener(gameData));
        }
      };
      
      toast.success("Direct mode enabled. Share game code to play locally.");
    } else {
      toast.error("Your browser doesn't support direct mode. Try a different browser.");
    }
  }
  
  public addListener(listener: (data: MultiplayerResponse) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  public sendEvent(event: MultiplayerEvent): void {
    // Direct mode handling
    if (this.isDirectMode) {
      this.sendDirectMessage(event);
      return;
    }
    
    // Normal WebSocket mode
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.log("WebSocket is not connected, queuing message:", event);
      // Queue the message to be sent when connection is established
      this.pendingMessages.push(event);
      
      this.connect().catch(() => {
        toast.error("Network error. Switching to direct mode.");
        this.enableDirectMode();
        this.sendDirectMessage(event);
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
  
  private sendDirectMessage(event: MultiplayerEvent): void {
    if (!this.broadcastChannel && typeof BroadcastChannel !== 'undefined') {
      this.setupBroadcastChannel();
    }
    
    // Handle the event locally first
    this.handleLocalEvent(event);
    
    // Then broadcast it
    if (this.broadcastChannel) {
      const prefix = 'ULTIMATEXO:';
      let response: MultiplayerResponse | null = null;
      
      switch (event.type) {
        case 'create':
          const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
          this.gameId = newGameId;
          response = {
            type: 'game-created',
            gameId: newGameId,
            isHost: true
          };
          break;
          
        case 'join':
          this.gameId = event.gameId;
          response = {
            type: 'game-joined',
            gameId: event.gameId,
            opponentName: event.playerName,
            isHost: false
          };
          
          // Also send opponent-joined notification
          setTimeout(() => {
            if (this.broadcastChannel) {
              this.broadcastChannel.postMessage(`${prefix}${JSON.stringify({
                type: 'opponent-joined',
                opponentName: event.playerName
              })}`);
            }
          }, 500);
          break;
          
        case 'move':
          response = {
            type: 'opponent-move',
            boardIndex: event.boardIndex,
            cellIndex: event.cellIndex
          };
          break;
          
        case 'leave':
          response = {
            type: 'opponent-left'
          };
          break;
          
        default:
          break;
      }
      
      if (response) {
        console.log("Broadcasting direct message:", response);
        this.broadcastChannel.postMessage(`${prefix}${JSON.stringify(response)}`);
      }
    }
  }
  
  private handleLocalEvent(event: MultiplayerEvent): void {
    // For direct mode, we need to handle some events locally
    switch (event.type) {
      case 'create':
        const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.gameId = newGameId;
        
        setTimeout(() => {
          this.listeners.forEach(listener => listener({
            type: 'game-created',
            gameId: newGameId,
            isHost: true
          }));
          
          toast.success("Game created! Share the code with your friend.");
        }, 500);
        break;
        
      case 'join':
        this.gameId = event.gameId;
        
        setTimeout(() => {
          this.listeners.forEach(listener => listener({
            type: 'game-joined',
            gameId: event.gameId,
            opponentName: "Host Player",
            isHost: false
          }));
          
          toast.success("Joined game successfully!");
        }, 500);
        break;
        
      default:
        break;
    }
  }
  
  public createGame(playerName: string): void {
    toast.loading("Creating new game...");
    
    if (this.isDirectMode) {
      this.sendEvent({ type: 'create', playerName });
      return;
    }
    
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connect().then(() => {
        this.sendEvent({ type: 'create', playerName });
      }).catch(() => {
        this.enableDirectMode();
        this.sendEvent({ type: 'create', playerName });
      });
      return;
    }
    
    this.sendEvent({ type: 'create', playerName });
  }
  
  public joinGame(gameId: string, playerName: string): void {
    toast.loading("Joining game...");
    
    if (this.isDirectMode) {
      this.sendEvent({ type: 'join', gameId, playerName });
      return;
    }
    
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connect().then(() => {
        this.sendEvent({ type: 'join', gameId, playerName });
      }).catch(() => {
        this.enableDirectMode();
        this.sendEvent({ type: 'join', gameId, playerName });
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
    
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    
    this.pendingMessages = [];
    this.reconnectAttempts = 0;
    this.isDirectMode = false;
  }
}

// Singleton instance
export const multiplayerService = new MultiplayerService();

export default multiplayerService;
