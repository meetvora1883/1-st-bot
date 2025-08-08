const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, REST, Routes } = require('discord.js');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Add port for Render.com
const PORT = process.env.PORT || 3000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers
  ]
});

// Configuration
const CONFIG = {
  POV_CHANNEL_ID: process.env.POV_CHANNEL_ID || '1398888616532643860',
  OUTPUT_CHANNEL_ID: process.env.OUTPUT_CHANNEL_ID || '1398888616532643861',
  ADMIN_ROLE_IDS: process.env.ADMIN_ROLE_IDS ? process.env.ADMIN_ROLE_IDS.split(',') : ['1368991091868700773', '1368991334513508532'],
  BOT_PREFIX: process.env.BOT_PREFIX || '!',
  COMMAND_CHANNEL_ID: process.env.COMMAND_CHANNEL_ID || null,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  BONUS_LOG_CHANNEL_ID: process.env.BONUS_LOG_CHANNEL_ID || '1398888616532643862',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017'
};

// MongoDB setup
let db;
let bonusCollection;
async function connectToMongoDB() {
  try {
    const mongoClient = new MongoClient(CONFIG.MONGODB_URI);
    await mongoClient.connect();
    db = mongoClient.db('discord_bot');
    bonusCollection = db.collection('bonus_data');
    console.log(`\x1b[32m[${new Date().toISOString()}] ✅ Connected to MongoDB\x1b[0m`);
  } catch (error) {
    console.error(`\x1b[31m[${new Date().toISOString()}] ❌ MongoDB connection failed: ${error}\x1b[0m`);
    process.exit(1);
  }
}

// Event names
const EVENT_NAMES = [
  "Family raid", "State Object", "Turf", "Store robbery", "Caravan delivery",
  "Attacking Prison", "ℍ𝕒𝕣𝕓𝕠𝕣 (battle for the docks)", "𝕎𝕖𝕒𝕡𝕠𝕟𝕤 𝔽𝕒𝕔𝕥𝕠𝕣𝕪", "𝔻𝕣𝕦𝕘 𝕃𝕒𝕓",
  "𝔽𝕒𝕔𝕥𝕠𝕣𝕪 𝕠𝕗 ℝℙ 𝕥𝕚𝕔𝕜𝕖𝕥𝕤", "𝔽𝕠𝕦𝕟𝕕𝕣𝕪", "𝕄𝕒𝕝𝕝", "𝔹𝕦𝕤𝕚𝕟𝕖𝕤𝕤 𝕎𝕒𝕣",
  "𝕍𝕚𝕟𝕖𝕪𝕒𝕣𝕕", "𝔸𝕥𝕥𝕒𝕔𝕜𝕚𝕟𝕘 ℙ𝕣𝕚𝕤𝕠𝕟 (𝕠𝕟 𝔽𝕣𝕚𝕕𝕒𝕪)", "𝕂𝕚𝕟𝕘 𝕆𝕗 ℂ𝕒𝕪𝕠 ℙ𝕖𝕣𝕚𝕔𝕠 𝕀𝕤𝕝𝕒𝕟𝕕 (𝕠𝕟 𝕎𝕖𝕕𝕟𝕖𝕤𝕕𝕒𝕪 𝕒𝕟𝕕 𝕊𝕦𝕟𝕕𝕒𝕪)",
  "𝕃𝕖𝕗𝕥𝕠𝕧𝕖𝕣 ℂ𝕠𝕞𝕡𝕠𝕟𝕖𝕟𝕥𝕤", "ℝ𝕒𝕥𝕚𝕟𝕘 𝔹𝕒𝕥𝕥𝕝𝕖", "𝔸𝕚𝕣𝕔𝕣𝕒𝕗𝕥 ℂ𝕒𝕣𝕣𝕚𝕖𝕣 (𝕠𝕟 𝕊𝕦𝕟𝕕𝕒𝕪)",
  "𝔹𝕒𝕟𝕜 ℝ𝕠𝕓𝕓𝕖𝕣𝕪", "ℍ𝕠𝕥𝕖𝕝 𝕋𝕒𝕜𝕖𝕠𝕧𝕖𝕣", "Family War", "Money Printing Machine",
  "Informal (Battle for business for unofficial organization)"
];

