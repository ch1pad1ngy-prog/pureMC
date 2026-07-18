const fs = require('fs');
const { EventEmitter } = require('events');

// Matches vanilla/Paper/Spigot log lines, e.g.:
// [12:34:56] [Server thread/INFO]: Steve joined the game
// [12:34:56] [Server thread/INFO]: Steve left the game
// [12:34:56] [Server thread/INFO]: <Steve> hello world
// [12:34:56] [Server thread/INFO]: Steve fell from a high place  (advancement/death spam we ignore)
const JOIN_RE = /]: (\w{1,16}) joined the game/;
const LEAVE_RE = /]: (\w{1,16}) left the game/;
const CHAT_RE = /]: <(\w{1,16})> (.+)$/;

class LogWatcher extends EventEmitter {
  constructor(logPath) {
    super();
    this.logPath = logPath;
    this.position = 0;
    this.watcher = null;
  }

  start() {
    if (!this.logPath) {
      console.warn('[logWatcher] MC_LOG_PATH not set, skipping join/leave/chat watching.');
      return;
    }
    try {
      // Start at the end of the file so we don't replay old history on boot.
      const stats = fs.statSync(this.logPath);
      this.position = stats.size;
    } catch (err) {
      console.warn(`[logWatcher] could not stat ${this.logPath}: ${err.message}`);
      return;
    }

    fs.watchFile(this.logPath, { interval: 1000 }, (curr, prev) => {
      this._handleChange(curr, prev);
    });

    console.log(`[logWatcher] watching ${this.logPath}`);
  }

  stop() {
    if (this.logPath) fs.unwatchFile(this.logPath);
  }

  _handleChange(curr, prev) {
    // Log file rotated/truncated (e.g. server restarted) - reset to start.
    if (curr.size < this.position) {
      this.position = 0;
    }
    if (curr.size === this.position) return;

    const stream = fs.createReadStream(this.logPath, {
      start: this.position,
      end: curr.size,
      encoding: 'utf8',
    });

    let buffer = '';
    stream.on('data', (chunk) => { buffer += chunk; });
    stream.on('end', () => {
      this.position = curr.size;
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      for (const line of lines) this._parseLine(line);
    });
    stream.on('error', (err) => {
      console.warn(`[logWatcher] read error: ${err.message}`);
    });
  }

  _parseLine(line) {
    let m = line.match(JOIN_RE);
    if (m) {
      this.emit('join', { username: m[1] });
      return;
    }
    m = line.match(LEAVE_RE);
    if (m) {
      this.emit('leave', { username: m[1] });
      return;
    }
    m = line.match(CHAT_RE);
    if (m) {
      this.emit('chat', { username: m[1], message: m[2] });
    }
  }
}

module.exports = LogWatcher;
