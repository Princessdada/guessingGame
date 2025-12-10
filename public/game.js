// Socket.IO connection
const socket = io();

// Game state
let gameState = {
  sessionId: null,
  player: null,
  isGameMaster: false,
  players: [],
  question: null,
  answer: null,
  status: "lobby",
  attemptsLeft: 3,
  timer: null,
  timeLeft: 60,
};

let messagesDiv, usernameInput, sessionIdInput, createBtn, joinBtn;
let gameMasterPanel, questionInput, answerInput, startGameBtn;
let questionDisplay, guessInput, submitGuessBtn, nextRoundBtn;
let playersList, scoresDiv, timerDiv, sessionInfo;
let sessionIdGroup, sessionIdDisplay, sessionIdValue, copySessionIdBtn;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDOM);
} else {
  initDOM();
}

function initDOM() {
  messagesDiv = document.getElementById("messages");
  usernameInput = document.getElementById("username");
  sessionIdInput = document.getElementById("sessionId");
  createBtn = document.getElementById("createBtn");
  joinBtn = document.getElementById("joinBtn");
  gameMasterPanel = document.getElementById("gameMasterPanel");
  questionInput = document.getElementById("question");
  answerInput = document.getElementById("answer");
  startGameBtn = document.getElementById("startGameBtn");
  questionDisplay = document.getElementById("questionDisplay");
  guessInput = document.getElementById("guess");
  submitGuessBtn = document.getElementById("submitGuessBtn");
  nextRoundBtn = document.getElementById("nextRoundBtn");
  playersList = document.getElementById("playersList");
  scoresDiv = document.getElementById("scores");
  timerDiv = document.getElementById("timer");
  sessionInfo = document.getElementById("sessionInfo");
  sessionIdGroup = document.getElementById("sessionIdGroup");
  sessionIdDisplay = document.getElementById("sessionIdDisplay");
  sessionIdValue = document.getElementById("sessionIdValue");
  copySessionIdBtn = document.getElementById("copySessionId");

  // Check if all required elements exist
  if (!startGameBtn) {
    console.error("startGameBtn not found!");
    return;
  }
  if (!questionInput) {
    console.error("questionInput not found!");
    return;
  }
  if (!answerInput) {
    console.error("answerInput not found!");
    return;
  }

  init();
  setupEventListeners();
}

function init() {
  // Check if we have a sessionId in URL
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("sessionId");
  if (sessionId) {
    sessionIdInput.value = sessionId;
    sessionIdGroup.style.display = "block";
    sessionIdDisplay.classList.add("hidden");
  }

  // Copy session ID button
  if (copySessionIdBtn) {
    copySessionIdBtn.addEventListener("click", () => {
      const sessionId = sessionIdValue.textContent;
      navigator.clipboard
        .writeText(sessionId)
        .then(() => {
          copySessionIdBtn.textContent = "Copied!";
          setTimeout(() => {
            copySessionIdBtn.textContent = "Copy";
          }, 2000);
        })
        .catch(() => {
          sessionIdInput.value = sessionId;
          sessionIdInput.select();
          document.execCommand("copy");
          copySessionIdBtn.textContent = "Copied!";
          setTimeout(() => {
            copySessionIdBtn.textContent = "Copy";
          }, 2000);
        });
    });
  }
}

