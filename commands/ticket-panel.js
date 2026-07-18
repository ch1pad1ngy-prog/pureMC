const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { isStaff } = require('../permissions');
const tickets = require('../src/ticketManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Post the ticket panel (users pick a category to open a ticket)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to post the panel in (defaults to here)')
      .addChannelTypes(ChannelType.GuildText).setRequired(false)),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: "You don't have permission to do that.", ephemeral: true });
    }

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const types = tickets.listTicketTypes();

    if (!types.length) {
      return interaction.reply({ content: 'No ticket categories configured yet. Add some first with `/ticket-types add`.', ephemeral: true });
    }

    await channel.send({
      embeds: [tickets.buildPanelEmbed()],
      components: tickets.buildPanelComponents(),
    });

    await interaction.reply({ content: `Ticket panel posted in ${channel}.`, ephemeral: true });
  },
};
