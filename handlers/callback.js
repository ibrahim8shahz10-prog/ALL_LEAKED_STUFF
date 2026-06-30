import { sendMessage } from "../services/telegram.js";
import { getCredits, addCredits } from "../services/users.js";
import { handleBrowse } from "./browse.js";
import { handleCategory } from "./category.js";
import { handleFile } from "./file.js";
import { query } from "../database/supabase.js";
import { isAdmin } from "../utils/admin.js";
import { setState } from "../utils/stateDb.js";

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

  // 📄 File
  if (data.startsWith("file_")) {
    const fileId = data.replace("file_", "");
    return await handleFile(env, chatId, fileId, telegramId);
  }

  // 💰 Unlock
  if (data.startsWith("unlock_")) {
    const fileId = data.replace("unlock_", "");

    const fileRes = await query(env, "files", "GET", null, `?id=eq.${fileId}`);
    const file = fileRes[0];

    const credits = await getCredits(env, telegramId);

    if (credits < file.price) {
      return await sendMessage(env, chatId, "❌ Not enough credits");
    }

    await addCredits(env, telegramId, -file.price);

    await sendMessage(
      env,
      chatId,
      `✅ Unlocked!\n\n📄 ${file.title}\n🔗 ${file.file_url}`
    );

    return;
  }

  // 👑 ADMIN - ADD CATEGORY
  if (data === "admin_add_category") {
    if (!isAdmin(env, telegramId)) {
      return await sendMessage(env, chatId, "❌ Access denied");
    }

    await setState(env, telegramId, "add_category");

    return await sendMessage(env, chatId, "✏️ Send category name now:");
  }

  // 💰 Credits
  if (data === "credits") {
    const c = await getCredits(env, telegramId);
    return await sendMessage(env, chatId, `💰 Your credits: ${c}`);
  }

  // 👥 Referral
  if (data === "refer") {
    return await sendMessage(env, chatId, "👥 Referral coming soon.");
  }

  // 🏆 Leaderboard
  if (data === "leaderboard") {
    return await sendMessage(env, chatId, "🏆 Leaderboard coming soon.");
  }

  // ℹ️ Help
  if (data === "help") {
    return await sendMessage(env, chatId, "ℹ️ Help coming soon.");
  }

  return await sendMessage(env, chatId, "❌ Unknown action");
}
