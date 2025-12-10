class Players {
  constructor(playerId, username, socketId, isGameMaster = false) {
    this.playerId = playerId;
    this.username = username;
    this.socketId = socketId;

    this.score = 0;
    this.attemptsLeft = 3;
    this.isGameMaster = isGameMaster;
  }
  addPoints(points = 1) {
    this.score += points;
  }
  reduceAttempts() {
    if (this.attemptsLeft > 0) {
      this.attemptsLeft -= 1;
    }
  }
  resetAttempts(value = 3) {
    this.attemptsLeft = value;
  }
  makeGameMaster() {
    this.isGameMaster = true;
  }

  removeGameMaster() {
    this.isGameMaster = false;
  }
}
module.exports = Players;
