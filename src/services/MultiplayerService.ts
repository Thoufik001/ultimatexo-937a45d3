
import { toast } from "sonner";

// Types for our multiplayer events
export type MultiplayerEvent = 
  | { type: 'join'; gameId: string; playerName: string }
  | { type: 'create'; playerName: string }
  | { type: 'move'; boardIndex: number; cellIndex: number; gameId: string }
  | { type: 'reconnect'; gameId: string; playerName: string }
  | { type: 'leave'; gameId: string }
  | { type: 'restart'; gameId: string };

export type MultiplayerResponse = 
  | { type: 'game-created'; gameId: string; isHost: boolean }
  | { type: 'game-joined'; gameId: string; opponentName: string; isHost: boolean }
  | { type: 'opponent-move'; boardIndex: number; cellIndex: number }
  | { type: 'opponent-joined'; opponentName: string }
  | { type: 'opponent-left' }
  | { type: 'opponent-restart' }
  | { type: 'error'; message: string };

class MultiplayerService {
  private gameId: string | null = null;
  private listeners: ((data: MultiplayerResponse) => void)[] = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private storageKey = 'ultimatexo_events';
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPongTime: number = 0;
  
  constructor() {
    // Setup storage event listener for cross-tab/window communication
    this.setupStorageListener();
    
    // Check if there's a pending game to join
    this.checkPendingGames();
    
    // Setup beforeunload listener to clean up when page closes
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
  
  private checkPendingGames(): void {
    // Check for any active games to reconnect to
    const pendingGameId = localStorage.getItem('ultimatexo_gameId');
    
    if (pendingGameId) {
      const playerName = localStorage.getItem('playerName') || 'Player';
      console.log(`Found pending game ${pendingGameId}, reconnecting as ${playerName}`);
      
      setTimeout(() => {
        this.setupLocalConnection(pendingGameId);
        
        // Send a ping to check if other players are still active
        localStorage.setItem('ultimatexo_ping_' + pendingGameId, Date.now().toString());
        
        // Start monitoring for network activity
        this.startNetworkMonitoring();
      }, 500);
    }
  }
  
  // Setup storage event listener for cross-tab/window communication
  private setupStorageListener(): void {
    if (typeof window !== 'undefined') {
      // Listen for events from other tabs/windows
      window.addEventListener('storage', (event) => {
        // Handle ping/pong for presence detection
        if (event.key && event.key.startsWith('ultimatexo_ping_') && event.newValue) {
          const pingGameId = event.key.replace('ultimatexo_ping_', '');
          if (pingGameId === this.gameId) {
            // Respond to ping with a pong
            localStorage.setItem('ultimatexo_pong_' + pingGameId, Date.now().toString());
          }
          return;
        }
        
        if (event.key && event.key.startsWith('ultimatexo_pong_') && event.newValue) {
          // Record the last time we received a pong
          this.lastPongTime = Date.now();
          return;
        }
        
        // Handle game events
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
  
  private startNetworkMonitoring(): void {
    // Clear any existing interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // Send pings every 2 seconds to check for other players
    this.pingInterval = setInterval(() => {
      if (this.gameId) {
        // Send a ping
        localStorage.setItem('ultimatexo_ping_' + this.gameId, Date.now().toString());
        
        // Check if we've received pongs recently (within last 5 seconds)
        const timeSinceLastPong = Date.now() - this.lastPongTime;
        if (this.lastPongTime > 0 && timeSinceLastPong > 5000) {
          // Notify that we haven't received pongs recently
          this.listeners.forEach(listener => listener({
            type: 'opponent-left'
          }));
          
          // Reset last pong time to prevent repeated notifications
          this.lastPongTime = 0;
        }
      }
    }, 2000);
  }
  
  private stopNetworkMonitoring(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
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
    
    // Save to localStorage to broadcast to other tabs/windows/devices
    localStorage.setItem(this.storageKey, JSON.stringify(message));
    
    // Also use BroadcastChannel for better same-device communication
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (error) {
        console.error("Error sending through BroadcastChannel:", error);
      }
    }
  }
  
  private setupLocalConnection(gameId?: string): void {
    const channelName = gameId || this.gameId || 'ultimatexo-default';
    
    // Close existing channel if any
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    
    try {
      // Use BroadcastChannel if available (more reliable for same-device communication)
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
      console.warn('BroadcastChannel not supported, falling back to localStorage only:', e);
    }
    
    // Start network monitoring
    this.startNetworkMonitoring();
  }
  
  public addListener(listener: (data: MultiplayerResponse) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  public sendEvent(event: MultiplayerEvent): void {
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
        
        // Store host player name for others to see
        localStorage.setItem('host_player_name', event.playerName);
        
        // Record initial pong time to indicate we're active
        this.lastPongTime = Date.now();
        
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
        
        // Check if host exists by sending a ping and waiting for pong
        localStorage.setItem('ultimatexo_ping_' + event.gameId, Date.now().toString());
        
        // Record initial pong time
        this.lastPongTime = Date.now();
        
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
        
        // Stop network monitoring
        this.stopNetworkMonitoring();
        
        // Clean up
        if (this.broadcastChannel) {
          this.broadcastChannel.close();
          this.broadcastChannel = null;
        }
        break;
      }
      
      case 'restart': {
        // Broadcast restart event to all connected players
        if (this.gameId) {
          this.sendLocalMessage({
            type: 'opponent-restart'
          }, this.gameId);
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
    
    // Store player name
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
  
  public restartGame(): void {
    if (!this.gameId) {
      return;
    }
    
    this.sendEvent({
      type: 'restart',
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
