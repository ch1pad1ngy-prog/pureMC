#!/usr/bin/env node
/**
 * PureMC log forwarder
 * -----------------------------------------------------------------------
 * Runs ON THE MINECRAFT SERVER'S MACHINE (not on Railway). Tails the
 * server's logs/latest.log and POSTs join/leave/chat lines to the PureMC
 * Discord bot's webhook endpoint, so the bot can live somewhere else
 * entirely (e.g. Railway) while still reacting to what happens in-game.
 *
 * Zero npm dependencies - only Node.js builtins - so there's nothing to
 * `npm install` here. Just needs Node 18+.
 *
 * Configure via forwarder.env (copy from forwarder.env.example) in the
 * same directory, or via real environment variables - either works.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// ---- tiny .env loader (no dependency needed) ----
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, 'forwarder.env'));

const WEBHOOK_URL = process.env.WEBHOOK_URL; // e.g. https://your-bot.up.railway.app/events
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const MC_LOG_PATH = process.env.MC_LOG_PATH; // e.g. /home/minecraft/server/logs/latest.log

if (!WEBHOOK_URL || !WEBHOOK_SECRET || !MC_LOG_PATH) {
  console.error('Missing required config. Set WEBHOOK_URL, WEBHOOK_SECRET, and MC_LOG_PATH in forwarder.env');
  process.exit(1);
}

const JOIN_RE = /]: (\w{1,16}) joined the game/;
const LEAVE_RE = /]: (\w{1,16}) left the game/;
const CHAT_RE = /]: <(\w{1,16})> (.+)$/;

function post(payload) {
  const body = JSON.stringify(payload);
  const target = new URL(WEBHOOK_URL);
  const lib = target.protocol === 'https:' ? https : http;

  const req = lib.request(target, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'x-puremc-secret': WEBHOOK_SECRET,
    },
    timeout: 10_000,
  }, (res) => {
    res.resume(); // drain response, we don't need the body
    if (res.statusCode >= 300) {
      console.warn(`[forwarder] webhook responded with ${res.statusCode} for ${payload.type}:${payload.username}`);
    }
  });

  req.on('error', (err) => console.warn(`[forwarder] webhook request failed: ${err.message}`));
  req.on('timeout', () => req.destroy());
  req.write(body);
  req.end();
}

function parseLine(line) {
  let m = line.match(JOIN_RE);
  if (m) return post({ type: 'join', username: m[1] });

  m = line.match(LEAVE_RE);
  if (m) return post({ type: 'leave', username: m[1] });

  m = line.match(CHAT_RE);
  if (m) return post({ type: 'chat', username: m[1], message: m[2] });
}

let position = 0;
try {
  position = fs.statSync(MC_LOG_PATH).size; // start at end, don't replay history
} catch (err) {
  console.error(`Can't read ${MC_LOG_PATH}: ${err.message}`);
  process.exit(1);
}

fs.watchFile(MC_LOG_PATH, { interval: 1000 }, (curr) => {
  if (curr.size < position) position = 0; // log rotated/truncated (server restarted)
  if (curr.size === position) return;

  const stream = fs.createReadStream(MC_LOG_PATH, { start: position, end: curr.size, encoding: 'utf8' });
  let buffer = '';
  stream.on('data', (chunk) => { buffer += chunk; });
  stream.on('end', () => {
    position = curr.size;
    for (const line of buffer.split(/\r?\n/).filter(Boolean)) parseLine(line);
  });
  stream.on('error', (err) => console.warn(`[forwarder] read error: ${err.message}`));
});

console.log(`[forwarder] watching ${MC_LOG_PATH}, forwarding to ${WEBHOOK_URL}`);
