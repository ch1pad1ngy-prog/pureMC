const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, COLORS } = require('../src/embeds');
const linking = require('../src/linking');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whois')
    .setDescription('Look up a Discord <-> Minecraft account link')
    .addUserOption((opt) => opt.setName('discord_user').setDescription('A Discord member').setRequired(false))
    .addStringOption((opt) => opt.setName('mc_username').setDescription('A Minecraft username').setRequired(false)),

  async execute(interaction) {
    const discordUser = interaction.options.getUser('discord_user');
    const mcUsername = interaction.options.getString('mc_username');

    if (!discordUser && !mcUsername) {
      return interaction.reply({ content: 'Provide either a Discord user or a Minecraft username.', ephemeral: true });
    }

    const link = discordUser
      ? linking.getLinkByDiscordId(discordUser.id)
      : linking.getLinkByUsername(mcUsername);

    if (!link) {
      return interaction.reply({ content: 'No linked account found.', ephemeral: true });
    }

    const embed = baseEmbed({
      color: COLORS.info,
      title: 'Account Link',
      description: `<@${link.discord_id}> ↔ **${link.mc_username}**\nLinked <t:${Math.floor(link.linked_at / 1000)}:R>`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
