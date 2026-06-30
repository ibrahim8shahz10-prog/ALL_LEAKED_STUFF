import { sendMessage } from "../services/telegram.js";
import { getCredits } from "../services/users.js";
import { handleBrowse } from "./browse.js";
import { handleCategory } from "./category.js";

export async function handleCallback(env, callback) {
  const chatId = callback.message.chat.id;
  const telegramId = callback.from.id;
  const data = callback.data;

  // Browse
  if (data === "browse") {
    return await handleBrowse(env, chatId);
  }

  // Category
  if (data.startsWith("category_")) {
    const categoryId = data.replace("category_", "");
    return await handleCategory(env, chatId, categoryId);
  }

  switch (data) {
    case "credits": {
      const credits = await getCredits(env, telegramId);
      await sendMessage(
        env,
        chatId,
        `💰 Your credits: ${credits}`
      );
      break;
    }

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

    default:
      await sendMessage(
        env,
        chatId,
        "❌ Unknown option."
      );
  }
}
