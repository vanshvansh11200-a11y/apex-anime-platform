require('dotenv').config();
const telegramBotService = require('../services/telegramBotService');

console.log(`
======================================================
  🤖 APEX TELEGRAM AI MEDIA ORGANIZER BOT
======================================================
`);

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token || !token.includes(':')) {
  console.log('❌ Error: TELEGRAM_BOT_TOKEN is not configured in .env');
  console.log('💡 How to setup:');
  console.log('1. Open Telegram and search @BotFather');
  console.log('2. Send /newbot and choose name & username');
  console.log('3. Copy the HTTP API token');
  console.log('4. Add TELEGRAM_BOT_TOKEN=your_token_here in .env');
  process.exit(1);
}

telegramBotService.start(token).then(success => {
  if (success) {
    console.log(`
✨ APEX Telegram Bot is running and listening for uploads!
------------------------------------------------------
📁 Anime Save Target: /storage/emulated/0/ALL ANIMA VIDIOS
📁 Movie Save Target: /storage/emulated/0/ALL MOVIES FOLDERS

🤖 AI Auto-Classifier & Renamer: ACTIVE
• Anime Series: Automatically renames to "[Title] Ep [Number].mp4"
• Movies: Automatically renames to "[Title] ([Year]).mp4"
------------------------------------------------------
`);
  } else {
    console.log('❌ Failed to start Telegram Bot. Please verify your token.');
  }
});
