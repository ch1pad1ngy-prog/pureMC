const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { baseEmbed, COLORS } = require('../embeds');
const { isStaff } = require('../permissions');
const tickets = require('../src/ticketManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-types')
    .setDescription('Configure the ticket categories users can pick from')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) => sub.setName('add').setDescription('Add or update a ticket category')
      .addStringOption((opt) => opt.setName('name').setDescription('e.g. "Bug Report", "Player Report", "Billing"').setRequired(true))
      .addChannelOption((opt) => opt.setName('category').setDescription('Discord category tickets of this type get created under')
        .addChannelTypes(ChannelType.GuildCategory).setRequired(true))
      .addStringOption((opt) => opt.setName('description').setDescription('Shown to users in the ticket panel').setRequired(false))
      .addStringOption((opt) => opt.setName('emoji').setDescription('Emoji for this category, e.g. 🐛').setRequired(false))
      .addRoleOption((opt) => opt.setName('staff_role').setDescription('Role pinged/given access for this ticket type (defaults to global staff role)').setRequired(false)))
    .addSubcommand((sub) => sub.setName('remove').setDescription('Remove a ticket category')
      .addStringOption((opt) => opt.setName('name').setDescription('Name of the category to remove').setRequired(true)))
    .addSubcommand((sub) => sub.setName('list').setDescription('List all configured ticket categories')),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: "You don't have permission to do that.", ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const name = interaction.options.getString('name');
      const category = interaction.options.getChannel('category');
      const description = interaction.options.getString('description');
      const emoji = interaction.options.getString('emoji');
      const staffRole = interaction.options.getRole('staff_role');

      tickets.addTicketType({
        name,
        emoji,
        description,
        categoryId: category.id,
        staffRoleId: staffRole ? staffRole.id : null,
      });

      return interaction.reply({
        embeds: [baseEmbed({
          color: COLORS.primary,
          title: 'Ticket category saved',
          description: `${emoji || '🎫'} **${name}** → ${category}${staffRole ? `\nStaff role: ${staffRole}` : ''}`,
        })],
        ephemeral: true,
      });
    }

    if (sub === 'remove') {
      const name = interaction.options.getString('name');
      const result = tickets.removeTicketType(name);
      return interaction.reply({
        content: result.changes ? `Removed ticket category "${name}".` : `No ticket category named "${name}" found.`,
        ephemeral: true,
      });
    }

    if (sub === 'list') {
      const types = tickets.listTicketTypes();
      if (!types.length) {
        return interaction.reply({ content: 'No ticket categories configured yet. Use `/ticket-types add`.', ephemeral: true });
      }
      const description = types.map((t) =>
        `${t.emoji || '🎫'} **${t.name}** — ${t.description || 'no description'}\n` +
        `　category: <#${t.category_id}>${t.staff_role_id ? ` • staff: <@&${t.staff_role_id}>` : ''}`,
      ).join('\n\n');

      return interaction.reply({
        embeds: [baseEmbed({ color: COLORS.info, title: 'Ticket Categories', description })],
        ephemeral: true,
      });
    }
  },
};
