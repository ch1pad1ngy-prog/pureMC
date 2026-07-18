const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { baseEmbed, COLORS } = require('../embeds');
const { isStaff } = require('../permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by their Discord ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((opt) => opt.setName('user_id').setDescription('The Discord user ID to unban').setRequired(true)),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: "You don't have permission to do that.", ephemeral: true });
    }

    const userId = interaction.options.getString('user_id');
    try {
      await interaction.guild.members.unban(userId);
    } catch (err) {
      return interaction.reply({ content: `Couldn't unban that ID: ${err.message}`, ephemeral: true });
    }

    const embed = baseEmbed({
      color: COLORS.primary,
      title: 'Member Unbanned',
      description: `**User ID:** ${userId}\n**Moderator:** ${interaction.user.tag}`,
    });

    await interaction.reply({ embeds: [embed] });
    const logChannel = await interaction.guild.channels.fetch(process.env.MOD_LOG_CHANNEL_ID).catch(() => null);
    if (logChannel && logChannel.id !== interaction.channel.id) logChannel.send({ embeds: [embed] });
  },
};
