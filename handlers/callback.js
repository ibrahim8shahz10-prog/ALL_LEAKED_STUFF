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

  if (data === "browse") {
    return await handleBrowse(env, chatId);
  }

  if (data.startsWith("category_")) {
    const id = data.replace("category_", "");
    return await handleCategory(env, chatId, id);
  }

  if (data.startsWith("file_")) {
    const id = data.replace("file_", "");
    return await handleFile(env, chatId, id, telegramId);
  }

  if (data.startsWith("unlock_")) {
    const fileId = data.replace("unlock_", "");

    const fileRes = await query(env, "files", "GET", null, `?id=eq.${fileId}`);
    const file = fileRes[0];

    const credits = await getCredits(env, telegramId);

    if (credits < file.price) {
      return await sendMessage(env, chatId, "❌ Not enough credits");
    }

    await addCredits(env, telegramId, -file.price);

    return await sendMessage(
      env,
      chatId,
      `✅ Unlocked!\n\n📄 ${file.title}\n🔗 ${file.file_url}`
    );
  }

  // 👑 ADMIN: ADD CATEGORY
  if (data === "admin_add_category") {
    if (!isAdmin(env, telegramId)) {
      return await sendMessage(env, chatId, "❌ Access denied");
    }

    await setState(env, telegramId, "add_category");

    return await sendMessage(env, chatId, "✏️ Send category name:");
  }

  if (data === "credits") {
    const c = await getCredits(env, telegramId);
    return await sendMessage(env, chatId, `💰 ${c}`);
  }

  return await sendMessage(env, chatId, "❌ Unknown action");
}
