import { sendMessage } from "../services/telegram.js";
import { getCredits, addCredits } from "../services/users.js";
import { handleBrowse } from "./browse.js";
import { handleCategory } from "./category.js";
import { handleFile } from "./file.js";
import { query } from "../database/supabase.js";
import { isAdmin } from "../utils/admin.js";
import { setState } from "../utils/stateDb.js";
import { inlineKeyboard } from "../keyboards/inlineKeyboard.js";

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
    const id = data.replace("category_", "");
    return await handleCategory(env, chatId, id);
  }

  // File
  if (data.startsWith("file_")) {
    const id = data.replace("file_", "");
    return await handleFile(env, chatId, id, telegramId);
  }

  // Unlock
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

  // Add Category
  if (data === "admin_add_category") {
    if (!isAdmin(env, telegramId)) {
      return await sendMessage(env, chatId, "❌ Access denied");
    }

    await setState(env, telegramId, "add_category");

    return await sendMessage(
      env,
      chatId,
      "✏️ Send category name:"
    );
  }

  // Delete Category Menu
  if (data === "admin_delete_category") {
    if (!isAdmin(env, telegramId)) {
      return await sendMessage(env, chatId, "❌ Access denied");
    }

    const categories = await query(env, "categories", "GET");

    if (!categories.length) {
      return await sendMessage(env, chatId, "❌ No categories found.");
    }

    const buttons = categories.map(c => [
      {
        text: `🗑 ${c.name}`,
        callback_data: `deletecat_${c.id}`
      }
    ]);

    return await sendMessage(
      env,
      chatId,
      "Select a category to delete:",
      inlineKeyboard(buttons)
    );
  }

  // Delete Confirmation
  if (data.startsWith("deletecat_")) {
    const id = data.replace("deletecat_", "");

    const res = await query(
      env,
      "categories",
      "GET",
      null,
      `?id=eq.${id}`
    );

    const category = res[0];

    return await sendMessage(
      env,
      chatId,
      `⚠️ Delete "${category.name}"?\n\nThis will also delete ALL files inside it.`,
      inlineKeyboard([
        [
          {
            text: "✅ Yes",
            callback_data: `confirmdelete_${id}`
          },
          {
            text: "❌ Cancel",
            callback_data: "cancel_delete"
          }
        ]
      ])
    );
  }

  // Confirm Delete
  if (data.startsWith("confirmdelete_")) {
    const id = data.replace("confirmdelete_", "");

    await query(
      env,
      "files",
      "DELETE",
      null,
      `?category_id=eq.${id}`
    );

    await query(
      env,
      "categories",
      "DELETE",
      null,
      `?id=eq.${id}`
    );

    return await sendMessage(
      env,
      chatId,
      "✅ Category deleted successfully."
    );
  }

  // Cancel
  if (data === "cancel_delete") {
    return await sendMessage(
      env,
      chatId,
      "❌ Cancelled."
    );
  }

  // Stats
  if (data === "admin_stats") {
    if (!isAdmin(env, telegramId)) {
      return await sendMessage(env, chatId, "❌ Access denied");
    }

    const users = await query(env, "users", "GET");
    const categories = await query(env, "categories", "GET");
    const files = await query(env, "files", "GET");

    return await sendMessage(
      env,
      chatId,
      `📊 Bot Statistics

👤 Users: ${users.length}
📁 Categories: ${categories.length}
📄 Files: ${files.length}`
    );
  }

  // Credits
  if (data === "credits") {
    const c = await getCredits(env, telegramId);

    return await sendMessage(
      env,
      chatId,
      `💰 Your Credits: ${c}`
    );
  }

  return await sendMessage(
    env,
    chatId,
    "❌ Unknown action"
  );
}
