const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { baseEmbed, COLORS } = require('../embeds');
const { isStaff } = require('../permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove a timeout from a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName('user').setDescription('Member to unmute').setRequired(true)),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: "You don't have permission to do that.", ephemeral: true });
    }

    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });

    await member.timeout(null);

    const embed = baseEmbed({
      color: COLORS.primary,
      title: 'Member Unmuted',
      description: `**User:** ${user.tag} (${user.id})\n**Moderator:** ${interaction.user.tag}`,
    });

    await interaction.reply({ embeds: [embed] });
    const logChannel = await interaction.guild.channels.fetch(process.env.MOD_LOG_CHANNEL_ID).catch(() => null);
    if (logChannel && logChannel.id !== interaction.channel.id) logChannel.send({ embeds: [embed] });
  },
};
