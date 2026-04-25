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

// 🔒 STOP if token missing
if (!process.env.TOKEN) {
  console.error("❌ TOKEN missing! Add it in Railway variables.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent // REQUIRED (enable in portal)
  ]
});

// store channels (temporary memory)
let targetChannels = new Set();

// READY
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

    console.log("✅ Slash command registered");
  } catch (err) {
    console.error("❌ Slash command error:", err);
  }
});

// MESSAGE HANDLER
client.on("messageCreate", async (message) => {
  try {
    if (!message.guild || message.author.bot) return;

    const isAdmin = message.member?.permissions?.has(
      PermissionsBitField.Flags.Administrator
    );

    // HELP
    if (message.content === "!help") {
      return message.reply(`
📘 **Commands**
!addchannel #channel → Add channel
!removechannel #channel → Remove channel
!listchannels → Show channels
!help → Show this

📩 Send any message/photo/video → auto forward
🔐 Admin required for setup
      `);
    }

    // ADD CHANNEL
    if (message.content.startsWith("!addchannel")) {
      if (!isAdmin) return message.reply("❌ Admin only");

      const ch = message.mentions.channels.first();
      if (!ch) return message.reply("❌ Mention a channel");

      targetChannels.add(ch.id);
      return message.reply(`✅ Added ${ch}`);
    }

    // REMOVE CHANNEL
    if (message.content.startsWith("!removechannel")) {
      if (!isAdmin) return message.reply("❌ Admin only");

      const ch = message.mentions.channels.first();
      if (!ch) return message.reply("❌ Mention a channel");

      targetChannels.delete(ch.id);
      return message.reply(`🗑️ Removed ${ch}`);
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
      for (const id of targetChannels) {
        const ch = message.guild.channels.cache.get(id);
        if (!ch) continue;

        if (message.content) {
          await ch.send(message.content);
        }

        for (const att of message.attachments.values()) {
          await ch.send(att.url);
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