// Register slash commands
async function registerCommands() {
  const commands = [
    {
      name: 'attendance',
      description: 'Record event attendance',
      options: []
    },
    {
      name: 'help',
      description: 'Show bot help information',
      options: []
    },
    {
      name: 'addbonus',
      description: 'Add bonus to a member',
      options: [
        {
          name: 'user',
          description: 'The user to add bonus to',
          type: 6, // USER type
          required: true
        },
        {
          name: 'amount',
          description: 'Bonus amount to add',
          type: 4, // INTEGER type
          required: true
        },
        {
          name: 'reason',
          description: 'Reason for the bonus',
          type: 3, // STRING type
          required: false
        }
      ]
    },
    {
      name: 'lessbonus',
      description: 'Reduce bonus from a member',
      options: [
        {
          name: 'user',
          description: 'The user to reduce bonus from',
          type: 6, // USER type
          required: true
        },
        {
          name: 'amount',
          description: 'Bonus amount to reduce',
          type: 4, // INTEGER type
          required: true
        },
        {
          name: 'reason',
          description: 'Reason for the reduction',
          type: 3, // STRING type
          required: false
        }
      ]
    },
    {
      name: 'paidbonus',
      description: 'Mark bonus as paid for a member',
      options: [
        {
          name: 'user',
          description: 'The user to mark bonus as paid',
          type: 6, // USER type
          required: true
        },
        {
          name: 'amount',
          description: 'Amount to mark as paid',
          type: 4, // INTEGER type
          required: true
        },
        {
          name: 'note',
          description: 'Payment note',
          type: 3, // STRING type
          required: false
        }
      ]
    },
    {
      name: 'listbonus',
      description: 'List all members bonus summary',
      options: []
    },
    {
      name: 'dmoutstanding',
      description: 'Send DM with outstanding bonus summary to a member',
      options: [
        {
          name: 'user',
          description: 'The user to send DM to',
          type: 6, // USER type
          required: true
        }
      ]
    }
  ];

  const rest = new REST({ version: '10' }).setToken(CONFIG.DISCORD_TOKEN);

  try {
    console.log(`\x1b[36m[${new Date().toISOString()}] 🔄 Registering slash commands...\x1b[0m`);
    await rest.put(
      Routes.applicationCommands(CONFIG.CLIENT_ID),
      { body: commands }
    );
    console.log(`\x1b[32m[${new Date().toISOString()}] ✅ Slash commands registered successfully\x1b[0m`);
  } catch (error) {
    console.error(`\x1b[31m[${new Date().toISOString()}] ❌ Failed to register commands: ${error}\x1b[0m`);
  }
}

// Date utility functions
function getTomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDate(tomorrow);
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function isValidDate(dateString) {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!regex.test(dateString)) return false;
  
  const [day, month, year] = dateString.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  
  return (
    date.getDate() === day &&
    date.getMonth() === month - 1 &&
    date.getFullYear() === year
  );
}

// Logging function
function logCommand(user, command, status, message = '') {
  const colors = {
    START: '\x1b[36m',    // Cyan
    SUCCESS: '\x1b[32m',  // Green
    FAIL: '\x1b[31m',     // Red
    WARN: '\x1b[33m',     // Yellow
    DEBUG: '\x1b[35m'     // Magenta
  };
  const statusText = {
    START: 'STARTED',
    SUCCESS: 'SUCCESS',
    FAIL: 'FAILED',
    WARN: 'WARNING',
    DEBUG: 'DEBUG'
  };
  
  console.log(
    `[${new Date().toISOString()}] ${colors[status]}${statusText[status]}\x1b[0m ` +
    `| ${user?.tag || 'System'} | ${command} | ${message}`
  );
}

