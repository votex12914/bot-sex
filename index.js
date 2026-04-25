import {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.TOKEN) {
  console.error("❌ TOKEN missing in .env or Railway Variables!");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// store channels
let targetChannels = new Set();

// BOT READY
client.once("ready", async () => {
  console.log(`✅ Bot online: ${client.user.tag}`);

  // register slash command
  try {
    const commands = [
      new SlashCommandBuilder()
        .setName("help")
        .setDescription("Show all commands")
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );

    console.log("✅ Slash commands registered");
  } catch (err) {
    console.error("❌ Slash command error:", err);
  }
});

// MESSAGE EVENTS
client.on("messageCreate", async (message) => {
  try {
    if (!message.guild || message.author.bot) return;

    const isAdmin = message.member?.permissions?.has(
      PermissionsBitField.Flags.Administrator
    );

    // HELP COMMAND
    if (message.content === "!help") {
      return message.reply(`
📘 **Commands**
!addchannel #channel → Add channel
!removechannel #channel → Remove channel
!listchannels → Show channels
!help → Show this

🔐 Admin only setup
📩 Send any message/photo/video → auto forward
      `);
    }

    // ADD CHANNEL
    if (message.content.startsWith("!addchannel")) {
      if (!isAdmin) return message.reply("❌ Admin only");

      const channel = message.mentions.channels.first();
      if (!channel) return message.reply("❌ Mention a channel");

      targetChannels.add(channel.id);
      return message.reply(`✅ Added ${channel}`);
    }

    // REMOVE CHANNEL
    if (message.content.startsWith("!removechannel")) {
      if (!isAdmin) return message.reply("❌ Admin only");

      const channel = message.mentions.channels.first();
      if (!channel) return message.reply("❌ Mention a channel");

      targetChannels.delete(channel.id);
      return message.reply(`🗑️ Removed ${channel}`);
    }

    // LIST CHANNELS
    if (message.content === "!listchannels") {
      if (targetChannels.size === 0) {
        return message.reply("❌ No channels set");
      }

      let list = "📢 Channels:\n";
      targetChannels.forEach(id => {
        list += `<#${id}>\n`;
      });

      return message.reply(list);
    }

    // FORWARD SYSTEM
    if (targetChannels.size > 0) {
      for (const channelId of targetChannels) {
        const targetChannel = message.guild.channels.cache.get(channelId);
        if (!targetChannel) continue;

        if (message.content) {
          await targetChannel.send(message.content);
        }

        for (const att of message.attachments.values()) {
          await targetChannel.send(att.url);
        }
      }
    }

  } catch (err) {
    console.error("❌ Message error:", err);
  }
});

// SLASH COMMAND
client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "help") {
      await interaction.reply(`
📘 **Commands**
!addchannel #channel
!removechannel #channel
!listchannels
!help

📩 Send message/media → auto forward
      `);
    }
  } catch (err) {
    console.error("❌ Slash error:", err);
  }
});

// LOGIN
client.login(process.env.TOKEN)
  .then(() => console.log("🔑 Login success"))
  .catch(err => console.error("❌ Login failed:", err));
