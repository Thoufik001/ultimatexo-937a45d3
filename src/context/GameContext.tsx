import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";

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
}

interface GameSettings {
  turnTimeLimit: number;
  timerEnabled: boolean;
  playerSymbols: Record<string, string>;
  botMode: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
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
  | { type: 'UPDATE_SETTINGS'; settings: GameSettings };

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
  difficulty: 'medium'
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

// Improved bot move logic with winning strategy
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
  
  // Check each valid board for strategic moves based on difficulty
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
  
  // If no strategic move found (or on 'easy' difficulty), make a random move
  if (cellIndex === -1) {
    // Find all empty cells on the selected board
    const emptyCellIndices: number[] = [];
    boards[boardIndex].forEach((cell, index) => {
      if (cell === null) {
        emptyCellIndices.push(index);
      }
    });
    
    // If hard mode and no immediate win/block, try to take center or corners
    if (difficulty === 'hard' && emptyCellIndices.length > 1) {
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
        cellIndex = emptyCellIndices[Math.floor(Math.random() * emptyCellIndices.length)];
      }
    } else {
      // For easy mode or fallback, just pick randomly
      cellIndex = emptyCellIndices[Math.floor(Math.random() * emptyCellIndices.length)];
    }
  }
  
  return { boardIndex, cellIndex };
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

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'MAKE_MOVE': {
      const { boardIndex, cellIndex } = action;
      
      // Check if move is valid
      if (
        state.gameStatus !== 'playing' ||
        (state.nextBoardIndex !== null && state.nextBoardIndex !== boardIndex) ||
        state.boardStatus[boardIndex] !== null ||
        state.boards[boardIndex][cellIndex] !== null
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
        showConfetti: gameWinner !== null
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
      if (state.currentMoveIndex <= 0) return state;
      
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
      if (state.currentMoveIndex >= state.moveHistory.length - 1) return state;
      
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
      return {
        ...initialState,
        isMuted: state.isMuted,
        turnTimeLimit: state.turnTimeLimit,
        timerEnabled: state.timerEnabled,
        playerSymbols: state.playerSymbols,
        botMode: state.botMode,
        difficulty: state.difficulty,
        gameStatus: 'init'  // Ensure game returns to init state
      };
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
    
    case 'UPDATE_SETTINGS': {
      return {
        ...state,
        turnTimeLimit: action.settings.turnTimeLimit,
        turnTimeRemaining: action.settings.turnTimeLimit, // Reset current time
        timerEnabled: action.settings.timerEnabled,
        playerSymbols: action.settings.playerSymbols,
        botMode: action.settings.botMode,
        difficulty: action.settings.difficulty
      };
    }
    
    default:
      return state;
  }
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { toast } = useToast();

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
            toast({
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
      toast({
        title: "Time Running Out!",
        description: `${state.playerSymbols[state.currentPlayer]}, make your move quickly!`,
        variant: "destructive",
      });
    }

    if (state.turnTimeRemaining <= 0) {
      dispatch({ type: 'TIME_UP' });
      toast({
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
        toast({
          title: `Congratulations ${state.playerSymbols[state.winner]}! You Win!`,
          description: "You've won the game!",
        });
      } else {
        toast({
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
    updateSettings
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