// Bot ready event
client.on('ready', async () => {
  console.log(`\n\x1b[32m[${new Date().toISOString()}] 🚀 Bot connected as ${client.user.tag}\x1b[0m`);
  console.log(`[${new Date().toISOString()}] 📌 POV Channel: ${CONFIG.POV_CHANNEL_ID}`);
  console.log(`[${new Date().toISOString()}] 📌 Output Channel: ${CONFIG.OUTPUT_CHANNEL_ID}`);
  console.log(`[${new Date().toISOString()}] 👑 Admin Roles: ${CONFIG.ADMIN_ROLE_IDS.join(', ')}`);
  client.user.setActivity('Slayers Family Events', { type: 'WATCHING' });
  
  await connectToMongoDB();
  await registerCommands();
  
  // Start HTTP server for Render.com
  const server = require('http').createServer((req, res) => {
    res.writeHead(200);
    res.end('Discord Bot is running');
  });
  server.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] 🌐 HTTP server running on port ${PORT}`);
  });
});

// Utility functions
function hasAdminRole(member) {
  return member.roles.cache.some(role => CONFIG.ADMIN_ROLE_IDS.includes(role.id));
}

function isAllowedChannel(channelId) {
  return !CONFIG.COMMAND_CHANNEL_ID || channelId === CONFIG.COMMAND_CHANNEL_ID;
}

async function getMemberDisplayInfo(guild, userId) {
  try {
    const member = await guild.members.fetch(userId);
    return {
      nickname: member.nickname,
      username: member.user.username,
      tag: member.user.tag,
      displayName: member.nickname || member.user.username
    };
  } catch (error) {
    console.error(`Error fetching member ${userId}:`, error);
    return {
      nickname: null,
      username: null,
      tag: null,
      displayName: null
    };
  }
}

// Initialize or get bonus data for a user
async function getUserBonus(userId) {
  try {
    let userBonus = await bonusCollection.findOne({ userId });
    
    if (!userBonus) {
      userBonus = {
        userId,
        total: 0,
        paid: 0,
        history: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await bonusCollection.insertOne(userBonus);
    }
    
    return userBonus;
  } catch (error) {
    console.error('Error getting user bonus:', error);
    throw error;
  }
}

// Update user bonus in database
async function updateUserBonus(userId, updateData) {
  try {
    const updateDoc = {
      $set: {
        ...updateData,
        updatedAt: new Date()
      }
    };
    
    if (updateData.history) {
      updateDoc.$push = { history: { $each: updateData.history } };
      delete updateDoc.$set.history;
    }
    
    await bonusCollection.updateOne(
      { userId },
      updateDoc,
      { upsert: true }
    );
  } catch (error) {
    console.error('Error updating user bonus:', error);
    throw error;
  }
}

// Log bonus action to the bonus log channel
async function logBonusAction(action, executor, targetUser, amount, note = '') {
  try {
    const logChannel = client.channels.cache.get(CONFIG.BONUS_LOG_CHANNEL_ID);
    if (!logChannel) {
      console.error('Bonus log channel not found');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(`💰 Bonus ${action}`)
      .addFields(
        { name: '👤 Executor', value: executor.tag, inline: true },
        { name: '🎯 Target', value: targetUser.tag, inline: true },
        { name: '💵 Amount', value: amount.toString(), inline: true }
      )
      .setTimestamp();

    if (note) {
      embed.addFields({ name: '📝 Note', value: note });
    }

    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error logging bonus action:', error);
  }
}

// Send DM to user and return status
async function sendDM(user, embed) {
  try {
    const dm = await user.createDM();
    await dm.send({ embeds: [embed] });
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Slash command handlers
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  try {
    if (interaction.commandName === 'help') {
      logCommand(interaction.user, '/help', 'START');
      
      const helpEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🆘 Slayers Family Attendance Bot Help')
        .setDescription('A bot to manage event attendance and POV submissions')
        .addFields(
          { name: '📋 Attendance Commands', value: '`/attendance` - Record event attendance\n`/help` - Show this message' },
          { name: '💰 Bonus Commands', value: 
            '`/addbonus` - Add bonus to a member\n' +
            '`/lessbonus` - Reduce bonus from a member\n' +
            '`/paidbonus` - Mark bonus as paid\n' +
            '`/listbonus` - List all members bonus summary\n' +
            '`/dmoutstanding` - Send DM with outstanding bonus summary'
          },
          { name: '📝 Usage', value: '1. Use `/attendance`\n2. Select event\n3. Enter bonus amount\n4. Choose date option\n5. Mention participants' },
          { name: '📁 Channels', value: `• POV Submissions: <#${CONFIG.POV_CHANNEL_ID}>\n• Output: <#${CONFIG.OUTPUT_CHANNEL_ID}>\n• Bonus Logs: <#${CONFIG.BONUS_LOG_CHANNEL_ID}>` }
        )
        .setFooter({ text: 'Slayers Family Events' });

      await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
      logCommand(interaction.user, '/help', 'SUCCESS');
    }

    if (interaction.commandName === 'attendance') {
      logCommand(interaction.user, '/attendance', 'START');

      // Permission check
      if (!hasAdminRole(interaction.member)) {
        logCommand(interaction.user, '/attendance', 'FAIL', 'Insufficient permissions');
        return interaction.reply({
          content: '⛔ You lack permissions for this command.',
          ephemeral: true
        });
      }

      // Channel check
      if (!isAllowedChannel(interaction.channelId)) {
        logCommand(interaction.user, '/attendance', 'FAIL', 'Wrong channel');
        return interaction.reply({
          content: `❌ Use <#${CONFIG.COMMAND_CHANNEL_ID}> for commands`,
          ephemeral: true
        });
      }

      // Create event selection dropdown
      const eventSelect = new StringSelectMenuBuilder()
        .setCustomId('event-select')
        .setPlaceholder('Choose event')
        .addOptions(EVENT_NAMES.map(event => ({
          label: event.length > 25 ? `${event.substring(0, 22)}...` : event,
          value: event
        })));

      const row = new ActionRowBuilder().addComponents(eventSelect);
      
      await interaction.reply({
        content: '📋 Select an event:',
        components: [row],
        ephemeral: true
      });
      logCommand(interaction.user, '/attendance', 'SUCCESS', 'Event menu displayed');
    }

    // Bonus-related commands
    if (interaction.commandName === 'addbonus') {
      await handleAddBonus(interaction);
    } else if (interaction.commandName === 'lessbonus') {
      await handleLessBonus(interaction);
    } else if (interaction.commandName === 'paidbonus') {
      await handlePaidBonus(interaction);
    } else if (interaction.commandName === 'listbonus') {
      await handleListBonus(interaction);
    } else if (interaction.commandName === 'dmoutstanding') {
      await handleDMOutstanding(interaction);
    }
  } catch (error) {
    logCommand(interaction.user, `/${interaction.commandName}`, 'FAIL', error.message);
    console.error('Error Details:', error.stack);

    if (!interaction.replied) {
      await interaction.reply({
        content: '❌ Command failed unexpectedly',
        ephemeral: true
      }).catch(console.error);
    }
  }
});