function setupEventListeners() {
  function addMessage(content, type = "system", username = "") {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}`;

    if (username) {
      const usernameSpan = document.createElement("div");
      usernameSpan.className = "username";
      usernameSpan.textContent = username;
      messageDiv.appendChild(usernameSpan);
    }

    const contentSpan = document.createElement("div");
    contentSpan.className = "content";
    contentSpan.textContent = content;
    messageDiv.appendChild(contentSpan);

    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // Update players list
  function updatePlayersList() {
    playersList.innerHTML = "";
    const h3 = document.createElement("h3");
    h3.textContent = `Players (${gameState.players.length})`;
    playersList.appendChild(h3);

    gameState.players.forEach((player) => {
      const playerDiv = document.createElement("div");
      playerDiv.className = "player-item";
      playerDiv.innerHTML = `
      <span>${player.username}${
        player.isGameMaster ? '<span class="game-master-badge">GM</span>' : ""
      }</span>
      <span class="score-value">${player.score} pts</span>
    `;
      playersList.appendChild(playerDiv);
    });

    // Update player count
    const playerCountEl = document.getElementById("playerCount");
    if (playerCountEl) {
      playerCountEl.textContent = gameState.players.length;
    }

    // Update start button state
    if (startGameBtn) {
      if (gameState.players.length < 2) {
        startGameBtn.disabled = true;
        startGameBtn.textContent = `Start Game (Need ${
          2 - gameState.players.length
        } more player${2 - gameState.players.length > 1 ? "s" : ""})`;
      } else {
        startGameBtn.disabled = false;
        startGameBtn.textContent = "Start Game";
      }
    }
  }

  // Update scores
  function updateScores() {
    scoresDiv.innerHTML = "";
    const h3 = document.createElement("h3");
    h3.textContent = "Scores";
    scoresDiv.appendChild(h3);

    const sortedPlayers = [...gameState.players].sort(
      (a, b) => b.score - a.score
    );
    sortedPlayers.forEach((player) => {
      const scoreDiv = document.createElement("div");
      scoreDiv.className = "score-item";
      scoreDiv.innerHTML = `
      <span>${player.username}</span>
      <span class="score-value">${player.score} pts</span>
    `;
      scoresDiv.appendChild(scoreDiv);
    });
  }

  // Start timer
  function startTimer() {
    gameState.timeLeft = 60;
    timerDiv.textContent = `Time left: ${gameState.timeLeft}s`;
    timerDiv.classList.remove("hidden");

    gameState.timer = setInterval(() => {
      gameState.timeLeft--;
      timerDiv.textContent = `Time left: ${gameState.timeLeft}s`;

      if (gameState.timeLeft <= 0) {
        clearInterval(gameState.timer);
        timerDiv.textContent = "Time's up!";
      }
    }, 1000);
  }

  // Stop timer
  function stopTimer() {
    if (gameState.timer) {
      clearInterval(gameState.timer);
      gameState.timer = null;
    }
    timerDiv.classList.add("hidden");
  }

  // Update game state
  function updateUI() {
    const joinForm = document.getElementById("joinForm");

    // Hide join/create form once session = active
    if (gameState.sessionId) {
      if (joinForm) {
        joinForm.style.display = "none";
      }
    } else {
      if (joinForm) {
        joinForm.style.display = "block";
      }
    }

    // Show/hide game master panel
    if (gameState.isGameMaster && gameState.status === "lobby") {
      if (gameMasterPanel) {
        gameMasterPanel.classList.remove("hidden");
      } else {
        console.error("gameMasterPanel element not found!");
      }
    } else {
      if (gameMasterPanel) {
        gameMasterPanel.classList.add("hidden");
      }
    }

    // Show/hide question display
    if (
      gameState.status === "active" &&
      gameState.question &&
      !gameState.isGameMaster
    ) {
      questionDisplay.classList.remove("hidden");
      const questionTextEl = document.getElementById("questionText");
      if (questionTextEl) {
        questionTextEl.textContent = gameState.question;
      }
      if (guessInput) guessInput.disabled = false;
      if (submitGuessBtn) submitGuessBtn.disabled = false;
    } else {
      questionDisplay.classList.add("hidden");
      if (guessInput) guessInput.disabled = true;
      if (submitGuessBtn) submitGuessBtn.disabled = true;
    }

    // Show/hide next round button
    if (gameState.isGameMaster && gameState.status === "ended") {
      nextRoundBtn.classList.remove("hidden");
    } else {
      nextRoundBtn.classList.add("hidden");
    }
  }

  // Create session
  createBtn.addEventListener("click", () => {
    const username = usernameInput.value.trim();
    if (!username) {
      alert("Please enter a username");
      return;
    }

    socket.emit("create_session", { username }, (response) => {
      if (response.success) {
        gameState.sessionId = response.session.sessionId;
        gameState.player = response.gameMaster;
        gameState.isGameMaster = true;
        gameState.players = response.session.players;
        gameState.status = "lobby";

        sessionInfo.textContent = `Session: ${gameState.sessionId} | You are the Game Master`;

        // Clear welcome message and announce game master status
        messagesDiv.innerHTML = "";
        addMessage(
          `You are the Game Master! Session ID: ${gameState.sessionId}`,
          "winner"
        );
        addMessage(
          "Share this Session ID with your friends. Once at least 2 players join, create a question and start the game!",
          "system"
        );

        // Display the generated session ID prominently
        sessionIdInput.value = "";
        sessionIdGroup.style.display = "none";
        sessionIdValue.textContent = gameState.sessionId;
        sessionIdDisplay.classList.remove("hidden");

        updatePlayersList();
        updateScores();
        updateUI();
      } else {
        addMessage("Failed to create session", "error");
      }
    });
  });

  // Join session
  joinBtn.addEventListener("click", () => {
    const username = usernameInput.value.trim();
    let sessionId = sessionIdInput.value.trim();

    if (!username) {
      alert("Please enter a username");
      return;
    }

    // Show session ID input group if hidden
    if (sessionIdGroup.style.display === "none" || !sessionId) {
      sessionIdGroup.style.display = "block";
      sessionIdInput.focus();
      sessionIdInput.required = true;
      if (!sessionId) {
        return;
      }
    }

    if (!sessionId) {
      alert("Please enter a session ID");
      sessionIdInput.focus();
      return;
    }

    socket.emit("join_session", { sessionId, username }, (response) => {
      if (response.success) {
        gameState.sessionId = sessionId;
        gameState.player = response.player;
        gameState.players = response.session.players;
        gameState.status = response.session.status;
        gameState.isGameMaster = response.player.isGameMaster;

        sessionInfo.textContent = `Session: ${sessionId} | ${
          response.player.isGameMaster ? "Game Master" : "Player"
        }`;
        addMessage(` Successfully joined session ${sessionId}`, "system");

        if (response.player.isGameMaster) {
          addMessage("👑 You are now the Game Master!", "winner");
        } else {
          addMessage(
            "Waiting for the game master to start the game...",
            "system"
          );
        }

        // Hide session ID input after joining
        sessionIdGroup.style.display = "none";
        sessionIdDisplay.classList.add("hidden");

        updatePlayersList();
        updateScores();
        updateUI();
      } else {
        addMessage(response.error || "Failed to join session", "error");
        if (response.error && response.error.includes("in progress")) {
          addMessage(
            "The game is already in progress. You cannot join now.",
            "error"
          );
        }
      }
    });
  });

  // Start game (Game Master)
  if (startGameBtn) {
    startGameBtn.addEventListener("click", () => {
      console.log("Start Game button clicked!");
      const question = questionInput.value.trim();
      const answer = answerInput.value.trim();

      console.log("Question:", question, "Answer:", answer);
      console.log("Session ID:", gameState.sessionId);
      console.log("Players:", gameState.players.length);

      if (!question || !answer) {
        alert("Please enter both question and answer");
        return;
      }

      if (gameState.players.length < 2) {
        alert("At least 2 players needed to start");
        return;
      }

      if (!gameState.sessionId) {
        alert("No session ID. Please create or join a session first.");
        return;
      }

      socket.emit(
        "start_game",
        {
          sessionId: gameState.sessionId,
          question,
          answer,
        },
        (response) => {
          console.log("Start game response:", response);
          if (response.success) {
            gameState.question = question;
            gameState.status = "active";
            gameState.attemptsLeft = 3;
            questionInput.value = "";
            answerInput.value = "";

            updateUI();
          } else {
            addMessage(response.error || "Failed to start game", "error");
            if (response.error && response.error.includes("2 players")) {
              addMessage(
                "You need at least 2 players to start the game. Wait for more players to join.",
                "error"
              );
            }
          }
        }
      );
    });
  } else {
    console.error("startGameBtn element not found!");
  }

  // Submit guess
  if (submitGuessBtn) {
    submitGuessBtn.addEventListener("click", () => {
      if (gameState.status !== "active") {
        addMessage(
          "The game is not active. Wait for the game master to start the game.",
          "error"
        );
        return;
      }

      // Game master cannot guess
      if (gameState.isGameMaster) {
        addMessage(
          "You are the game master. You cannot participate in guessing.",
          "error"
        );
        return;
      }

      const guess = guessInput.value.trim();

      if (!guess) {
        alert("Please enter a guess");
        return;
      }

      if (gameState.attemptsLeft <= 0) {
        addMessage("You have no attempts left", "error");
        return;
      }

      addMessage(`Your guess: "${guess}"`, "player");
      // check for correct or incorrect guess
      socket.emit(
        "submit_guess",
        {
          sessionId: gameState.sessionId,
          playerId: gameState.player.playerId,
          guess,
        },
        (response) => {
          if (response.error) {
            addMessage(response.error, "error");
            return;
          }

          if (response.correct) {
            guessInput.value = "";
            if (guessInput) guessInput.disabled = true;
            if (submitGuessBtn) submitGuessBtn.disabled = true;
          } else {
            gameState.attemptsLeft = response.attemptsLeft;
            if (response.attemptsLeft > 0) {
              addMessage(
                `Wrong guess. You have ${response.attemptsLeft} attempt${
                  response.attemptsLeft > 1 ? "s" : ""
                } left.`,
                "error"
              );
            } else {
              addMessage("Wrong guess. You have no attempts left.", "error");
            }
            guessInput.value = "";

            if (response.attemptsLeft <= 0) {
              if (guessInput) guessInput.disabled = true;
              if (submitGuessBtn) submitGuessBtn.disabled = true;
            }
          }
        }
      );
    });
  }

  // Next round
  nextRoundBtn.addEventListener("click", () => {
    socket.emit(
      "next_round",
      { sessionId: gameState.sessionId },
      (response) => {
        if (response.success) {
          gameState.isGameMaster =
            response.newGameMaster.playerId === gameState.player.playerId;
          gameState.status = "lobby";
          gameState.question = null;
          gameState.attemptsLeft = 3;
          stopTimer();
          updateUI();

          // Messages are handled by new_question socket event, no need to duplicate here
        } else {
          addMessage(response.error || "Failed to start next round", "error");
        }
      }
    );
  });

  // Socket event listeners
  socket.on("player_joined", (data) => {
    gameState.players = data.players;
    addMessage(`${data.player.username} joined the game`, "system");
    updatePlayersList();
    updateScores();
  });

  socket.on("player_left", (data) => {
    addMessage(`${data.player.username} left the game`, "system");
    gameState.players = gameState.players.filter(
      (p) => p.playerId !== data.player.playerId
    );
    updatePlayersList();
    updateScores();
  });

  socket.on("player_count_update", (data) => {
    updatePlayersList();
  });

  socket.on("game_started", (data) => {
    gameState.question = data.question;
    gameState.status = "active";
    gameState.attemptsLeft = 3;

    if (gameState.isGameMaster) {
      addMessage(
        "🎮 Game started! Players can now see the question and start guessing.",
        "system"
      );
      addMessage(
        "As the game master, you cannot participate in guessing.",
        "system"
      );
    } else {
      addMessage("Game started!", "system");
      addMessage(`Question: ${data.question}`, "system");
      addMessage("You have 3 attempts to guess the answer!", "system");
    }

    updateUI();
    if (!gameState.isGameMaster) {
      startTimer();
    }
  });

  socket.on("attempt_update", (data) => {
    if (data.playerId === gameState.player.playerId) {
      gameState.attemptsLeft = data.attemptsLeft;
    }
  });

  socket.on("winner_found", (data) => {
    stopTimer();

    if (data.winner.playerId === gameState.player.playerId) {
      addMessage(
        "🎉 YOU WON! You guessed correctly and earned 10 points! 🎉",
        "winner"
      );
    } else {
      addMessage(
        `🏆 ${data.winner.username} won and earned 10 points!`,
        "winner"
      );
    }

    addMessage(`The answer was: ${data.answer}`, "system");
    gameState.status = "ended";
    if (guessInput) guessInput.disabled = true;
    if (submitGuessBtn) submitGuessBtn.disabled = true;
    updateUI();
  });

  socket.on("winner_points_assigned", (data) => {
    const player = gameState.players.find(
      (p) => p.playerId === data.winner.playerId
    );
    if (player) {
      player.score = data.winner.score;
    }
    updateScores();
  });

  socket.on("time_up", (data) => {
    stopTimer();
    addMessage("Time's up! No one guessed the answer in time.", "error");
    addMessage(`The answer was: ${data.answer}`, "system");
    addMessage("No points were awarded this round.", "system");
    gameState.status = "ended";
    if (guessInput) guessInput.disabled = true;
    if (submitGuessBtn) submitGuessBtn.disabled = true;
    updateUI();
  });

  socket.on("game_ended", (data) => {
    gameState.status = "ended";
    if (data.winner) {
      updateScores();
    }
    updateUI();
  });

  socket.on("new_question", (data) => {
    gameState.isGameMaster =
      data.gameMaster.playerId === gameState.player.playerId;
    gameState.status = "lobby";
    gameState.question = null;
    gameState.attemptsLeft = 3;
    stopTimer();

    if (gameState.isGameMaster) {
      sessionInfo.textContent = `Session: ${gameState.sessionId} | You are the Game Master`;
      addMessage(
        "You are now the Game Master! Create a question and answer to start the next round.",
        "winner"
      );
    } else {
      sessionInfo.textContent = `Session: ${gameState.sessionId} | Player`;
      addMessage(
        `${data.gameMaster.username} is now the game master. Waiting for them to create a question...`,
        "system"
      );
    }
    updateUI();
  });

  socket.on("scores_updated", (data) => {
    gameState.players = data.players;
    updateScores();
  });

  socket.on("session_deleted", () => {
    addMessage("Session deleted. All players have left.", "error");
    gameState = {
      sessionId: null,
      player: null,
      isGameMaster: false,
      players: [],
      question: null,
      answer: null,
      status: "lobby",
      attemptsLeft: 3,
      timer: null,
      timeLeft: 60,
    };
    updateUI();
  });

  // Enter key handlers
  usernameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      if (sessionIdInput.value) {
        joinBtn.click();
      } else {
        createBtn.click();
      }
    }
  });

  sessionIdInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      joinBtn.click();
    }
  });

  guessInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      submitGuessBtn.click();
    }
  });

  questionInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      startGameBtn.click();
    }
  });

  answerInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      startGameBtn.click();
    }
  });
} 