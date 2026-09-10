import { sendMessage } from "../services/telegram.js";

export async function helpMenu(env, chatId) {
  await sendMessage(
    env,
    chatId,
`ℹ️ <b>Help & Commands</b>

📂 Browse — explore content
🔍 Search — find files by name or description
👤 Profile — points, referral link & stats
💰 Buy Points — get more points
🎁 Daily Bonus — free points every 24h
🏆 Leaderboard — top referrers

<b>Commands</b>
/start — open the main menu
/daily — claim your daily bonus
/redeem CODE — redeem a gift code

📩 Need help? Tap "Contact Admin" in the menu and send your message — it'll be forwarded directly.`
  );
}