// Bonus command handlers
async function handleAddBonus(interaction) {
  logCommand(interaction.user, '/addbonus', 'START');

  // Permission check
  if (!hasAdminRole(interaction.member)) {
    logCommand(interaction.user, '/addbonus', 'FAIL', 'Insufficient permissions');
    return interaction.reply({
      content: '⛔ You lack permissions for this command.',
      ephemeral: true
    });
  }

  const user = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (amount <= 0) {
    logCommand(interaction.user, '/addbonus', 'FAIL', 'Invalid amount');
    return interaction.reply({
      content: '❌ Amount must be greater than 0',
      ephemeral: true
    });
  }

  const userBonus = await getUserBonus(user.id);
  const newTotal = userBonus.total + amount;
  
  await updateUserBonus(user.id, {
    total: newTotal,
    history: [{
      type: 'add',
      amount,
      reason,
      date: new Date().toISOString(),
      by: interaction.user.id
    }]
  });

  // Log the action
  await logBonusAction('added', interaction.user, user, amount, reason);

  // Send DM to the user
  const dmEmbed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('💰 Bonus Added')
    .setDescription(`You've received a bonus of $${amount}`)
    .addFields(
      { name: '📝 Reason', value: reason },
      { name: '💵 New Total Bonus', value: `$${newTotal}`, inline: true },
      { name: '💸 Outstanding', value: `$${newTotal - userBonus.paid}`, inline: true }
    )
    .setFooter({ text: 'Slayers Family Bonus System' });

  const dmResult = await sendDM(user, dmEmbed);
  
  if (dmResult.success) {
    logCommand(interaction.user, '/addbonus', 'DEBUG', `DM sent to ${user.tag}`);
    await interaction.reply({
      content: `✅ Added $${amount} bonus to ${user.tag}\n📝 Reason: ${reason}\n📩 DM Status: Sent successfully`,
      ephemeral: true
    });
  } else {
    logCommand(interaction.user, '/addbonus', 'WARN', `Failed DM to ${user.tag}: ${dmResult.error}`);
    await interaction.reply({
      content: `✅ Added $${amount} bonus to ${user.tag}\n📝 Reason: ${reason}\n⚠️ DM Status: Failed to send (user may have DMs disabled)`,
      ephemeral: true
    });
  }
  
  logCommand(interaction.user, '/addbonus', 'SUCCESS', `Added $${amount} to ${user.tag}`);
}

async function handleLessBonus(interaction) {
  logCommand(interaction.user, '/lessbonus', 'START');

  // Permission check
  if (!hasAdminRole(interaction.member)) {
    logCommand(interaction.user, '/lessbonus', 'FAIL', 'Insufficient permissions');
    return interaction.reply({
      content: '⛔ You lack permissions for this command.',
      ephemeral: true
    });
  }

  const user = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (amount <= 0) {
    logCommand(interaction.user, '/lessbonus', 'FAIL', 'Invalid amount');
    return interaction.reply({
      content: '❌ Amount must be greater than 0',
      ephemeral: true
    });
  }

  const userBonus = await getUserBonus(user.id);
  
  if (amount > userBonus.total) {
    logCommand(interaction.user, '/lessbonus', 'FAIL', 'Amount exceeds total bonus');
    return interaction.reply({
      content: `❌ Cannot reduce more than the user's total bonus ($${userBonus.total})`,
      ephemeral: true
    });
  }

  const newTotal = userBonus.total - amount;
  
  await updateUserBonus(user.id, {
    total: newTotal,
    history: [{
      type: 'reduce',
      amount,
      reason,
      date: new Date().toISOString(),
      by: interaction.user.id
    }]
  });

  // Log the action
  await logBonusAction('reduced', interaction.user, user, amount, reason);

  // Send DM to the user
  const dmEmbed = new EmbedBuilder()
    .setColor(0xFFA500)
    .setTitle('💰 Bonus Reduced')
    .setDescription(`$${amount} has been deducted from your bonus`)
    .addFields(
      { name: '📝 Reason', value: reason },
      { name: '💵 New Total Bonus', value: `$${newTotal}`, inline: true },
      { name: '💸 Outstanding', value: `$${newTotal - userBonus.paid}`, inline: true }
    )
    .setFooter({ text: 'Slayers Family Bonus System' });

  const dmResult = await sendDM(user, dmEmbed);
  
  if (dmResult.success) {
    logCommand(interaction.user, '/lessbonus', 'DEBUG', `DM sent to ${user.tag}`);
    await interaction.reply({
      content: `✅ Reduced $${amount} bonus from ${user.tag}\n📝 Reason: ${reason}\n📩 DM Status: Sent successfully`,
      ephemeral: true
    });
  } else {
    logCommand(interaction.user, '/lessbonus', 'WARN', `Failed DM to ${user.tag}: ${dmResult.error}`);
    await interaction.reply({
      content: `✅ Reduced $${amount} bonus from ${user.tag}\n📝 Reason: ${reason}\n⚠️ DM Status: Failed to send (user may have DMs disabled)`,
      ephemeral: true
    });
  }
  
  logCommand(interaction.user, '/lessbonus', 'SUCCESS', `Reduced $${amount} from ${user.tag}`);
}

