import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { toast } from "sonner";
import { useToast } from "@/components/ui/use-toast";
import multiplayerService, { MultiplayerResponse } from '@/services/MultiplayerService';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Player = 'X' | 'O' | null;
type Board = Array<Player>;
type Boards = Array<Board>;
type BoardStatus = Array<Player>;

interface GameState {
  boards: Boards;
  boardStatus: BoardStatus;
  currentPlayer: Player;
  nextBoardIndex: number | null;
  gameStatus: 'init' | 'playing' | 'paused' | 'game-over';
  winner: Player;
  turnTimeLimit: number;
  turnTimeRemaining: number;
  isMuted: boolean;
  moveHistory: Array<{ boards: Boards, boardStatus: BoardStatus, boardIndex: number, cellIndex: number }>;
  currentMoveIndex: number;
  showConfetti: boolean;
  timerEnabled: boolean;
  playerSymbols: Record<string, string>;
  botMode: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  multiplayerMode: boolean;
  playerName: string;
  gameCode: string;
  opponentName: string | null;
  isHost: boolean;
  isMyTurn: boolean;
  playerReady: boolean;
  opponentReady: boolean;
  gameStarted: boolean;
  syncStartTime: number | null;
  waitingForSync: boolean;
}

interface GameSettings {
  turnTimeLimit: number;
  timerEnabled: boolean;
  playerSymbols: Record<string, string>;
  botMode: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  multiplayerMode?: boolean;
  playerName?: string;
  playerReady?: boolean;
  opponentReady?: boolean;
  gameStarted?: boolean;
  syncStartTime?: number;
  waitingForSync?: boolean;
}

