
// This file is kept as a stub since it's imported in multiple places
// In a real refactoring, we'd remove all references and delete this file

class MultiplayerService {
  constructor() {
    console.warn("MultiplayerService is deprecated and has no functionality");
  }
  
  addListener() {
    return () => {};
  }
  
  createGame() {}
  joinGame() {}
  makeMove() {}
  restartGame() {}
  leaveGame() {}
  setReady() {}
  startGame() {}
}

// Singleton instance
export const multiplayerService = new MultiplayerService();

export default multiplayerService;
