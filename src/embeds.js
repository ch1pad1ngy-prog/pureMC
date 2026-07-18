const { EmbedBuilder } = require('discord.js');

const BRAND = 'PureMC';
const COLORS = {
  primary: 0x2ecc71,
  danger: 0xe74c3c,
  warning: 0xf1c40f,
  info: 0x3498db,
  neutral: 0x2b2d31,
};

function baseEmbed({ color = COLORS.neutral, title, description } = {}) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: BRAND })
    .setTimestamp();
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

module.exports = { baseEmbed, COLORS, BRAND };