type GameAction = 
  | { type: 'MAKE_MOVE'; boardIndex: number; cellIndex: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESTART' }
  | { type: 'START_GAME' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP_GAME' }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'TICK_TIMER' }
  | { type: 'TIME_UP' }
  | { type: 'HIDE_CONFETTI' }
  | { type: 'BOT_MOVE' }
  | { type: 'TOGGLE_BOT_MODE' }
  | { type: 'UPDATE_SETTINGS'; settings: GameSettings }
  | { type: 'OPPONENT_MOVE'; boardIndex: number; cellIndex: number }
  | { type: 'CREATE_MULTIPLAYER_GAME'; gameCode: string; isHost: boolean }
  | { type: 'JOIN_MULTIPLAYER_GAME'; gameCode: string; opponentName: string; isHost: boolean }
  | { type: 'SET_OPPONENT_NAME'; name: string }
  | { type: 'SET_MY_TURN'; isMyTurn: boolean }
  | { type: 'SYNC_START_GAME'; timestamp: number }
  | { type: 'SET_WAITING_SYNC'; waiting: boolean };

interface GameContextType {
  state: GameState;
  makeMove: (boardIndex: number, cellIndex: number) => void;
  undoMove: () => void;
  redoMove: () => void;
  restartGame: () => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  stopGame: () => void;
  toggleSound: () => void;
  toggleBotMode: () => void;
  updateSettings: (settings: GameSettings) => void;
  createMultiplayerGame: (gameCode: string) => void;
  joinMultiplayerGame: (gameCode: string) => void;
  syncStartMultiplayer: (timestamp: number) => void;
  setWaitingForSync: (waiting: boolean) => void;
}

const initialBoard = Array(9).fill(null);
const initialBoards: Boards = Array(9).fill(null).map(() => [...initialBoard]);
const initialBoardStatus: BoardStatus = Array(9).fill(null);

const initialState: GameState = {
  boards: initialBoards,
  boardStatus: initialBoardStatus,
  currentPlayer: 'X',
  nextBoardIndex: null,
  gameStatus: 'init',
  winner: null,
  turnTimeLimit: 30,
  turnTimeRemaining: 30,
  isMuted: false,
  moveHistory: [],
  currentMoveIndex: -1,
  showConfetti: false,
  timerEnabled: true,
  playerSymbols: { 'X': 'X', 'O': 'O' },
  botMode: false,
  difficulty: 'medium',
  multiplayerMode: false,
  playerName: '',
  gameCode: '',
  opponentName: null,
  isHost: false,
  isMyTurn: true,
  playerReady: false,
  opponentReady: false,
  gameStarted: false,
  syncStartTime: null,
  waitingForSync: false
};

// Helper function to check if a player has won on a board
const checkWinner = (board: Array<Player>): Player => {
  // Winning combinations: rows, columns, and diagonals
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
  ];
  
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  
  // If all cells are filled and no winner, it's a draw (represented as null)
  return null;
};

// Function to play sound effects
const playSound = (soundType: 'move' | 'win' | 'gameOver' | 'timeWarning', isMuted: boolean) => {
  if (isMuted) return;
  
  // In a real implementation, we would play actual sounds here
  // For now, we'll just log to the console
  console.log(`Playing sound: ${soundType}`);
  
  // A more complete implementation would use the Web Audio API or an audio library
  // Example with HTML5 Audio:
  // const audio = new Audio(`/sounds/${soundType}.mp3`);
  // audio.play();
};

// Enhanced bot move logic with different difficulty levels
const getBotMove = (boards: Boards, boardStatus: BoardStatus, nextBoardIndex: number | null, difficulty: string): { boardIndex: number; cellIndex: number } => {
  // Find all valid boards to play on
  const validBoardIndices: number[] = [];
  if (nextBoardIndex !== null && boardStatus[nextBoardIndex] === null) {
    validBoardIndices.push(nextBoardIndex);
  } else {
    boardStatus.forEach((status, index) => {
      if (status === null) {
        validBoardIndices.push(index);
      }
    });
  }
  
  // Select a random valid board if we can't find a strategic move
  let boardIndex = validBoardIndices[Math.floor(Math.random() * validBoardIndices.length)];
  let cellIndex = -1;
  
  // Easy mode: Just make random moves
  if (difficulty === 'easy') {
    // Find all empty cells on the selected board
    const emptyCellIndices: number[] = [];
    boards[boardIndex].forEach((cell, index) => {
      if (cell === null) {
        emptyCellIndices.push(index);
      }
    });
    
    // Choose a random empty cell
    cellIndex = emptyCellIndices[Math.floor(Math.random() * emptyCellIndices.length)];
    return { boardIndex, cellIndex };
  }
  
  // Medium and Hard mode strategies
  if (difficulty === 'medium' || difficulty === 'hard') {
    // Try to find a winning move in any valid board first
    for (const bIndex of validBoardIndices) {
      const winningMove = findWinningMove(boards[bIndex], 'O');
      if (winningMove !== -1) {
        boardIndex = bIndex;
        cellIndex = winningMove;
        break;
      }
    }
    
    // If no winning move, try to block opponent's winning move
    if (cellIndex === -1) {
      for (const bIndex of validBoardIndices) {
        const blockingMove = findWinningMove(boards[bIndex], 'X');
        if (blockingMove !== -1) {
          boardIndex = bIndex;
          cellIndex = blockingMove;
          break;
        }
      }
    }
  }
  
  // For Hard mode, add more advanced strategies
  if (difficulty === 'hard' && cellIndex === -1) {
    // Evaluate the best board to play on using minimax
    if (validBoardIndices.length > 1) {
      boardIndex = findBestBoard(validBoardIndices, boards, boardStatus);
    }
    
    // Find all empty cells on the selected board
    const emptyCellIndices: number[] = [];
    boards[boardIndex].forEach((cell, index) => {
      if (cell === null) {
        emptyCellIndices.push(index);
      }
    });
    
    // Prefer center
    if (emptyCellIndices.includes(4)) {
      cellIndex = 4;
    } 
    // Then corners
    else if (emptyCellIndices.some(i => [0, 2, 6, 8].includes(i))) {
      const corners = emptyCellIndices.filter(i => [0, 2, 6, 8].includes(i));
      cellIndex = corners[Math.floor(Math.random() * corners.length)];
    } 
    // Then edges
    else {
      const edges = emptyCellIndices.filter(i => [1, 3, 5, 7].includes(i));
      cellIndex = edges[Math.floor(Math.random() * edges.length)];
    }
    
    // Try to find a strategic cell that sends opponent to a won board or a full board
    if (emptyCellIndices.length > 1) {
      for (const cell of emptyCellIndices) {
        if (boardStatus[cell] !== null) {
          cellIndex = cell;
          break;
        }
      }
    }
  }
  
  // If no strategic move found, make a random move
  if (cellIndex === -1) {
    // Find all empty cells on the selected board
    const emptyCellIndices: number[] = [];
    boards[boardIndex].forEach((cell, index) => {
      if (cell === null) {
        emptyCellIndices.push(index);
      }
    });
    
    // Choose a random empty cell
    cellIndex = emptyCellIndices[Math.floor(Math.random() * emptyCellIndices.length)];
  }
  
  return { boardIndex, cellIndex };
};

// Find the best board to play on using simple heuristic evaluation
const findBestBoard = (validBoardIndices: number[], boards: Boards, boardStatus: BoardStatus): number => {
  let bestScore = -Infinity;
  let bestBoardIndex = validBoardIndices[0];
  
  for (const boardIndex of validBoardIndices) {
    // More empty cells is better (more options)
    const emptyCount = boards[boardIndex].filter(cell => cell === null).length;
    
    // Having own cells already on the board is good
    const ownCellCount = boards[boardIndex].filter(cell => cell === 'O').length;
    
    // Having opponent's cells on the board is bad
    const opponentCellCount = boards[boardIndex].filter(cell => cell === 'X').length;
    
    // Calculate a simple score
    const score = emptyCount + (ownCellCount * 2) - opponentCellCount;
    
    if (score > bestScore) {
      bestScore = score;
      bestBoardIndex = boardIndex;
    }
  }
  
  return bestBoardIndex;
};

// Helper function to find a winning move for a player
const findWinningMove = (board: Array<Player>, player: Player): number => {
  // Winning combinations: rows, columns, and diagonals
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
  ];
  
  // Check each line for a potential winning move
  for (const [a, b, c] of lines) {
    // If two cells are taken by player and one is empty, return the empty cell
    if (board[a] === player && board[b] === player && board[c] === null) return c;
    if (board[a] === player && board[c] === player && board[b] === null) return b;
    if (board[b] === player && board[c] === player && board[a] === null) return a;
  }
  
  return -1; // No winning move found
};

