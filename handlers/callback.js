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

  // 📂 Browse
  if (data === "browse") {
    return await handleBrowse(env, chatId);
  }

  // 📂 Category
  if (data.startsWith("category_")) {
    const categoryId = data.replace("category_", "");
    return await handleCategory(env, chatId, categoryId);
  }

  // 📄 File details
  if (data.startsWith("file_")) {
    const fileId = data.replace("file_", "");
    return await handleFile(env, chatId, fileId, telegramId);
  }

  // 💰 Unlock system (UPDATED)
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

    // check if already purchased
    const purchaseCheck = await query(
      env,
      "purchases",
      "GET",
      null,
      `?telegram_id=eq.${telegramId}&file_id=eq.${fileId}`
    );

    if (purchaseCheck.length) {
      return await sendMessage(
        env,
        chatId,
        `📄 Already unlocked!\n\n🔗 ${file.file_url}`
      );
    }

    const userCredits = await getCredits(env, telegramId);

    if (userCredits < file.price) {
      return await sendMessage(
        env,
        chatId,
        `❌ Not enough credits.\nNeed ${file.price - userCredits} more.`
      );
    }

    // deduct credits
    await addCredits(env, telegramId, -file.price);

    // save purchase
    await query(env, "purchases", "POST", {
      telegram_id: telegramId,
      file_id: fileId
    });

    await sendMessage(
      env,
      chatId,
`✅ Successfully Unlocked!

📄 ${file.title}

🔗 ${file.file_url}`
    );

    return;
  }

  // 💰 Credits
  if (data === "credits") {
    const credits = await getCredits(env, telegramId);
    return await sendMessage(env, chatId, `💰 Your credits: ${credits}`);
  }

  // 👥 Referral
  if (data === "refer") {
    return await sendMessage(env, chatId, "👥 Referral system coming soon.");
  }

  // 🏆 Leaderboard
  if (data === "leaderboard") {
    return await sendMessage(env, chatId, "🏆 Leaderboard coming soon.");
  }

  // ℹ️ Help
  if (data === "help") {
    return await sendMessage(env, chatId, "ℹ️ Help section coming soon.");
  }

  return await sendMessage(env, chatId, "❌ Unknown action.");
}
