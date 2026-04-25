import { Client, GatewayIntentBits, PermissionsBitField } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let targetChannelId = null;

// Bot Ready
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Commands
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // ADMIN CHECK
  const isAdmin = message.member?.permissions.has(
    PermissionsBitField.Flags.Administrator
  );

  // SET CHANNEL COMMAND
  if (message.content.startsWith("!setchannel")) {
    if (!isAdmin) return message.reply("❌ Admin only command!");

    const channel = message.mentions.channels.first();
    if (!channel) return message.reply("❌ Mention a channel!");

    targetChannelId = channel.id;
    return message.reply(`✅ Channel set to ${channel}`);
  }

  // FORWARD SYSTEM
  if (targetChannelId) {
    const targetChannel = message.guild.channels.cache.get(targetChannelId);
    if (!targetChannel) return;

    // Send text
    if (message.content) {
      await targetChannel.send(message.content);
    }

    // Send attachments (images/videos/files)
    if (message.attachments.size > 0) {
      message.attachments.forEach(async (att) => {
        await targetChannel.send(att.url);
      });
    }
  }
});

client.login(process.env.TOKEN);
