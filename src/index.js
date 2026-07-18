require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { baseEmbed, COLORS } = require('./embeds');
const LogWatcher = require('./logWatcher');
const WebhookServer = require('./webhookServer');
const linking = require('./linking');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ---- Load slash commands ----
client.commands = new Collection();
const commandsDir = path.join(__dirname, '..', 'commands');
for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsDir, file));
  client.commands.set(command.data.name, command);
}

// ---- Load events ----
const eventsDir = path.join(__dirname, '..', 'events');
for (const file of fs.readdirSync(eventsDir).filter((f) => f.endsWith('.js'))) {
  const event = require(path.join(eventsDir, file));
  if (event.once) client.once(event.name, (...args) => event.execute(...args));
  else client.on(event.name, (...args) => event.execute(...args));
}

// ---- Minecraft log watcher: join/leave posts + !verify handling ----
async function getActivityChannel() {
  const id = process.env.MC_ACTIVITY_CHANNEL_ID;
  if (!id) return null;
  return client.channels.fetch(id).catch(() => null);
}

async function handleJoin({ username }) {
  const link = linking.getLinkByUsername(username);
  const channel = await getActivityChannel();
  if (!channel) return;
  channel.send({
    embeds: [baseEmbed({
      color: COLORS.primary,
      description: `🟢 **${username}** joined the server${link ? ` (<@${link.discord_id}>)` : ''}`,
    })],
  }).catch(() => {});
}

async function handleLeave({ username }) {
  const channel = await getActivityChannel();
  if (!channel) return;
  channel.send({
    embeds: [baseEmbed({ color: COLORS.danger, description: `🔴 **${username}** left the server` })],
  }).catch(() => {});
}

async function handleChat({ username, message }) {
  const verifyMatch = message.trim().match(/^!verify\s+([A-Za-z0-9]{4,8})$/i);
  if (!verifyMatch) return;

  const result = linking.tryCompleteLink(username, verifyMatch[1]);
  if (!result.ok) return; // wrong/expired code, silently ignore in chat

  try {
    const user = await client.users.fetch(result.discordId);
    await user.send({
      embeds: [baseEmbed({
        color: COLORS.primary,
        title: 'Account linked!',
        description: `Your Discord account is now linked to **${result.mcUsername}**.`,
      })],
    });
  } catch {
    // DMs closed - that's fine, the link still succeeded.
  }
}

function attachMcEventHandlers(emitter) {
  emitter.on('join', handleJoin);
  emitter.on('leave', handleLeave);
  emitter.on('chat', handleChat);
}

// ---- Option A: bot and MC server share a filesystem (MC_LOG_PATH is set) ----
if (process.env.MC_LOG_PATH) {
  const watcher = new LogWatcher(process.env.MC_LOG_PATH);
  attachMcEventHandlers(watcher);
  watcher.start();
}

// ---- Option B: bot runs elsewhere (e.g. Railway) and a forwarder script on
// the MC VPS POSTs events to us instead (see /forwarder in this repo) ----
if (process.env.WEBHOOK_SECRET) {
  const webhookServer = new WebhookServer({
    port: Number(process.env.PORT) || 3000,
    secret: process.env.WEBHOOK_SECRET,
  });
  attachMcEventHandlers(webhookServer);
  webhookServer.start();
}

client.login(process.env.DISCORD_TOKEN);