async function handlePaidBonus(interaction) {
  logCommand(interaction.user, '/paidbonus', 'START');

  // Permission check
  if (!hasAdminRole(interaction.member)) {
    logCommand(interaction.user, '/paidbonus', 'FAIL', 'Insufficient permissions');
    return interaction.reply({
      content: '⛔ You lack permissions for this command.',
      ephemeral: true
    });
  }

  const user = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');
  const note = interaction.options.getString('note') || 'No note provided';

  if (amount <= 0) {
    logCommand(interaction.user, '/paidbonus', 'FAIL', 'Invalid amount');
    return interaction.reply({
      content: '❌ Amount must be greater than 0',
      ephemeral: true
    });
  }

  const userBonus = await getUserBonus(user.id);
  const outstanding = userBonus.total - userBonus.paid;

  if (amount > outstanding) {
    logCommand(interaction.user, '/paidbonus', 'FAIL', 'Amount exceeds outstanding');
    return interaction.reply({
      content: `❌ Cannot mark more than the outstanding amount ($${outstanding}) as paid`,
      ephemeral: true
    });
  }

  const newPaid = userBonus.paid + amount;
  
  await updateUserBonus(user.id, {
    paid: newPaid,
    history: [{
      type: 'paid',
      amount,
      note,
      date: new Date().toISOString(),
      by: interaction.user.id
    }]
  });

  // Log the action
  await logBonusAction('paid', interaction.user, user, amount, note);

  // Send DM to the user
  const dmEmbed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('💰 Bonus Paid')
    .setDescription(`$${amount} of your bonus has been marked as paid`)
    .addFields(
      { name: '📝 Note', value: note },
      { name: '💵 Total Bonus', value: `$${userBonus.total}`, inline: true },
      { name: '💳 Total Paid', value: `$${newPaid}`, inline: true },
      { name: '💸 Outstanding', value: `$${userBonus.total - newPaid}`, inline: true }
    )
    .setFooter({ text: 'Slayers Family Bonus System' });

  const dmResult = await sendDM(user, dmEmbed);
  
  if (dmResult.success) {
    logCommand(interaction.user, '/paidbonus', 'DEBUG', `DM sent to ${user.tag}`);
    await interaction.reply({
      content: `✅ Marked $${amount} as paid for ${user.tag}\n📝 Note: ${note}\n📩 DM Status: Sent successfully`,
      ephemeral: true
    });
  } else {
    logCommand(interaction.user, '/paidbonus', 'WARN', `Failed DM to ${user.tag}: ${dmResult.error}`);
    await interaction.reply({
      content: `✅ Marked $${amount} as paid for ${user.tag}\n📝 Note: ${note}\n⚠️ DM Status: Failed to send (user may have DMs disabled)`,
      ephemeral: true
    });
  }
  
  logCommand(interaction.user, '/paidbonus', 'SUCCESS', `Marked $${amount} as paid for ${user.tag}`);
}

async function handleListBonus(interaction) {
  logCommand(interaction.user, '/listbonus', 'START');

  // Permission check
  if (!hasAdminRole(interaction.member)) {
    logCommand(interaction.user, '/listbonus', 'FAIL', 'Insufficient permissions');
    return interaction.reply({
      content: '⛔ You lack permissions for this command.',
      ephemeral: true
    });
  }

  try {
    const allBonuses = await bonusCollection.find().toArray();
    
    if (allBonuses.length === 0) {
      logCommand(interaction.user, '/listbonus', 'DEBUG', 'No bonus data');
      return interaction.reply({
        content: 'ℹ️ No bonus data available yet',
        ephemeral: true
      });
    }

    // Sort by outstanding amount (descending)
    const sortedBonuses = allBonuses.sort((a, b) => {
      const aOutstanding = a.total - a.paid;
      const bOutstanding = b.total - b.paid;
      return bOutstanding - aOutstanding;
    });

    // Create paginated embeds if there are many users
    const embeds = [];
    let currentEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('💰 Bonus Summary')
      .setDescription('List of all members with their bonus information');

    for (const userBonus of sortedBonuses) {
      try {
        const member = await interaction.guild.members.fetch(userBonus.userId);
        const outstanding = userBonus.total - userBonus.paid;
        
        const fieldValue = `Total: $${userBonus.total}\n` +
                          `Paid: $${userBonus.paid}\n` +
                          `Outstanding: $${outstanding}`;
        
        if (currentEmbed.data.fields?.length >= 5) {
          embeds.push(currentEmbed);
          currentEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('💰 Bonus Summary (Continued)');
        }
        
        currentEmbed.addFields({
          name: member.displayName || member.user.username,
          value: fieldValue,
          inline: true
        });
      } catch (error) {
        console.error(`Error fetching member ${userBonus.userId}:`, error);
      }
    }

    if (currentEmbed.data.fields?.length > 0) {
      embeds.push(currentEmbed);
    }

    if (embeds.length === 0) {
      logCommand(interaction.user, '/listbonus', 'DEBUG', 'No valid bonus data');
      return interaction.reply({
        content: 'ℹ️ No valid bonus data to display',
        ephemeral: true
      });
    }

    await interaction.reply({
      content: '📊 Bonus Summary:',
      embeds: [embeds[0]],
      ephemeral: true
    });

    // Send remaining embeds as follow-ups if there are multiple pages
    for (let i = 1; i < embeds.length; i++) {
      await interaction.followUp({
        embeds: [embeds[i]],
        ephemeral: true
      });
    }

    logCommand(interaction.user, '/listbonus', 'SUCCESS', `Displayed ${sortedBonuses.length} entries`);
  } catch (error) {
    logCommand(interaction.user, '/listbonus', 'FAIL', error.message);
    await interaction.reply({
      content: '❌ Failed to fetch bonus data',
      ephemeral: true
    });
  }
}

