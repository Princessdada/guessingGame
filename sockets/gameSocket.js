const gameService = require("../services/gameService");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // JOIN GAME SESSION
    socket.on("join_session", ({ sessionId, username }, callback) => {
      const result = gameService.joinSession(sessionId, username, socket.id);

      if (!result) {
        return callback({ error: "Unable to join session" });
      }

      const session = result.session;
      const player = result.player;

      socket.join(sessionId);

      // Notify others
      socket.to(sessionId).emit("player_joined", {
        player,
        players: session.players,
      });
      // Update player count
      io.to(sessionId).emit("player_count_update", {
        count: session.players.length,
      });
      callback({ success: true, player, session });
    });

    // CREATE NEW SESSION

    socket.on("create_session", (data, callback) => {
      const username = data.username;
      const result = gameService.createSession(username, socket.id);

      const session = result.session;
      const gameMaster = result.gameMaster;

      socket.join(session.sessionId);

      callback({
        success: true,
        session,
        gameMaster,
      });
    });

    // START GAME (Game Master)

    socket.on("start_game", ({ sessionId, question, answer }, callback) => {
      const session = gameService.sessions.get(sessionId);

      if (!session) return callback({ error: "Session not found" });

      if (session.players.length < 2)
        return callback({
          error: "At least 2 players needed to start",
        });

      gameService.setQuestion(sessionId, question, answer);

      io.to(sessionId).emit("game_started", {
        question,
        startTime: session.startTime,
      });

      // Start 60s timer check
      const timer = setInterval(() => {
        const expired = gameService.checkTimeExpiry(sessionId);

        if (expired) {
          clearInterval(timer);
          session.timer = null;
          io.to(sessionId).emit("time_up", {
            answer: session.answer,
          });
          io.to(sessionId).emit("game_ended", {
            winner: null,
          });
        }
      }, 1000);
      
      // Store timer in session
      session.timer = timer;

      callback({ success: true });
    });

    // PLAYER SUBMITS GUESS

    socket.on("submit_guess", ({ sessionId, playerId, guess }, callback) => {
      const result = gameService.handleGuess(sessionId, playerId, guess);

      const session = gameService.sessions.get(sessionId);
      if (!session) return;

      if (!result) return callback({ error: "Guess rejected" });

      // Wrong guess
      if (!result.correct) {
        io.to(sessionId).emit("attempt_update", {
          playerId,
          attemptsLeft: result.attemptsLeft,
        });

        return callback({
          correct: false,
          attemptsLeft: result.attemptsLeft,
        });
      }

      // Correct guess
      if (result.correct) {
        if (session.timer) {
          clearInterval(session.timer);
          session.timer = null;
        }

        io.to(sessionId).emit("winner_found", {
          winner: result.winner,
          answer: session.answer,
        });

        io.to(sessionId).emit("winner_points_assigned", {
          winner: result.winner,
        });

        io.to(sessionId).emit("game_ended", {
          winner: result.winner,
        });
        return callback({
          correct: true,
          winner: result.winner,
        });
      }
    });

    // NEXT ROUND

    socket.on("next_round", ({ sessionId }, callback) => {
      const session = gameService.sessions.get(sessionId);
      if (!session) return callback({ error: "Session not found" });

      // Clear old timer if still running
      if (session.timer) {
        clearInterval(session.timer);
        session.timer = null;
      }

      const newGM = gameService.rotateGameMaster(sessionId);

      io.to(sessionId).emit("new_question", {
        gameMaster: newGM,
      });

      callback({ success: true, newGameMaster: newGM });
    });

    // WHEN USER DISCONNECTS

    socket.on("disconnect", () => {
      console.log(` User disconnected: ${socket.id}`);

      // Find which session the disconnected user belonged to
      for (sessionEntry of gameService.sessions.entries()) {
        const sessionId = sessionEntry[0];
        const session = sessionEntry[1];
        const players = session.players;
        const player = players.find((p) => p.socketId === socket.id);

        // continue game if session does not contain the user
        if (!player) continue;

        // Remove player from session
        session.removePlayer(player.playerId);

        // Notify others
        io.to(sessionId).emit("player_left", { player: player });
        io.to(sessionId).emit("player_count_update", {
          count: session.players.length,
        });
        io.to(sessionId).emit("scores_updated", { players: session.players });

        // Delete session if empty
        if (session.players.length === 0) {
          gameService.deleteSession(sessionId);
          io.to(sessionId).emit("session_deleted");
          console.log(`Session ${sessionId} deleted`);
        }

        break;
      }
    });
  });
};
