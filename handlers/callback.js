import { sendMessage } from "../services/telegram.js";
import { getCredits, addCredits } from "../services/users.js";
import { handleBrowse } from "./browse.js";
import { handleCategory } from "./category.js";
import { handleFile } from "./file.js";
import { query } from "../database/supabase.js";

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

  // File details
  if (data.startsWith("file_")) {
    const fileId = data.replace("file_", "");
    return await handleFile(env, chatId, fileId, telegramId);
  }

  // Unlock system
  if (data.startsWith("unlock_")) {
    const fileId = data.replace("unlock_", "");

    const fileRes = await query(
      env,
      "files",
      "GET",
      null,
      `?id=eq.${fileId}`
    );

    if (!fileRes.length) {
      return await sendMessage(env, chatId, "❌ File not found.");
    }

    const file = fileRes[0];
    const userCredits = await getCredits(env, telegramId);

    if (userCredits < file.price) {
      return await sendMessage(
        env,
        chatId,
        `❌ Not enough credits.\nYou need ${file.price - userCredits} more.`
      );
    }

    await addCredits(env, telegramId, -file.price);

    await sendMessage(
      env,
      chatId,
`✅ Unlocked!

📄 ${file.title}

🔗 File:
${file.file_url || "No file link set"}`
    );

    return;
  }

  // Other buttons
  switch (data) {
    case "credits": {
      const credits = await getCredits(env, telegramId);
      await sendMessage(env, chatId, `💰 Your credits: ${credits}`);
      break;
    }

    case "refer":
      await sendMessage(env, chatId, "👥 Referral system coming soon.");
      break;

    case "leaderboard":
      await sendMessage(env, chatId, "🏆 Leaderboard coming soon.");
      break;

    case "help":
      await sendMessage(env, chatId, "ℹ️ Help section coming soon.");
      break;

    default:
      await sendMessage(env, chatId, "❌ Unknown option.");
  }
}