async function handleDMOutstanding(interaction) {
  logCommand(interaction.user, '/dmoutstanding', 'START');

  // Permission check
  if (!hasAdminRole(interaction.member)) {
    logCommand(interaction.user, '/dmoutstanding', 'FAIL', 'Insufficient permissions');
    return interaction.reply({
      content: '⛔ You lack permissions for this command.',
      ephemeral: true
    });
  }

  const user = interaction.options.getUser('user');
  const userBonus = await getUserBonus(user.id);
  const outstanding = userBonus.total - userBonus.paid;

  const dmEmbed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('💰 Your Bonus Summary')
    .setDescription('Here is your current bonus status')
    .addFields(
      { name: '💵 Total Bonus', value: `$${userBonus.total}`, inline: true },
      { name: '💳 Total Paid', value: `$${userBonus.paid}`, inline: true },
      { name: '💸 Outstanding', value: `$${outstanding}`, inline: true }
    )
    .setFooter({ text: 'Slayers Family Bonus System' });

  const dmResult = await sendDM(user, dmEmbed);
  
  if (dmResult.success) {
    logCommand(interaction.user, '/dmoutstanding', 'DEBUG', `DM sent to ${user.tag}`);
    await interaction.reply({
      content: `✅ Sent bonus summary DM to ${user.tag}\n📩 DM Status: Sent successfully`,
      ephemeral: true
    });
  } else {
    logCommand(interaction.user, '/dmoutstanding', 'FAIL', `Failed to send DM: ${dmResult.error}`);
    await interaction.reply({
      content: `❌ Failed to send DM to ${user.tag}. They might have DMs disabled.`,
      ephemeral: true
    });
  }
  
  logCommand(interaction.user, '/dmoutstanding', 'SUCCESS', `Attempted to send DM to ${user.tag}`);
}

// Event selection handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu() || interaction.customId !== 'event-select') return;

  try {
    await interaction.deferUpdate();
    const eventName = interaction.values[0];
    logCommand(interaction.user, '/attendance [select]', 'SUCCESS', `Selected: ${eventName}`);

    // Ask for bonus amount
    await interaction.editReply({
      content: `✅ Selected: **${eventName}**\n\n💰 Please enter the bonus amount for this event:`,
      components: []
    });

    // Set up bonus amount collector
    const amountFilter = m => m.author.id === interaction.user.id;
    const amountCollector = interaction.channel.createMessageCollector({ 
      filter: amountFilter,
      time: 60000,
      max: 1
    });

    amountCollector.on('collect', async amountMessage => {
      try {
        const bonusAmount = parseInt(amountMessage.content.trim());
        
        if (isNaN(bonusAmount)) {
          logCommand(interaction.user, '/attendance [amount]', 'WARN', 'Invalid amount format');
          const reply = await amountMessage.reply({
            content: '❌ Please enter a valid number for the bonus amount',
            allowedMentions: { parse: [] }
          });
          setTimeout(() => reply.delete(), 5000);
          await amountMessage.delete().catch(() => {});
          return;
        }

        if (bonusAmount < 0) {
          logCommand(interaction.user, '/attendance [amount]', 'WARN', 'Negative amount');
          const reply = await amountMessage.reply({
            content: '❌ Bonus amount cannot be negative',
            allowedMentions: { parse: [] }
          });
          setTimeout(() => reply.delete(), 5000);
          await amountMessage.delete().catch(() => {});
          return;
        }

        logCommand(interaction.user, '/attendance [amount]', 'SUCCESS', `Bonus amount: $${bonusAmount}`);

        // Create date selection options
        const tomorrow = getTomorrowDate();
        const dateSelect = new StringSelectMenuBuilder()
          .setCustomId('date-select')
          .setPlaceholder('Choose date option')
          .addOptions([
            { 
              label: `Tomorrow (${tomorrow})`, 
              value: 'tomorrow',
              description: `Bonus: $${bonusAmount}`,
              emoji: '💰'
            },
            { 
              label: 'Custom date', 
              value: 'custom',
              description: `Bonus: $${bonusAmount}`,
              emoji: '📅'
            }
          ]);

        const row = new ActionRowBuilder().addComponents(dateSelect);
        
        await interaction.editReply({
          content: `✅ Event: **${eventName}**\n💰 Bonus: **$${bonusAmount}**\n\n📅 Choose date option:`,
          components: [row]
        });

        await amountMessage.delete().catch(() => {});
      } catch (error) {
        logCommand(interaction.user, '/attendance [amount]', 'FAIL', error.message);
      }
    });
  } catch (error) {
    logCommand(interaction.user, '/attendance [select]', 'FAIL', error.message);
  }
});

