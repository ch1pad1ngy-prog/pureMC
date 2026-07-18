const { Rcon } = require('rcon-client');

let client = null;
let connecting = null;

async function getClient() {
  if (client && client.socket && !client.socket.destroyed) return client;
  if (connecting) return connecting;

  connecting = Rcon.connect({
    host: process.env.RCON_HOST,
    port: Number(process.env.RCON_PORT || 25575),
    password: process.env.RCON_PASSWORD,
  }).then((c) => {
    client = c;
    client.on('end', () => { client = null; });
    connecting = null;
    return client;
  }).catch((err) => {
    connecting = null;
    throw err;
  });

  return connecting;
}

/** Send a raw command to the server and return its text response. */
async function sendCommand(command) {
  const c = await getClient();
  return c.send(command);
}

/**
 * Ask the server who's online via the vanilla `list` command and
 * parse it into a clean array of player names.
 * Works with vanilla / Paper / Spigot's default "list" response:
 *   "There are 3 of a max of 20 players online: Steve, Alex, Herobrine"
 */
async function getOnlinePlayers() {
  const raw = await sendCommand('list');
  const match = raw.match(/players online:\s*(.*)$/i);
  const namesPart = match ? match[1].trim() : '';
  const players = namesPart.length ? namesPart.split(',').map((n) => n.trim()) : [];

  const countMatch = raw.match(/There are (\d+) of a max of (\d+)/i);
  const online = countMatch ? Number(countMatch[1]) : players.length;
  const max = countMatch ? Number(countMatch[2]) : null;

  return { online, max, players, raw };
}

module.exports = { sendCommand, getOnlinePlayers, getClient };
