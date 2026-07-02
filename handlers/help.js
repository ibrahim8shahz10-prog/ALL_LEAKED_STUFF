import { sendMessage } from "../services/telegram.js";

export async function helpMenu(env, chatId) {
  await sendMessage(
    env,
    chatId,
`ℹ️ <b>Help & Commands</b>

📂 Browse — explore content
⭐ Points — check your balance
🎁 Daily Bonus — free points every 24h
👥 Referral — invite friends & earn points
🏆 Leaderboard — top point earners

<b>Commands</b>
/start — open the main menu
/daily — claim your daily bonus
/redeem CODE — redeem a gift code

📩 Need help? Tap "Contact Admin" in the menu and send your message — it'll be forwarded directly.`
  );
}