// Date selection handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu() || interaction.customId !== 'date-select') return;

  try {
    await interaction.deferUpdate();
    const dateOption = interaction.values[0];
    const eventMatch = interaction.message.content.match(/\*\*(.*?)\*\*\n💰 Bonus: \*\*\$(.*?)\*\*/);
    if (!eventMatch) return;
    
    const eventName = eventMatch[1];
    const eventBonus = parseInt(eventMatch[2]);
    
    if (dateOption === 'tomorrow') {
      const tomorrow = getTomorrowDate();
      logCommand(interaction.user, '/attendance [date]', 'SUCCESS', `Selected tomorrow: ${tomorrow}`);
      
      await interaction.editReply({
        content: `✅ Event: **${eventName}**\n📅 Date: **${tomorrow}** (tomorrow)\n💰 Bonus: **$${eventBonus}**\n\n🔹 Mention participants: (@user1 @user2...)`,
        components: []
      });

      // Set up user mention collector
      const mentionFilter = m => m.author.id === interaction.user.id;
      const mentionCollector = interaction.channel.createMessageCollector({ 
        filter: mentionFilter, 
        time: 60000,
        max: 1
      });

      mentionCollector.on('collect', async mentionMessage => {
        try {
          const users = mentionMessage.mentions.users;
          if (users.size === 0) {
            logCommand(interaction.user, '/attendance [mentions]', 'WARN', 'No users mentioned');
            const reply = await mentionMessage.reply({
              content: '❌ Please mention at least one user',
              allowedMentions: { parse: [] }
            });
            setTimeout(() => reply.delete(), 3000);
            return;
          }

          logCommand(interaction.user, '/attendance [mentions]', 'DEBUG', `${users.size} users mentioned`);
          await processAttendance(eventName, tomorrow, users, mentionMessage, interaction.channel, eventBonus);
          await mentionMessage.delete().catch(() => {});
        } catch (error) {
          logCommand(interaction.user, '/attendance [process]', 'FAIL', error.message);
        }
      });
    } else if (dateOption === 'custom') {
      await interaction.editReply({
        content: `✅ Event: **${eventName}**\n💰 Bonus: **$${eventBonus}**\n\n📅 Please enter a custom date (DD/MM/YYYY):`,
        components: []
      });

      // Set up date collector
      const dateFilter = m => m.author.id === interaction.user.id;
      const dateCollector = interaction.channel.createMessageCollector({ 
        filter: dateFilter, 
        time: 60000,
        max: 1
      });

      dateCollector.on('collect', async dateMessage => {
        try {
          const dateInput = dateMessage.content.trim();
          
          // Validate date
          if (!isValidDate(dateInput)) {
            logCommand(interaction.user, '/attendance [date]', 'WARN', 'Invalid date format');
            const reply = await dateMessage.reply({
              content: '❌ Invalid date format. Please use DD/MM/YYYY',
              allowedMentions: { parse: [] }
            });
            setTimeout(() => reply.delete(), 5000);
            await dateMessage.delete().catch(() => {});
            return;
          }

          logCommand(interaction.user, '/attendance [date]', 'SUCCESS', `Custom date: ${dateInput}`);

          // Now ask for user mentions
          await interaction.editReply({
            content: `✅ Event: **${eventName}**\n📅 Date: **${dateInput}**\n💰 Bonus: **$${eventBonus}**\n\n🔹 Mention participants: (@user1 @user2...)`,
            components: []
          });

          // Set up user mention collector
          const mentionFilter = m => m.author.id === interaction.user.id;
          const mentionCollector = interaction.channel.createMessageCollector({ 
            filter: mentionFilter, 
            time: 60000,
            max: 1
          });

          mentionCollector.on('collect', async mentionMessage => {
            try {
              const users = mentionMessage.mentions.users;
              if (users.size === 0) {
                logCommand(interaction.user, '/attendance [mentions]', 'WARN', 'No users mentioned');
                const reply = await mentionMessage.reply({
                  content: '❌ Please mention at least one user',
                  allowedMentions: { parse: [] }
                });
                setTimeout(() => reply.delete(), 3000);
                return;
              }

              logCommand(interaction.user, '/attendance [mentions]', 'DEBUG', `${users.size} users mentioned`);
              await processAttendance(eventName, dateInput, users, mentionMessage, interaction.channel, eventBonus);
              await mentionMessage.delete().catch(() => {});
            } catch (error) {
              logCommand(interaction.user, '/attendance [process]', 'FAIL', error.message);
            }
          });

          await dateMessage.delete().catch(() => {});
        } catch (error) {
          logCommand(interaction.user, '/attendance [date]', 'FAIL', error.message);
        }
      });
    }
  } catch (error) {
    logCommand(interaction.user, '/attendance [date]', 'FAIL', error.message);
  }
});

