import { sendMessage } from "../services/telegram.js";
import { getCredits } from "../services/users.js";

export async function handleCallback(env, callback) {
  const chatId = callback.message.chat.id;
  const telegramId = callback.from.id;

  switch (callback.data) {
    case "browse":
      await sendMessage(
        env,
        chatId,
        "📁 Browse section is under development."
      );
      break;

    case "credits":
      const credits = await getCredits(env, telegramId);

      await sendMessage(
        env,
        chatId,
        `💰 Your credits: ${credits}`
      );
      break;

    case "refer":
      await sendMessage(
        env,
        chatId,
        "👥 Referral system coming soon."
      );
      break;

    case "leaderboard":
      await sendMessage(
        env,
        chatId,
        "🏆 Leaderboard coming soon."
      );
      break;

    case "help":
      await sendMessage(
        env,
        chatId,
        "ℹ️ Help section coming soon."
      );
      break;
  }
}
