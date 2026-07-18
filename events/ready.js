module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`[PureMC] Logged in as ${client.user.tag}`);
    client.user.setActivity('the server', { type: 3 }); // Watching
  },
};
