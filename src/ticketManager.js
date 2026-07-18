const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const db = require('./database');
const { baseEmbed, COLORS } = require('./embeds');

function listTicketTypes() {
  return db.prepare('SELECT * FROM ticket_types ORDER BY id ASC').all();
}

function getTicketType(name) {
  return db.prepare('SELECT * FROM ticket_types WHERE name = ?').get(name);
}

function addTicketType({ name, emoji, description, categoryId, staffRoleId }) {
  db.prepare(`
    INSERT INTO ticket_types (name, emoji, description, category_id, staff_role_id)
    VALUES (@name, @emoji, @description, @categoryId, @staffRoleId)
    ON CONFLICT(name) DO UPDATE SET
      emoji = excluded.emoji,
      description = excluded.description,
      category_id = excluded.category_id,
      staff_role_id = excluded.staff_role_id
  `).run({ name, emoji: emoji || null, description: description || null, categoryId: categoryId || null, staffRoleId: staffRoleId || null });
}

function removeTicketType(name) {
  return db.prepare('DELETE FROM ticket_types WHERE name = ?').run(name);
}

function buildPanelEmbed() {
  const types = listTicketTypes();
  const lines = types.length
    ? types.map((t) => `${t.emoji || '🎫'} **${t.name}** — ${t.description || 'Open a ticket for this'}`).join('\n')
    : 'No ticket categories configured yet.';

  return baseEmbed({
    color: COLORS.info,
    title: 'Need help? Open a ticket',
    description: `Pick a category below and we'll create a private channel for you.\n\n${lines}`,
  });
}

function buildPanelComponents() {
  const types = listTicketTypes();
  if (!types.length) return [];

  const menu = new StringSelectMenuBuilder()
    .setCustomId('puremc:ticket-select')
    .setPlaceholder('Choose a ticket category...')
    .addOptions(types.slice(0, 25).map((t) => ({
      label: t.name,
      value: String(t.id),
      description: t.description ? t.description.slice(0, 100) : undefined,
      emoji: t.emoji || undefined,
    })));

  return [new ActionRowBuilder().addComponents(menu)];
}

async function openTicket(interaction, typeId) {
  const type = db.prepare('SELECT * FROM ticket_types WHERE id = ?').get(typeId);
  const guild = interaction.guild;

  // Prevent a user from opening two tickets of the same type at once.
  const existing = db.prepare(`
    SELECT * FROM tickets WHERE user_id = ? AND type_id = ? AND status = 'open'
  `).get(interaction.user.id, typeId);

  if (existing) {
    const channel = guild.channels.cache.get(existing.channel_id);
    if (channel) {
      return interaction.reply({ content: `You already have an open ticket: ${channel}`, ephemeral: true });
    }
  }

  const categoryId = type?.category_id || process.env.TICKET_CATEGORY_ID || null;
  const staffRoleId = type?.staff_role_id || process.env.STAFF_ROLE_ID || null;

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    },
  ];
  if (staffRoleId) {
    overwrites.push({
      id: staffRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20) || 'user';
  const channel = await guild.channels.create({
    name: `${type ? type.name.toLowerCase().replace(/[^a-z0-9-]/g, '') : 'ticket'}-${safeName}`,
    type: ChannelType.GuildText,
    parent: categoryId || undefined,
    permissionOverwrites: overwrites,
  });

  db.prepare(`
    INSERT INTO tickets (channel_id, user_id, type_id, status, created_at)
    VALUES (?, ?, ?, 'open', ?)
  `).run(channel.id, interaction.user.id, typeId, Date.now());

  const embed = baseEmbed({
    color: COLORS.info,
    title: `${type?.emoji || '🎫'} ${type ? type.name : 'Ticket'}`,
    description: `Hi ${interaction.user}, thanks for reaching out. Staff${staffRoleId ? ` (<@&${staffRoleId}>)` : ''} will be with you shortly.\n\nDescribe your issue in as much detail as you can.`,
  });

  const closeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('puremc:ticket-claim').setLabel('Claim').setStyle(ButtonStyle.Secondary).setEmoji('🙋'),
    new ButtonBuilder().setCustomId('puremc:ticket-close').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
  );

  await channel.send({ content: staffRoleId ? `<@&${staffRoleId}>` : undefined, embeds: [embed], components: [closeRow] });
  await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
}

async function claimTicket(interaction) {
  const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(interaction.channel.id);
  if (!ticket) return interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });

  db.prepare('UPDATE tickets SET claimed_by = ? WHERE channel_id = ?').run(interaction.user.id, interaction.channel.id);
  await interaction.reply({ embeds: [baseEmbed({ color: COLORS.info, description: `🙋 ${interaction.user} claimed this ticket.` })] });
}

async function closeTicket(interaction) {
  const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(interaction.channel.id);
  if (!ticket) return interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });

  await interaction.reply({ embeds: [baseEmbed({ color: COLORS.warning, description: 'Closing this ticket in 5 seconds...' })] });

  db.prepare(`UPDATE tickets SET status = 'closed' WHERE channel_id = ?`).run(interaction.channel.id);

  const logChannelId = process.env.TICKET_LOG_CHANNEL_ID;
  if (logChannelId) {
    try {
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const transcript = [...messages.values()]
        .reverse()
        .map((m) => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`)
        .join('\n') || '(no messages)';

      const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
      if (logChannel) {
        const buffer = Buffer.from(transcript, 'utf8');
        await logChannel.send({
          embeds: [baseEmbed({
            color: COLORS.neutral,
            title: 'Ticket closed',
            description: `Channel: #${interaction.channel.name}\nOpened by: <@${ticket.user_id}>\nClosed by: ${interaction.user}`,
          })],
          files: [{ attachment: buffer, name: `${interaction.channel.name}-transcript.txt` }],
        });
      }
    } catch (err) {
      console.warn(`[ticketManager] transcript failed: ${err.message}`);
    }
  }

  setTimeout(() => {
    interaction.channel.delete().catch(() => {});
  }, 5000);
}

module.exports = {
  listTicketTypes,
  getTicketType,
  addTicketType,
  removeTicketType,
  buildPanelEmbed,
  buildPanelComponents,
  openTicket,
  claimTicket,
  closeTicket,
};