// Process attendance function with bonus tracking
async function processAttendance(eventName, date, users, sourceMessage, commandChannel, eventBonus) {
  try {
    // Validate channels
    const outputChannel = sourceMessage.guild.channels.cache.get(CONFIG.OUTPUT_CHANNEL_ID);
    
    if (!outputChannel) {
      const errorMsg = 'Output channel not found';
      logCommand(sourceMessage.author, 'processAttendance', 'FAIL', errorMsg);
      await sourceMessage.reply({
        content: '❌ Configuration error: Output channel not found',
        ephemeral: true
      });
      return;
    }

    // Get all member display info
    const memberInfo = await Promise.all(
      Array.from(users.values()).map(async user => {
        const info = await getMemberDisplayInfo(sourceMessage.guild, user.id);
        return {
          user,
          ...info
        };
      })
    );

    // Calculate total bonus for all participants
    let totalBonusAwarded = 0;
    const dmResults = [];

    // Process each user
    for (const { user, nickname, username, tag, displayName } of memberInfo) {
      try {
        // Get user's current bonus data
        const userBonus = await getUserBonus(user.id);
        const newTotal = userBonus.total + eventBonus;
        totalBonusAwarded += eventBonus;
        
        // Update user's bonus in database
        await updateUserBonus(user.id, {
          total: newTotal,
          history: [{
            type: 'event',
            amount: eventBonus,
            reason: `Attended ${eventName}`,
            date: new Date().toISOString(),
            by: sourceMessage.author.id
          }]
        });

        const outstanding = newTotal - userBonus.paid;

        const dmEmbed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('🎉 Event Attendance Recorded')
          .setDescription('Thank you for being part of the Slayers Family!')
          .addFields(
            { name: '📌 Event', value: `**${eventName}**`, inline: true },
            { name: '📅 Date', value: date, inline: true },
            { 
              name: '💰 Bonus Earned', 
              value: `$${eventBonus}`,
              inline: true
            },
            { 
              name: '💵 Total Bonus', 
              value: `$${newTotal}`,
              inline: true
            },
            { 
              name: '💸 Outstanding', 
              value: `$${outstanding}`,
              inline: true
            },
            { 
              name: '🔥 Motivation', 
              value: 'Your participation makes our family stronger! ' +
                     'We appreciate your dedication and look forward to seeing your POV!'
            },
            { 
              name: '📸 Upload Instructions', 
              value: `Submit your POV to: <#${CONFIG.POV_CHANNEL_ID}>\n\n` +
                     `**Required format:**\n\`\`\`\n"${eventName} | ${displayName}"\n"${date}"\n\`\`\``
            }
          )
          .setFooter({ text: 'Slayers Family Events' });

        const dmResult = await sendDM(user, dmEmbed);
        dmResults.push({
          user: displayName || username,
          success: dmResult.success,
          error: dmResult.error
        });

        if (dmResult.success) {
          logCommand(sourceMessage.author, 'processAttendance', 'DEBUG', `DM sent to ${tag}`);
        } else {
          logCommand(sourceMessage.author, 'processAttendance', 'WARN', `Failed DM to ${tag}: ${dmResult.error}`);
        }
      } catch (error) {
        logCommand(sourceMessage.author, 'processAttendance', 'ERROR', `Error processing ${tag}: ${error.message}`);
        dmResults.push({
          user: username,
          success: false,
          error: error.message
        });
      }
    }

    // Prepare DM status message
    const dmStatus = dmResults.map(result => 
      `${result.success ? '✅' : '❌'} ${result.user}`
    ).join('\n');

    // Prepare output message with both mention and profile name
    const outputContent = `**${eventName} - Attendance**\n**Date:** ${date}\n**Bonus Awarded:** $${eventBonus} per participant\n**Total Bonus Awarded:** $${totalBonusAwarded}\n\n` +
      memberInfo.map(({ user, displayName }) => 
        `• <@${user.id}> (${displayName})`
      ).join('\n');

    // Send to output channel
    await outputChannel.send({
      content: outputContent,
      allowedMentions: { users: Array.from(users.keys()) }
    });

    // Send summary to command user
    await sourceMessage.reply({
      content: `✅ Attendance recorded for ${users.size} users!\n` +
               `💰 $${totalBonusAwarded} in bonuses awarded\n` +
               `📋 Posted in: <#${CONFIG.OUTPUT_CHANNEL_ID}>\n\n` +
               `**DM Delivery Status:**\n${dmStatus}`,
      ephemeral: true
    });
    logCommand(sourceMessage.author, 'processAttendance', 'SUCCESS', `Processed ${users.size} users`);

  } catch (error) {
    logCommand(sourceMessage.author, 'processAttendance', 'FAIL', error.message);
    console.error(`[${new Date().toISOString()}] 🛑 Processing Error:`, error.stack);
    await sourceMessage.reply({
      content: '❌ An error occurred while processing attendance',
      ephemeral: true
    });
  }
}

// Start the bot
client.login(CONFIG.DISCORD_TOKEN).catch(error => {
  console.error(`\x1b[31m[${new Date().toISOString()}] 🛑 Failed to login: ${error.message}\x1b[0m`);
  process.exit(1);
});