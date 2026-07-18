const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { baseEmbed, COLORS } = require('../embeds');
const { isStaff } = require('../permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Bulk delete messages in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((opt) => opt.setName('amount').setDescription('Number of messages (1-100)').setRequired(true))
    .addUserOption((opt) => opt.setName('user').setDescription('Only delete messages from this user').setRequired(false)),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: "You don't have permission to do that.", ephemeral: true });
    }

    const amount = interaction.options.getInteger('amount');
    const user = interaction.options.getUser('user');

    if (amount < 1 || amount > 100) {
      return interaction.reply({ content: 'Amount must be between 1 and 100.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    const filtered = user ? messages.filter((m) => m.author.id === user.id) : messages;
    const toDelete = [...filtered.values()].slice(0, amount);

    const deleted = await interaction.channel.bulkDelete(toDelete, true).catch(() => null);

    await interaction.editReply(
      deleted ? `Deleted ${deleted.size} message(s)${user ? ` from ${user.tag}` : ''}.` : 'Nothing to delete (messages may be older than 14 days).',
    );
  },
};
