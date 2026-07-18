const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, COLORS } = require('../src/embeds');
const rcon = require('../src/rcon');
const linking = require('../src/linking');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('online')
    .setDescription('Show who is currently online on the Minecraft server'),

  async execute(interaction) {
    await interaction.deferReply();
    try {
      const { online, max, players } = await rcon.getOnlinePlayers();

      const lines = players.length
        ? players.map((p) => {
            const link = linking.getLinkByUsername(p);
            return link ? `• **${p}** (<@${link.discord_id}>)` : `• **${p}**`;
          }).join('\n')
        : 'Nobody is online right now.';

      const embed = baseEmbed({
        color: COLORS.primary,
        title: `Online Players — ${online}${max ? ` / ${max}` : ''}`,
        description: lines,
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply(`Couldn't reach the server via RCON: ${err.message}`);
    }
  },
};
