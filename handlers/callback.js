import { sendMessage } from "../services/telegram.js";

export async function handleCallback(env, callback) {
  const chatId = callback.message.chat.id;
  const data = callback.data;

  switch (data) {
    case "browse":
      await sendMessage(env, chatId, "📁 Browse is coming soon.");
      break;

    case "credits":
      await sendMessage(env, chatId, "💰 You currently have 0 credits.");
      break;

    case "refer":
      await sendMessage(env, chatId, "👥 Referral system coming soon.");
      break;

    case "leaderboard":
      await sendMessage(env, chatId, "🏆 Leaderboard coming soon.");
      break;

    case "help":
      await sendMessage(env, chatId, "ℹ️ Help section coming soon.");
      break;
  }
}
