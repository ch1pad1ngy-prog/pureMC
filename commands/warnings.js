const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { baseEmbed, COLORS } = require('../embeds');
const { isStaff } = require('../permissions');
const db = require('../src/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View or clear a member\'s warnings')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) => sub.setName('list').setDescription('List warnings for a member')
      .addUserOption((opt) => opt.setName('user').setDescription('Member').setRequired(true)))
    .addSubcommand((sub) => sub.setName('clear').setDescription('Clear all warnings for a member')
      .addUserOption((opt) => opt.setName('user').setDescription('Member').setRequired(true))),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: "You don't have permission to do that.", ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');

    if (sub === 'clear') {
      db.prepare('DELETE FROM warnings WHERE discord_id = ?').run(user.id);
      return interaction.reply({ embeds: [baseEmbed({ color: COLORS.primary, description: `Cleared all warnings for ${user.tag}.` })] });
    }

    const rows = db.prepare('SELECT * FROM warnings WHERE discord_id = ? ORDER BY created_at DESC LIMIT 25').all(user.id);
    const description = rows.length
      ? rows.map((r, i) => `**${i + 1}.** ${r.reason} — <t:${Math.floor(r.created_at / 1000)}:R> (by <@${r.moderator_id}>)`).join('\n')
      : 'No warnings on record.';

    await interaction.reply({
      embeds: [baseEmbed({ color: COLORS.warning, title: `Warnings for ${user.tag}`, description })],
    });
  },
};