// Find a fork opportunity (two potential winning moves)
const findForkMove = (board: Array<Player>, player: Player): number => {
  // Empty positions
  const emptyCells = board
    .map((cell, index) => cell === null ? index : -1)
    .filter(index => index !== -1);
    
  // Try each empty cell and see if it creates a fork
  for (const index of emptyCells) {
    // Create a copy of the board with the move
    const boardCopy = [...board];
    boardCopy[index] = player;
    
    // Count potential winning moves after this move
    let winningMovesCount = 0;
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    
    for (const [a, b, c] of lines) {
      const cells = [boardCopy[a], boardCopy[b], boardCopy[c]];
      if (cells.filter(cell => cell === player).length === 2 && 
          cells.filter(cell => cell === null).length === 1) {
        winningMovesCount++;
      }
    }
    
    // If this move creates two or more potential winning moves, it's a fork
    if (winningMovesCount >= 2) {
      return index;
    }
  }
  
  return -1; // No fork move found
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'MAKE_MOVE': {
      const { boardIndex, cellIndex } = action;
      
      // Check if move is valid
      if (
        state.gameStatus !== 'playing' ||
        (state.nextBoardIndex !== null && state.nextBoardIndex !== boardIndex) ||
        state.boardStatus[boardIndex] !== null ||
        state.boards[boardIndex][cellIndex] !== null ||
        (state.multiplayerMode && !state.isMyTurn)
      ) {
        return state;
      }
      
      // Clone the boards array and update the move
      const newBoards = state.boards.map((board, idx) => 
        idx === boardIndex ? [...board] : board
      );
      newBoards[boardIndex][cellIndex] = state.currentPlayer;
      
      // Check if the mini-board was won
      const boardWinner = checkWinner(newBoards[boardIndex]);
      const newBoardStatus = [...state.boardStatus];
      
      if (boardWinner !== null) {
        newBoardStatus[boardIndex] = boardWinner;
        playSound('win', state.isMuted);
      } else if (!newBoards[boardIndex].includes(null)) {
        // If board is full with no winner, mark it as a tie
        newBoardStatus[boardIndex] = null;
      }
      
      // Determine next board to play in
      let nextBoard = cellIndex;
      // If the directed board is already won or filled, allow play in any non-won board
      if (newBoardStatus[nextBoard] !== null) {
        nextBoard = null;
      }
      
      // Check if overall game is won
      const gameWinner = checkWinner(newBoardStatus);
      const gameOver = gameWinner !== null || !newBoardStatus.includes(null);
      
      // Build new history by discarding any future moves after current index
      const newHistory = state.moveHistory.slice(0, state.currentMoveIndex + 1);
      newHistory.push({
        boards: state.boards,
        boardStatus: state.boardStatus,
        boardIndex,
        cellIndex
      });
      
      // If in multiplayer mode, send move to opponent
      if (state.multiplayerMode && state.gameCode) {
        multiplayerService.makeMove(boardIndex, cellIndex);
      }
      
      const newState: GameState = {
        ...state,
        boards: newBoards,
        boardStatus: newBoardStatus,
        currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X',
        nextBoardIndex: nextBoard,
        gameStatus: gameOver ? 'game-over' : state.gameStatus,
        winner: gameWinner,
        turnTimeRemaining: state.turnTimeLimit,
        moveHistory: newHistory,
        currentMoveIndex: state.currentMoveIndex + 1,
        showConfetti: gameWinner !== null,
        isMyTurn: state.multiplayerMode ? false : true // Toggle turn in multiplayer
      };
      
      playSound('move', state.isMuted);
      return newState;
    }
    
    case 'BOT_MOVE': {
      // Skip if it's not the bot's turn or game is not in playing state
      if (!state.botMode || state.gameStatus !== 'playing' || state.currentPlayer !== 'O') {
        return state;
      }
      
      // Get bot's move
      const { boardIndex, cellIndex } = getBotMove(
        state.boards, 
        state.boardStatus, 
        state.nextBoardIndex, 
        state.difficulty
      );
      
      // Make the move (reuse MAKE_MOVE logic)
      return gameReducer(state, { type: 'MAKE_MOVE', boardIndex, cellIndex });
    }
    
    case 'START_GAME': {
      return {
        ...state,
        gameStatus: 'playing'
      };
    }
    
    case 'STOP_GAME': {
      return {
        ...state,
        gameStatus: 'init'
      };
    }
    
    case 'TOGGLE_BOT_MODE': {
      return {
        ...state,
        botMode: !state.botMode
      };
    }
    
    case 'UNDO': {
      if (state.currentMoveIndex <= 0 || state.multiplayerMode) return state;
      
      const prevMoveIndex = state.currentMoveIndex - 1;
      const prevMove = state.moveHistory[prevMoveIndex];
      
      return {
        ...state,
        boards: JSON.parse(JSON.stringify(prevMove.boards)),
        boardStatus: [...prevMove.boardStatus],
        currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X',
        nextBoardIndex: prevMove.cellIndex,
        currentMoveIndex: prevMoveIndex,
        gameStatus: 'playing',
        winner: null,
        turnTimeRemaining: state.turnTimeLimit,
        showConfetti: false
      };
    }
    
    case 'REDO': {
      if (state.currentMoveIndex >= state.moveHistory.length - 1 || state.multiplayerMode) return state;
      
      const nextMoveIndex = state.currentMoveIndex + 1;
      const historicalMove = state.moveHistory[nextMoveIndex];
      const nextMove = state.moveHistory[nextMoveIndex + 1];
      const nextBoardIndex = nextMove ? nextMove.cellIndex : null;
      
      // Recalculate game state
      const boardWinner = checkWinner(state.boardStatus);
      const gameOver = boardWinner !== null || !state.boardStatus.includes(null);
      
      return {
        ...state,
        boards: JSON.parse(JSON.stringify(historicalMove.boards)),
        boardStatus: [...historicalMove.boardStatus],
        currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X',
        nextBoardIndex,
        currentMoveIndex: nextMoveIndex,
        gameStatus: gameOver ? 'game-over' : 'playing',
        winner: boardWinner,
        turnTimeRemaining: state.turnTimeLimit,
        showConfetti: boardWinner !== null
      };
    }
    
    case 'RESTART': {
      playSound('move', state.isMuted);
      
      // Complete reset of the game state
      const newState = {
        ...initialState,
        isMuted: state.isMuted,
        turnTimeLimit: state.turnTimeLimit,
        timerEnabled: state.timerEnabled,
        playerSymbols: state.playerSymbols,
        botMode: state.botMode,
        difficulty: state.difficulty,
        
        // Keep multiplayer information if in multiplayer mode
        multiplayerMode: state.multiplayerMode,
        playerName: state.playerName,
        gameCode: state.gameCode,
        opponentName: state.opponentName,
        isHost: state.isHost,
        isMyTurn: state.multiplayerMode ? (state.isHost ? true : false) : true,
        playerReady: false,
        opponentReady: false,
        gameStarted: false
      };
      
      // Reset all boards and game status
      newState.boards = JSON.parse(JSON.stringify(initialBoards));
      newState.boardStatus = [...initialBoardStatus];
      newState.nextBoardIndex = null;
      newState.currentPlayer = 'X';
      newState.gameStatus = 'init';
      newState.winner = null;
      newState.turnTimeRemaining = state.turnTimeLimit;
      newState.moveHistory = [];
      newState.currentMoveIndex = -1;
      
      return newState;
    }
    
    case 'PAUSE': {
      if (state.gameStatus === 'playing') {
        return {
          ...state,
          gameStatus: 'paused'
        };
      }
      return state;
    }
    
    case 'RESUME': {
      if (state.gameStatus === 'paused') {
        return {
          ...state,
          gameStatus: 'playing'
        };
      }
      return state;
    }
    
    case 'TOGGLE_SOUND': {
      return {
        ...state,
        isMuted: !state.isMuted
      };
    }
    
    case 'TICK_TIMER': {
      if (state.gameStatus !== 'playing' || !state.timerEnabled || state.turnTimeRemaining <= 0) {
        return state;
      }
      
      const newTimeRemaining = state.turnTimeRemaining - 1;
      
      // Play warning sound if time is running low
      if (newTimeRemaining <= 5) {
        playSound('timeWarning', state.isMuted);
      }
      
      return {
        ...state,
        turnTimeRemaining: newTimeRemaining
      };
    }
    
    case 'TIME_UP': {
      if (state.gameStatus !== 'playing' || !state.timerEnabled) {
        return state;
      }
      
      playSound('gameOver', state.isMuted);
      
      // Instead of game over, just switch to the next player's turn
      return {
        ...state,
        currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X',
        turnTimeRemaining: state.turnTimeLimit, // Reset timer for next player
      };
    }
    
    case 'HIDE_CONFETTI': {
      return {
        ...state,
        showConfetti: false
      };
    }
    
    case 'OPPONENT_MOVE': {
      const { boardIndex, cellIndex } = action;
      
      if (state.gameStatus !== 'playing' || !state.multiplayerMode) {
        return state;
      }
      
      const newBoards = state.boards.map((board, idx) => 
        idx === boardIndex ? [...board] : board
      );
      newBoards[boardIndex][cellIndex] = state.currentPlayer;
      
      const boardWinner = checkWinner(newBoards[boardIndex]);
      const newBoardStatus = [...state.boardStatus];
      
      if (boardWinner !== null) {
        newBoardStatus[boardIndex] = boardWinner;
        playSound('win', state.isMuted);
      } else if (!newBoards[boardIndex].includes(null)) {
        newBoardStatus[boardIndex] = null;
      }
      
      let nextBoard = cellIndex;
      if (newBoardStatus[nextBoard] !== null) {
        nextBoard = null;
      }
      
      const gameWinner = checkWinner(newBoardStatus);
      const gameOver = gameWinner !== null || !newBoardStatus.includes(null);
      
      const newHistory = state.moveHistory.slice(0, state.currentMoveIndex + 1);
      newHistory.push({
        boards: state.boards,
        boardStatus: state.boardStatus,
        boardIndex,
        cellIndex
      });
      
      playSound('move', state.isMuted);
      
      return {
        ...state,
        boards: newBoards,
        boardStatus: newBoardStatus,
        currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X',
        nextBoardIndex: nextBoard,
        gameStatus: gameOver ? 'game-over' : state.gameStatus,
        winner: gameWinner,
        turnTimeRemaining: state.turnTimeLimit,
        moveHistory: newHistory,
        currentMoveIndex: state.currentMoveIndex + 1,
        showConfetti: gameWinner !== null,
        isMyTurn: true // It's my turn again after opponent's move
      };
    }
    
    case 'CREATE_MULTIPLAYER_GAME': {
      return {
        ...state,
        multiplayerMode: true,
        botMode: false,
        gameCode: action.gameCode,
        isHost: action.isHost,
        gameStatus: 'playing',
        isMyTurn: action.isHost // Host plays first (X)
      };
    }
    
    case 'JOIN_MULTIPLAYER_GAME': {
      return {
        ...state,
        multiplayerMode: true,
        botMode: false,
        gameCode: action.gameCode,
        isHost: action.isHost,
        opponentName: action.opponentName,
        gameStatus: 'playing',
        isMyTurn: !action.isHost // Guest plays second (O)
      };
    }
    
    case 'SET_OPPONENT_NAME': {
      return {
        ...state,
        opponentName: action.name
      };
    }
    
    case 'SET_MY_TURN': {
      return {
        ...state,
        isMyTurn: action.isMyTurn
      };
    }
    
    case 'UPDATE_SETTINGS': {
      return {
        ...state,
        turnTimeLimit: action.settings.turnTimeLimit,
        turnTimeRemaining: action.settings.turnTimeLimit, // Reset current time
        timerEnabled: action.settings.timerEnabled,
        playerSymbols: action.settings.playerSymbols,
        botMode: action.settings.botMode,
        difficulty: action.settings.difficulty,
        multiplayerMode: action.settings.multiplayerMode || state.multiplayerMode,
        playerName: action.settings.playerName || state.playerName,
        playerReady: action.settings.playerReady !== undefined ? action.settings.playerReady : state.playerReady,
        opponentReady: action.settings.opponentReady !== undefined ? action.settings.opponentReady : state.opponentReady,
        gameStarted: action.settings.gameStarted !== undefined ? action.settings.gameStarted : state.gameStarted,
        syncStartTime: action.settings.syncStartTime !== undefined ? action.settings.syncStartTime : state.syncStartTime,
        waitingForSync: action.settings.waitingForSync !== undefined ? action.settings.waitingForSync : state.waitingForSync
      };
    }
    
    case 'SYNC_START_GAME': {
      return {
        ...state,
        syncStartTime: action.timestamp,
        waitingForSync: true,
        gameStatus: 'init' // Keep it as init until we actually start
      };
    }
    
    case 'SET_WAITING_SYNC': {
      return {
        ...state,
        waitingForSync: action.waiting
      };
    }
    
    default:
      return state;
  }
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { toast: uiToast } = useToast();

  // Load game state from localStorage when component mounts
  useEffect(() => {
    const savedGame = localStorage.getItem('ultimateXO');
    if (savedGame) {
      try {
        const parsedState = JSON.parse(savedGame);
        if (parsedState && parsedState.boards) {
          // Only restore if the game was in progress
          if (parsedState.gameStatus === 'playing' || parsedState.gameStatus === 'paused') {
            dispatch({ type: 'RESTART' });
            Object.keys(parsedState).forEach(key => {
              (state as any)[key] = parsedState[key];
            });
            uiToast({
              title: "Game Restored",
              description: "Your previous game has been loaded.",
            });
          }
        }
      } catch (error) {
        console.error('Failed to restore game:', error);
      }
    }
  }, []);

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('ultimateXO', JSON.stringify(state));
  }, [state]);

  // Bot move effect
  useEffect(() => {
    if (state.botMode && state.gameStatus === 'playing' && state.currentPlayer === 'O') {
      // Add a small delay for better UX
      const botTimer = setTimeout(() => {
        dispatch({ type: 'BOT_MOVE' });
      }, 1000);
      
      return () => clearTimeout(botTimer);
    }
  }, [state.botMode, state.gameStatus, state.currentPlayer]);

  // Timer effect
  useEffect(() => {
    if (state.gameStatus !== 'playing' || !state.timerEnabled) return;

    const timer = setInterval(() => {
      dispatch({ type: 'TICK_TIMER' });
    }, 1000);

    // Show warning toast when time is low
    if (state.turnTimeRemaining === 5) {
      uiToast({
        title: "Time Running Out!",
        description: `${state.playerSymbols[state.currentPlayer]}, make your move quickly!`,
        variant: "destructive",
      });
    }

    if (state.turnTimeRemaining <= 0) {
      dispatch({ type: 'TIME_UP' });
      uiToast({
        title: `Time's Up!`,
        description: `${state.playerSymbols[state.currentPlayer === 'X' ? 'O' : 'X']}'s turn now.`,
      });
    }

    return () => clearInterval(timer);
  }, [state.gameStatus, state.turnTimeRemaining, state.timerEnabled, state.currentPlayer, state.playerSymbols]);

  // Game over notification
  useEffect(() => {
    if (state.gameStatus === 'game-over') {
      if (state.winner) {
        uiToast({
          title: `Congratulations ${state.playerSymbols[state.winner]}! You Win!`,
          description: "You've won the game!",
        });
      } else {
        uiToast({
          title: "It's a Tie!",
          description: "Well played by both sides.",
        });
      }
    }
  }, [state.gameStatus, state.winner]);

  // Confetti effect timeout
  useEffect(() => {
    if (state.showConfetti) {
      const timer = setTimeout(() => {
        dispatch({ type: 'HIDE_CONFETTI' });
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [state.showConfetti]);

  // Multiplayer WebSocket connection and event handling
  useEffect(() => {
    if (state.multiplayerMode) {
      const removeListener = multiplayerService.addListener((data: MultiplayerResponse) => {
        console.log("Multiplayer event received:", data);
        
        switch (data.type) {
          case 'game-created':
            toast.success("Game created! Waiting for opponent to join.");
            dispatch({
              type: 'CREATE_MULTIPLAYER_GAME',
              gameCode: data.gameId,
              isHost: data.isHost
            });
            break;
            
          case 'game-joined':
            toast.success(`${data.opponentName} joined the game!`);
            dispatch({
              type: 'JOIN_MULTIPLAYER_GAME',
              gameCode: data.gameId,
              opponentName: data.opponentName,
              isHost: data.isHost
            });
            break;
            
          case 'opponent-joined':
            toast.success(`${data.opponentName} joined the game!`);
            dispatch({
              type: 'SET_OPPONENT_NAME',
              name: data.opponentName
            });
            break;
            
          case 'opponent-move':
            dispatch({
              type: 'OPPONENT_MOVE',
              boardIndex: data.boardIndex,
              cellIndex: data.cellIndex
            });
            break;
            
          case 'opponent-left':
            toast.error("Your opponent has left the game.");
            break;
            
          case 'error':
            toast.error(`Error: ${data.message}`);
            break;
        }
      });
      
      // Clean up the listener when unmounting
      return () => {
        removeListener();
        multiplayerService.leaveGame();
      };
    }
  }, [state.multiplayerMode]);
  
  // Add effect for synchronized game start
  useEffect(() => {
    if (state.waitingForSync && state.syncStartTime) {
      const now = Date.now();
      
      if (now >= state.syncStartTime) {
        // Time to start!
        dispatch({ type: 'START_GAME' });
        toast.success("Game started! Both players synced.");
      } else {
        // Set timeout for the exact moment to start
        const delay = state.syncStartTime - now;
        const timer = setTimeout(() => {
          dispatch({ type: 'START_GAME' });
          toast.success("Game started! Both players synced.");
        }, delay);
        
        return () => clearTimeout(timer);
      }
    }
  }, [state.waitingForSync, state.syncStartTime]);

  // Listen for multiplayer game started event
  useEffect(() => {
    if (state.multiplayerMode) {
      const handleGameStarted = (data: MultiplayerResponse) => {
        if (data.type === 'game-started') {
          dispatch({ type: 'SYNC_START_GAME', timestamp: data.timestamp });
          toast.success("Game starting soon...");
        }
      };
      
      const unsubscribe = multiplayerService.addListener(handleGameStarted);
      return () => unsubscribe();
    }
  }, [state.multiplayerMode]);
  
  // Convenience functions
  const makeMove = (boardIndex: number, cellIndex: number) => {
    dispatch({ type: 'MAKE_MOVE', boardIndex, cellIndex });
  };

  const undoMove = () => {
    dispatch({ type: 'UNDO' });
  };

  const redoMove = () => {
    dispatch({ type: 'REDO' });
  };

  const restartGame = () => {
    dispatch({ type: 'RESTART' });
  };

  const startGame = () => {
    dispatch({ type: 'START_GAME' });
  };

  const pauseGame = () => {
    dispatch({ type: 'PAUSE' });
  };

  const resumeGame = () => {
    dispatch({ type: 'RESUME' });
  };

  const stopGame = () => {
    dispatch({ type: 'STOP_GAME' });
  };

  const toggleSound = () => {
    dispatch({ type: 'TOGGLE_SOUND' });
  };
  
  const toggleBotMode = () => {
    dispatch({ type: 'TOGGLE_BOT_MODE' });
  };
  
  const updateSettings = (settings: GameSettings) => {
    dispatch({ type: 'UPDATE_SETTINGS', settings });
  };

  const createMultiplayerGame = (gameCode: string) => {
    dispatch({ type: 'CREATE_MULTIPLAYER_GAME', gameCode, isHost: true });
  };
  
  const joinMultiplayerGame = (gameCode: string) => {
    dispatch({ type: 'JOIN_MULTIPLAYER_GAME', gameCode, opponentName: null, isHost: false });
  };

  const syncStartMultiplayer = (timestamp: number) => {
    dispatch({ type: 'SYNC_START_GAME', timestamp });
  };
  
  const setWaitingForSync = (waiting: boolean) => {
    dispatch({ type: 'SET_WAITING_SYNC', waiting });
  };

  const contextValue = {
    state,
    makeMove,
    undoMove,
    redoMove,
    restartGame,
    startGame,
    pauseGame,
    resumeGame,
    stopGame,
    toggleSound,
    toggleBotMode,
    updateSettings,
    createMultiplayerGame,
    joinMultiplayerGame,
    syncStartMultiplayer,
    setWaitingForSync
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
