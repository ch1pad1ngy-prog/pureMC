const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { baseEmbed, COLORS } = require('../embeds');
const { isStaff } = require('../permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channel')
    .setDescription('Channel moderation utilities')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((sub) => sub.setName('lock').setDescription('Prevent @everyone from sending messages here'))
    .addSubcommand((sub) => sub.setName('unlock').setDescription('Allow @everyone to send messages here again'))
    .addSubcommand((sub) => sub.setName('slowmode').setDescription('Set slowmode for this channel')
      .addIntegerOption((opt) => opt.setName('seconds').setDescription('0 to disable, max 21600').setRequired(true))),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: "You don't have permission to do that.", ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();
    const everyone = interaction.guild.roles.everyone;

    if (sub === 'lock') {
      await interaction.channel.permissionOverwrites.edit(everyone, { SendMessages: false });
      return interaction.reply({ embeds: [baseEmbed({ color: COLORS.danger, description: '🔒 Channel locked.' })] });
    }

    if (sub === 'unlock') {
      await interaction.channel.permissionOverwrites.edit(everyone, { SendMessages: null });
      return interaction.reply({ embeds: [baseEmbed({ color: COLORS.primary, description: '🔓 Channel unlocked.' })] });
    }

    if (sub === 'slowmode') {
      const seconds = interaction.options.getInteger('seconds');
      if (seconds < 0 || seconds > 21600) {
        return interaction.reply({ content: 'Slowmode must be between 0 and 21600 seconds.', ephemeral: true });
      }
      await interaction.channel.setRateLimitPerUser(seconds);
      return interaction.reply({
        embeds: [baseEmbed({ color: COLORS.info, description: seconds === 0 ? 'Slowmode disabled.' : `Slowmode set to ${seconds}s.` })],
      });
    }
  },
};
