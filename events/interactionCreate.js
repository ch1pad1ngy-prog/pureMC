const tickets = require('../src/ticketManager');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction);
        return;
      }

      if (interaction.isStringSelectMenu() && interaction.customId === 'puremc:ticket-select') {
        const typeId = Number(interaction.values[0]);
        await tickets.openTicket(interaction, typeId);
        return;
      }

      if (interaction.isButton()) {
        if (interaction.customId === 'puremc:ticket-close') {
          await tickets.closeTicket(interaction);
          return;
        }
        if (interaction.customId === 'puremc:ticket-claim') {
          await tickets.claimTicket(interaction);
          return;
        }
      }
    } catch (err) {
      console.error('[interactionCreate] error:', err);
      const payload = { content: 'Something went wrong handling that.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  },
};
