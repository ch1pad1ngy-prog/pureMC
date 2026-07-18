const http = require('http');
const { EventEmitter } = require('events');

/**
 * Lightweight HTTP server (no framework needed) that receives join/leave/chat
 * events forwarded from a small script running on the actual Minecraft VPS.
 * This is what lets join/leave posts + !verify linking keep working even
 * though the bot itself runs somewhere else (e.g. Railway) with no access
 * to the Minecraft server's log file.
 */
class WebhookServer extends EventEmitter {
  constructor({ port, secret }) {
    super();
    this.port = port;
    this.secret = secret;
    this.server = null;
  }

  start() {
    this.server = http.createServer((req, res) => {
      // Simple health check so Railway/uptime pings don't 404 loudly.
      if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end('PureMC is running.');
      }

      if (req.method !== 'POST' || req.url !== '/events') {
        res.writeHead(404);
        return res.end();
      }

      if (this.secret && req.headers['x-puremc-secret'] !== this.secret) {
        res.writeHead(401);
        return res.end('unauthorized');
      }

      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1_000_000) req.destroy(); // guard against absurd payloads
      });

      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          if (payload.type === 'join' && payload.username) {
            this.emit('join', { username: payload.username });
          } else if (payload.type === 'leave' && payload.username) {
            this.emit('leave', { username: payload.username });
          } else if (payload.type === 'chat' && payload.username && payload.message) {
            this.emit('chat', { username: payload.username, message: payload.message });
          }
          res.writeHead(200);
          res.end('ok');
        } catch (err) {
          res.writeHead(400);
          res.end('bad request');
        }
      });
    });

    this.server.listen(this.port, () => {
      console.log(`[webhookServer] listening on port ${this.port}`);
    });
  }
}

module.exports = WebhookServer;
