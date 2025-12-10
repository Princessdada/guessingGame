const socket = io();

// Lobby Elements
const usernameInput = document.getElementById("username");
const sessionIdInput = document.getElementById("sessionId");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const sessionInfo = document.getElementById("sessionInfo");
const sessionIdValue = document.getElementById("sessionIdValue");
const copySessionIdBtn = document.getElementById("copySessionId");

let currentSession = null;
let currentPlayer = null;
let sessionId = null;

//  CREATE SESSION

createBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  if (!username) return alert("Enter a username");

  socket.emit("create_session", { username }, (res) => {
    if (!res.success) return alert("Error creating session");

    currentSession = res.session;
    currentPlayer = res.gameMaster;
    sessionId = res.session.sessionId;

    showSessionInfo();
    showGameMasterPanel();
  });
});

// JOIN SESSION

joinBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  const sessionId = sessionIdInput.value.trim();

  if (!username || !sessionId) return alert("Missing fields");

  socket.emit("join_session", { sessionId, username }, (res) => {
    if (!res.success) return alert(res.error);

    currentSession = res.session;
    currentPlayer = res.player;
    sessionId = res.session.sessionId;

    showSessionInfo();
    showGameArea();
  });
});

function showSessionInfo() {
  sessionIdValue.textContent = currentSession.sessionId;
  sessionId = currentSession.sessionId;

  sessionInfo.classList.remove("hidden");
}

copySessionIdBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(sessionIdValue.textContent);
  alert("Copied!");
});

function showGameMasterPanel() {
  document.getElementById("gameMasterPanel").classList.remove("hidden");
  document.getElementById("lobby").classList.add("hidden");
}

function showGameArea() {
  document.getElementById("gameArea").classList.remove("hidden");
  document.getElementById("lobby").classList.add("hidden");
}
