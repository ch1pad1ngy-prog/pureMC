const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { baseEmbed, COLORS } = require('../src/embeds');
const { isStaff } = require('../src/permissions');
const db = require('../src/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member (logged, does not remove them)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName('user').setDescription('Member to warn').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason').setRequired(true)),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: "You don't have permission to do that.", ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    db.prepare(`
      INSERT INTO warnings (discord_id, moderator_id, reason, created_at)
      VALUES (?, ?, ?, ?)
    `).run(user.id, interaction.user.id, reason, Date.now());

    const count = db.prepare('SELECT COUNT(*) AS c FROM warnings WHERE discord_id = ?').get(user.id).c;

    const embed = baseEmbed({
      color: COLORS.warning,
      title: 'Member Warned',
      description: `**User:** ${user.tag} (${user.id})\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}\n**Total warnings:** ${count}`,
    });

    await interaction.reply({ embeds: [embed] });
    await user.send({ embeds: [baseEmbed({ color: COLORS.warning, title: 'You received a warning', description: `**Reason:** ${reason}` })] }).catch(() => {});

    const logChannel = await interaction.guild.channels.fetch(process.env.MOD_LOG_CHANNEL_ID).catch(() => null);
    if (logChannel && logChannel.id !== interaction.channel.id) logChannel.send({ embeds: [embed] });
  },
};
