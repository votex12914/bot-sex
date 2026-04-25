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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Store multiple channels
let targetChannels = new Set();

// Ready
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Register slash command
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
});

// MESSAGE COMMANDS
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const isAdmin = message.member?.permissions.has(
    PermissionsBitField.Flags.Administrator
  );

  // HELP COMMAND
  if (message.content === "!help") {
    return message.reply(`
📘 **Bot Commands**
!addchannel #channel → Add channel
!removechannel #channel → Remove channel
!listchannels → Show all channels
!help → Show this menu

🔐 Admin only for setup
📩 Send any message/media → auto forward
    `);
  }

  // ADD CHANNEL
  if (message.content.startsWith("!addchannel")) {
    if (!isAdmin) return message.reply("❌ Admin only!");

    const channel = message.mentions.channels.first();
    if (!channel) return message.reply("❌ Mention a channel!");

    targetChannels.add(channel.id);
    return message.reply(`✅ Added ${channel}`);
  }

  // REMOVE CHANNEL
  if (message.content.startsWith("!removechannel")) {
    if (!isAdmin) return message.reply("❌ Admin only!");

    const channel = message.mentions.channels.first();
    if (!channel) return message.reply("❌ Mention a channel!");

    targetChannels.delete(channel.id);
    return message.reply(`🗑️ Removed ${channel}`);
  }

  // LIST CHANNELS
  if (message.content === "!listchannels") {
    if (targetChannels.size === 0) {
      return message.reply("❌ No channels set");
    }

    let list = "📢 **Channels:**\n";
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

      if (message.attachments.size > 0) {
        message.attachments.forEach(async (att) => {
          await targetChannel.send(att.url);
        });
      }
    }
  }
});

// SLASH COMMAND
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "help") {
    await interaction.reply(`
📘 **Bot Commands**
!addchannel #channel
!removechannel #channel
!listchannels
!help

💡 Send message/media → auto forward to all added channels
    `);
  }
});

client.login(process.env.TOKEN);
