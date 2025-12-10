const { v4: uuidv4 } = require("uuid");
const GameSession = require("../models/gameSessions");
const Players = require("../models/players");

class GameService {
  constructor() {
    this.sessions = new Map();
  }
  //   create new session
  createSession(gameMasterUsername, socketId) {
    const sessionId = uuidv4();
    const gameMasterId = uuidv4();

    const gameMaster = new Players(
      gameMasterId,
      gameMasterUsername,
      socketId,
      true
    );
    const session = new GameSession(sessionId, gameMasterId);
    session.addPlayer(gameMaster);
    this.sessions.set(sessionId, session);
    return { session, gameMaster };
  }

  //   Join existing session
  joinSession(sessionId, username, socketId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    
    if (session.status === "active") {
      return null;
    }

    const playerId = uuidv4();
    const player = new Players(playerId, username, socketId, false);
    session.addPlayer(player);
    return { session, player };
  }

  //   set question and answer game master
  setQuestion(sessionId, question, answer) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.question = question;
    session.answer = answer.toLowerCase();
    session.status = "active";
    session.startTime = Date.now();

    // Reset all players' attempts
    session.players.forEach((player) => {
      player.resetAttempts(3);
    });

    return true;
  }

  // players make a guess
  handleGuess(sessionId, playerId, guess) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== "active") return null;

    const player = session.getPlayer(playerId);
    if (!player) return null;

    // Game master cannot participate in guessing
    if (player.isGameMaster) {
      return null;
    }

    const normalizedGuess = guess.toLowerCase();

    // wrong guess
    if (normalizedGuess !== session.answer) {
      player.reduceAttempts();

      return {
        correct: false,
        attemptsLeft: player.attemptsLeft,
      };
    }
    // correct guess
    player.addPoints(10);
    session.winnerId = playerId;
    session.status = "ended";

    return {
      correct: true,
      winner: player,
    };
  }
  // check if time has expired
  checkTimeExpiry(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    if (session.status !== "active") return false;
    if (!session.startTime) return false;

    const now = Date.now();
    const timeDiff = now - session.startTime;

    // time limit
    const TIME_LIMIT = 60 * 1000;

    if (timeDiff >= TIME_LIMIT) {
      session.status = "ended";

      // if time has exceeded there is no winner
      session.winnerId = null;
      return true;
    }
    return false;
  }
  // switch game master
  rotateGameMaster(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const players = session.players;
    const GameMasterIndex = players.findIndex(
      (p) => p.playerId === session.gameMasterId
    );

    // turn current gamemaster to a normal player
    players[GameMasterIndex].isGameMaster = false;

    // pick next game master
    const nextIndex = (GameMasterIndex + 1) % players.length;
    const newGameMaster = players[nextIndex];
    newGameMaster.isGameMaster = true;
    session.gameMasterId = newGameMaster.playerId;

    // Reset round for new GM
    session.question = null;
    session.answer = null;
    session.status = "lobby";
    session.startTime = null;

    for (let i = 0; i < players.length; i++) {
      players[i].attemptsLeft = 3;
    }

    return newGameMaster;
  }
  // End session
  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = "ended";
    return true;
  }

  // Delete sessions when all players leave
  deleteSession(sessionId) {
    return this.sessions.delete(sessionId);
  }
}

module.exports = new GameService();
