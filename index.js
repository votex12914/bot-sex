require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const util = require("minecraft-server-util");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

const SERVER_IP = process.env.MC_IP;
const SERVER_PORT = parseInt(process.env.MC_PORT);
const CHANNEL_ID = process.env.CHANNEL_ID;
const GIF_URL = process.env.GIF_URL;

let lastStatus = "unknown";

client.once("ready", () => {
  console.log(`✅ Bot Logged in as ${client.user.tag}`);
  checkServer();
  setInterval(checkServer, 10000); // 10s refresh
});

async function checkServer() {
  try {
    const res = await util.status(SERVER_IP, SERVER_PORT);

    const embed = new EmbedBuilder()
      .setTitle("🟢 Minecraft Server Online")
      .setDescription(`Server is running!`)
      .addFields(
        { name: "IP", value: `${SERVER_IP}:${SERVER_PORT}`, inline: true },
        { name: "Players", value: `${res.players.online}/${res.players.max}`, inline: true }
      )
      .setColor("Green")
      .setImage(GIF_URL)
      .setTimestamp();

    const channel = await client.channels.fetch(CHANNEL_ID);
    if (channel) {
      channel.send({ embeds: [embed] });
    }

    lastStatus = "online";

  } catch (err) {
    // SERVER OFFLINE
    if (lastStatus !== "offline") {
      console.log("❌ Server is OFFLINE");

      const embed = new EmbedBuilder()
        .setTitle("🔴 Minecraft Server Offline")
        .setDescription("Server is currently down!")
        .setColor("Red")
        .setImage(GIF_URL)
        .setTimestamp();

      const channel = await client.channels.fetch(CHANNEL_ID);
      if (channel) {
        channel.send({ embeds: [embed] });
      }

      // DM ALL MEMBERS (best effort)
      const guilds = client.guilds.cache;

      guilds.forEach(guild => {
        guild.members.fetch().then(members => {
          members.forEach(member => {
            member.send("⚠️ Server is OFFLINE!").catch(() => {});
          });
        });
      });

      lastStatus = "offline";
    }
  }
}

client.login(process.env.TOKEN);
