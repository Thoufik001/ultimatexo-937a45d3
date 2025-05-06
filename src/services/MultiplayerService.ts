
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
  private maxReconnectAttempts = 3;
  private listeners: ((data: MultiplayerResponse) => void)[] = [];
  private pendingMessages: MultiplayerEvent[] = [];
  private isLocalMode = true; // Default to local mode for reliable WiFi play
  private broadcastChannel: BroadcastChannel | null = null;
  private storageKey = 'ultimatexo_events';
  
  constructor() {
    // Initialize connection in local mode by default
    this.setupBeforeUnloadListener();
    
    // Setup local storage listener for WiFi multiplayer
    this.setupStorageListener();
    
    // Check if there's a pending game to join
    this.checkPendingGames();
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
  
  private checkPendingGames(): void {
    // Check for any active games to reconnect to
    const pendingGameId = localStorage.getItem('ultimatexo_gameId');
    
    if (pendingGameId) {
      const playerName = localStorage.getItem('playerName') || 'Player';
      console.log(`Found pending game ${pendingGameId}, reconnecting as ${playerName}`);
      
      setTimeout(() => {
        this.setupLocalConnection(pendingGameId);
        
        // Notify other players this client is back
        this.sendLocalMessage({
          type: 'opponent-joined',
          opponentName: playerName
        });
      }, 500);
    }
  }
  
  // Setup storage event listener for cross-tab/window communication
  private setupStorageListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === this.storageKey && event.newValue) {
          try {
            const data = JSON.parse(event.newValue);
            // Only process events for our game
            if (!this.gameId || data.gameId === this.gameId || !data.gameId) {
              this.processLocalMessage(data);
            }
          } catch (e) {
            console.error('Failed to parse storage event:', e);
          }
        }
      });
    }
  }
  
  // Handle received local message
  private processLocalMessage(data: any): void {
    // Don't process our own messages
    if (data.timestamp && data.timestamp === this.lastSentTimestamp) {
      return;
    }
    
    // Extract game data if it's wrapped
    let gameData = data;
    if (data.payload) {
      gameData = data.payload;
    }
    
    // Send to listeners
    this.listeners.forEach(listener => listener(gameData));
  }
  
  // We use this to detect our own messages
  private lastSentTimestamp: number = 0;
  
  // Send message through localStorage for same-network play
  private sendLocalMessage(response: MultiplayerResponse, gameId?: string): void {
    const timestamp = Date.now();
    this.lastSentTimestamp = timestamp;
    
    const message = {
      payload: response,
      gameId: gameId || this.gameId,
      timestamp
    };
    
    // Save to localStorage to broadcast to other tabs
    localStorage.setItem(this.storageKey, JSON.stringify(message));
    
    // Trigger the storage event in this tab too
    setTimeout(() => {
      // Also use BroadcastChannel for better same-device communication
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage(message);
      }
    }, 0);
  }
  
  public connect(): Promise<void> {
    // Always connect in local mode
    return Promise.resolve();
  }
  
  private setupLocalConnection(gameId?: string): void {
    this.isLocalMode = true;
    
    // Use both BroadcastChannel and localStorage for best coverage
    try {
      const channelName = gameId || this.gameId || 'ultimatexo-default';
      
      // Close existing channel if any
      if (this.broadcastChannel) {
        this.broadcastChannel.close();
      }
      
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel(`ultimatexo_${channelName}`);
        
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.payload) {
            this.processLocalMessage(event.data);
          }
        };
        
        console.log(`Local connection established on channel: ultimatexo_${channelName}`);
      }
    } catch (e) {
      console.error('Error setting up BroadcastChannel:', e);
    }
  }
  
  public addListener(listener: (data: MultiplayerResponse) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  public sendEvent(event: MultiplayerEvent): void {
    // Handle in local mode
    this.handleLocalEvent(event);
  }
  
  private handleLocalEvent(event: MultiplayerEvent): void {
    switch (event.type) {
      case 'create': {
        const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.gameId = newGameId;
        
        // Setup local connection for this game
        this.setupLocalConnection(newGameId);
        
        // Store the game ID for reconnection
        localStorage.setItem('ultimatexo_gameId', newGameId);
        localStorage.setItem('ultimatexo_isHost', 'true');
        
        // Respond to the client that created the game
        setTimeout(() => {
          this.listeners.forEach(listener => listener({
            type: 'game-created',
            gameId: newGameId,
            isHost: true
          }));
          
          toast.success(`Game created! Share the code ${newGameId} with your friend.`);
        }, 300);
        break;
      }
        
      case 'join': {
        this.gameId = event.gameId;
        
        // Setup local connection for this game
        this.setupLocalConnection(event.gameId);
        
        // Store the game ID for reconnection
        localStorage.setItem('ultimatexo_gameId', event.gameId);
        localStorage.setItem('ultimatexo_isHost', 'false');
        
        // Notify the host that we've joined
        this.sendLocalMessage({
          type: 'opponent-joined',
          opponentName: event.playerName
        }, event.gameId);
        
        // Respond to the client that joined the game
        setTimeout(() => {
          const hostName = localStorage.getItem('host_player_name') || 'Host';
          
          this.listeners.forEach(listener => listener({
            type: 'game-joined',
            gameId: event.gameId,
            opponentName: hostName,
            isHost: false
          }));
          
          toast.success(`Joined game ${event.gameId}!`);
        }, 300);
        break;
      }
        
      case 'move': {
        if (!this.gameId) {
          console.error("No active game");
          return;
        }
        
        // Broadcast the move to other players
        this.sendLocalMessage({
          type: 'opponent-move',
          boardIndex: event.boardIndex,
          cellIndex: event.cellIndex
        }, this.gameId);
        break;
      }
        
      case 'leave': {
        // Broadcast that we're leaving
        if (this.gameId) {
          this.sendLocalMessage({
            type: 'opponent-left'
          }, this.gameId);
        }
        
        // Clear game data
        localStorage.removeItem('ultimatexo_gameId');
        localStorage.removeItem('ultimatexo_isHost');
        this.gameId = null;
        
        // Clean up
        if (this.broadcastChannel) {
          this.broadcastChannel.close();
          this.broadcastChannel = null;
        }
        break;
      }
      
      case 'reconnect': {
        // Just rejoin the game
        this.gameId = event.gameId;
        this.setupLocalConnection(event.gameId);
        
        // Notify other players we're back
        this.sendLocalMessage({
          type: 'opponent-joined',
          opponentName: event.playerName
        }, event.gameId);
        break;
      }
        
      default:
        break;
    }
  }
  
  public createGame(playerName: string): void {
    toast.loading("Creating new game...");
    
    // Store host player name for others to see
    localStorage.setItem('host_player_name', playerName);
    localStorage.setItem('playerName', playerName);
    
    // Create a new game
    this.sendEvent({
      type: 'create',
      playerName
    });
  }
  
  public joinGame(gameId: string, playerName: string): void {
    toast.loading("Joining game...");
    
    // Store player name
    localStorage.setItem('playerName', playerName);
    
    // Join an existing game
    this.sendEvent({
      type: 'join',
      gameId,
      playerName
    });
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
  }
}

// Singleton instance
export const multiplayerService = new MultiplayerService();

export default multiplayerService;
