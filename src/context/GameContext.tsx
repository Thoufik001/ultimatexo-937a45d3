
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
  gameStatus: 'playing' | 'paused' | 'game-over';
  winner: Player;
  turnTimeLimit: number;
  turnTimeRemaining: number;
  isMuted: boolean;
  moveHistory: Array<{ boards: Boards, boardStatus: BoardStatus, boardIndex: number, cellIndex: number }>;
  currentMoveIndex: number;
  showConfetti: boolean;
}

type GameAction = 
  | { type: 'MAKE_MOVE'; boardIndex: number; cellIndex: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESTART' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'TICK_TIMER' }
  | { type: 'TIME_UP' }
  | { type: 'HIDE_CONFETTI' };

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  makeMove: (boardIndex: number, cellIndex: number) => void;
  undoMove: () => void;
  redoMove: () => void;
  restartGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  toggleSound: () => void;
}

const initialBoard = Array(9).fill(null);
const initialBoards: Boards = Array(9).fill(null).map(() => [...initialBoard]);
const initialBoardStatus: BoardStatus = Array(9).fill(null);

const initialState: GameState = {
  boards: initialBoards,
  boardStatus: initialBoardStatus,
  currentPlayer: 'X',
  nextBoardIndex: null,
  gameStatus: 'playing',
  winner: null,
  turnTimeLimit: 30,
  turnTimeRemaining: 30,
  isMuted: false,
  moveHistory: [],
  currentMoveIndex: -1,
  showConfetti: false
};

const checkWinner = (board: Board): Player => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  if (!board.includes(null)) {
    return null; // Draw
  }

  return null; // Still playing
};

const playSound = (sound: 'move' | 'win' | 'timeWarning' | 'gameOver', isMuted: boolean) => {
  if (isMuted) return;
  
  // In a real implementation, we would play actual sounds here
  console.log(`Playing sound: ${sound}`);
  
  // You could create audio elements and play them here:
  // const audio = new Audio(`/sounds/${sound}.mp3`);
  // audio.play();
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
        isMuted: state.isMuted
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
      if (state.gameStatus !== 'playing' || state.turnTimeRemaining <= 0) {
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
      if (state.gameStatus !== 'playing') {
        return state;
      }
      
      playSound('gameOver', state.isMuted);
      
      return {
        ...state,
        gameStatus: 'game-over',
        winner: state.currentPlayer === 'X' ? 'O' : 'X'
      };
    }
    
    case 'HIDE_CONFETTI': {
      return {
        ...state,
        showConfetti: false
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

  // Timer effect
  useEffect(() => {
    if (state.gameStatus !== 'playing') return;

    const timer = setInterval(() => {
      dispatch({ type: 'TICK_TIMER' });
    }, 1000);

    if (state.turnTimeRemaining <= 0) {
      dispatch({ type: 'TIME_UP' });
    }

    return () => clearInterval(timer);
  }, [state.gameStatus, state.turnTimeRemaining]);

  // Show turn notification
  useEffect(() => {
    if (state.gameStatus === 'playing' && state.moveHistory.length > 0) {
      toast({
        title: `Your Turn: ${state.currentPlayer}`,
        description: state.nextBoardIndex !== null 
          ? `Play in board ${state.nextBoardIndex + 1}`
          : "You can play in any available board",
      });
    }
  }, [state.currentPlayer, state.gameStatus]);

  // Game over notification
  useEffect(() => {
    if (state.gameStatus === 'game-over') {
      if (state.winner) {
        toast({
          title: `Congratulations ${state.winner}! You Win!`,
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

  const pauseGame = () => {
    dispatch({ type: 'PAUSE' });
  };

  const resumeGame = () => {
    dispatch({ type: 'RESUME' });
  };

  const toggleSound = () => {
    dispatch({ type: 'TOGGLE_SOUND' });
  };

  const contextValue = {
    state,
    dispatch,
    makeMove,
    undoMove,
    redoMove,
    restartGame,
    pauseGame,
    resumeGame,
    toggleSound
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
