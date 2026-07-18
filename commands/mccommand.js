const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { baseEmbed, COLORS } = require('../src/embeds');
const { isStaff } = require('../src/permissions');
const rcon = require('../src/rcon');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mccommand')
    .setDescription('Run a raw command on the Minecraft server via RCON (staff only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) => opt.setName('command').setDescription('e.g. "say hello", "whitelist add Steve"').setRequired(true)),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: "You don't have permission to do that.", ephemeral: true });
    }

    const command = interaction.options.getString('command');
    await interaction.deferReply();

    try {
      const result = await rcon.sendCommand(command);
      await interaction.editReply({
        embeds: [baseEmbed({
          color: COLORS.neutral,
          title: `/${command}`,
          description: '```' + (result || '(no output)').slice(0, 1900) + '```',
        })],
      });
    } catch (err) {
      await interaction.editReply(`RCON error: ${err.message}`);
    }
  },
};
