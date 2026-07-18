const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { baseEmbed, COLORS } = require('../embeds');
const { isStaff } = require('../permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((opt) => opt.setName('user').setDescription('Member to kick').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: "You don't have permission to do that.", ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    if (!member.kickable) return interaction.reply({ content: "I can't kick that member (role hierarchy).", ephemeral: true });

    await member.kick(reason);

    const embed = baseEmbed({
      color: COLORS.warning,
      title: 'Member Kicked',
      description: `**User:** ${user.tag} (${user.id})\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`,
    });

    await interaction.reply({ embeds: [embed] });
    const logChannel = await interaction.guild.channels.fetch(process.env.MOD_LOG_CHANNEL_ID).catch(() => null);
    if (logChannel && logChannel.id !== interaction.channel.id) logChannel.send({ embeds: [embed] });
  },
};
