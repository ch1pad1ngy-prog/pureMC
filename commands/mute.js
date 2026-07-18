const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { baseEmbed, COLORS } = require('../src/embeds');
const { isStaff } = require('../src/permissions');
const { parseDuration } = require('../src/duration');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a member (mute them) for a duration')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName('user').setDescription('Member to mute').setRequired(true))
    .addStringOption((opt) => opt.setName('duration').setDescription('e.g. 10m, 2h, 1d (max 28d)').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: "You don't have permission to do that.", ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const ms = parseDuration(durationStr);

    if (!ms || ms > 28 * 24 * 60 * 60 * 1000) {
      return interaction.reply({ content: 'Invalid duration. Use formats like `10m`, `2h`, `1d` (max 28d).', ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });

    await member.timeout(ms, reason);

    const embed = baseEmbed({
      color: COLORS.warning,
      title: 'Member Muted',
      description: `**User:** ${user.tag} (${user.id})\n**Duration:** ${durationStr}\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`,
    });

    await interaction.reply({ embeds: [embed] });
    const logChannel = await interaction.guild.channels.fetch(process.env.MOD_LOG_CHANNEL_ID).catch(() => null);
    if (logChannel && logChannel.id !== interaction.channel.id) logChannel.send({ embeds: [embed] });
  },
};
