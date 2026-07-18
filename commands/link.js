const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, COLORS } = require('../embeds');
const linking = require('../linking');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Discord account to your Minecraft account')
    .addStringOption((opt) => opt.setName('username').setDescription('Your Minecraft (Java) username').setRequired(true)),

  async execute(interaction) {
    const username = interaction.options.getString('username');
    await interaction.deferReply({ ephemeral: true });

    let profile;
    try {
      profile = await linking.lookupMojangProfile(username);
    } catch (err) {
      return interaction.editReply(`Couldn't reach Mojang's API right now (${err.message}). Try again shortly.`);
    }

    if (!profile) {
      return interaction.editReply(`No Minecraft account found with the username \`${username}\`. Double-check the spelling.`);
    }

    const code = linking.createLinkRequest(interaction.user.id, profile.name, profile.id);

    const embed = baseEmbed({
      color: COLORS.info,
      title: 'Almost done!',
      description:
        `Join the server and type the following in **in-game chat**:\n\n` +
        `\`\`\`!verify ${code}\`\`\`\n` +
        `This code expires in 10 minutes. Once you send it, I'll confirm the link here on Discord.`,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
