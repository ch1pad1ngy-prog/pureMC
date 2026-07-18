const crypto = require('crypto');
const db = require('./database');

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Look up a Java Edition UUID for a username via the Mojang API. */
async function lookupMojangProfile(username) {
  const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`);
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Mojang API returned ${res.status}`);
  const data = await res.json();
  return { id: data.id, name: data.name }; // id = undashed UUID
}

function generateCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); // e.g. "A1B2C3"
}

function createLinkRequest(discordId, mcUsername, mcUuid) {
  // Clear any previous pending codes for this user.
  db.prepare('DELETE FROM link_codes WHERE discord_id = ?').run(discordId);
  const code = generateCode();
  db.prepare(`
    INSERT INTO link_codes (code, discord_id, mc_username, mc_uuid, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(code, discordId, mcUsername, mcUuid, Date.now() + CODE_TTL_MS);
  return code;
}

/** Called by the chat watcher when someone types "!verify CODE" in-game. */
function tryCompleteLink(username, code) {
  const row = db.prepare('SELECT * FROM link_codes WHERE code = ?').get(code.toUpperCase());
  if (!row) return { ok: false, reason: 'unknown_code' };
  if (row.expires_at < Date.now()) {
    db.prepare('DELETE FROM link_codes WHERE code = ?').run(row.code);
    return { ok: false, reason: 'expired' };
  }
  if (row.mc_username.toLowerCase() !== username.toLowerCase()) {
    return { ok: false, reason: 'wrong_account' };
  }

  db.prepare(`
    INSERT INTO links (discord_id, mc_uuid, mc_username, linked_at)
    VALUES (@discord_id, @mc_uuid, @mc_username, @now)
    ON CONFLICT(discord_id) DO UPDATE SET
      mc_uuid = excluded.mc_uuid,
      mc_username = excluded.mc_username,
      linked_at = excluded.linked_at
  `).run({ discord_id: row.discord_id, mc_uuid: row.mc_uuid, mc_username: row.mc_username, now: Date.now() });

  db.prepare('DELETE FROM link_codes WHERE code = ?').run(row.code);
  return { ok: true, discordId: row.discord_id, mcUsername: row.mc_username };
}

function getLinkByDiscordId(discordId) {
  return db.prepare('SELECT * FROM links WHERE discord_id = ?').get(discordId);
}

function getLinkByUsername(mcUsername) {
  return db.prepare('SELECT * FROM links WHERE LOWER(mc_username) = LOWER(?)').get(mcUsername);
}

function removeLink(discordId) {
  return db.prepare('DELETE FROM links WHERE discord_id = ?').run(discordId);
}

module.exports = {
  lookupMojangProfile,
  createLinkRequest,
  tryCompleteLink,
  getLinkByDiscordId,
  getLinkByUsername,
  removeLink,
};
