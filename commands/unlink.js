const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, COLORS } = require('../embeds');
const linking = require('../linking');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlink')
    .setDescription('Unlink your Minecraft account from Discord'),

  async execute(interaction) {
    const existing = linking.getLinkByDiscordId(interaction.user.id);
    if (!existing) {
      return interaction.reply({ content: "You don't have a linked Minecraft account.", ephemeral: true });
    }
    linking.removeLink(interaction.user.id);
    await interaction.reply({
      embeds: [baseEmbed({ color: COLORS.warning, description: `Unlinked \`${existing.mc_username}\` from your Discord account.` })],
      ephemeral: true,
    });
  },
};
