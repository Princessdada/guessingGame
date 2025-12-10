class GameSession {
  constructor(sessionId, gameMasterId) {
    this.sessionId = sessionId;
    this.gameMasterId = gameMasterId;

    this.players = [];
    this.question = null;
    this.answer = null;
    this.status = "lobby";
    this.winnerId = null;

    this.timer = null;
    this.startTime = null;
  }

  addPlayer(player) {
    this.players.push(player);
  }
  removePlayer(playerId) {
    this.players = this.players.filter((p) => p.playerId !== playerId);
  }
  getPlayer(playerId) {
    return this.players.find((p) => p.playerId === playerId);
  }
  setQuestions(question, answer) {
    this.question = question;
    this.answer = answer;
  }
  startGame() {
    this.status = "playing";
    this.winnerId = this.winnerId;
  }
  endGame(winnerId = null) {
    this.status = "ended";
    this.winnerId = winnerId;
  }
}

module.exports = GameSession;
