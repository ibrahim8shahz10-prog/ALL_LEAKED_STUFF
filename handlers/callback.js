import { sendMessage } from "../services/telegram.js";
import { getCredits, addCredits } from "../services/users.js";
import { handleBrowse } from "./browse.js";
import { handleCategory } from "./category.js";
import { handleFile } from "./file.js";
import { query } from "../database/supabase.js";
import { isAdmin } from "../utils/admin.js";
import { setState } from "../utils/stateDb.js";
import { inlineKeyboard } from "../keyboards/inlineKeyboard.js";

// ================= CHECK JOIN =================
async function checkJoin(env, telegramId) {
  const channels = await query(env, "required_channels", "GET");

  if (!channels || channels.length === 0) return true;

  for (const ch of channels) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/getChatMember?chat_id=${ch.channel_username}&user_id=${telegramId}`
      );

      const data = await res.json();

      if (!data?.ok || data?.result?.status === "left" || data?.result?.status === "kicked") {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

// ================= MAIN HANDLER =================
export async function handleCallback(env, callback) {
  const chatId = callback.message.chat.id;
  const telegramId = callback.from.id;
  const data = callback.data;

  // ================= VERIFY JOIN =================
  if (data === "verify_join") {
    const ok = await checkJoin(env, telegramId);

    if (!ok) {
      return await sendMessage(
        env,
        chatId,
        "❌ You have not joined all channels yet.\nPlease join and try again."
      );
    }

    await query(
      env,
      "users",
      "PATCH",
      { is_verified: true },
      `?telegram_id=eq.${telegramId}`
    );

    // AUTO MAIN MENU
    return await sendMessage(
      env,
      chatId,
      "✅ Verified Successfully!\n\n🎉 Main Menu:",
      {
        inline_keyboard: [
          [{ text: "📂 Browse Files", callback_data: "browse" }],
          [{ text: "💰 Credits", callback_data: "credits" }],
          [{ text: "👥 Referral", callback_data: "referral" }]
        ]
      }
    );
  }

  // ================= USER CHECK =================
  const userRes = await query(
    env,
    "users",
    "GET",
    null,
    `?telegram_id=eq.${telegramId}`
  );

  const user = userRes?.[0];

  // BLOCK IF NOT VERIFIED
  if (user && !user.is_verified && data !== "verify_join") {
    return await sendMessage(
      env,
      chatId,
      "🚫 Please join channels and verify first."
    );
  }

  // ================= BROWSE =================
  if (data === "browse") {
    return await handleBrowse(env, chatId);
  }

  // ================= CATEGORY =================
  if (data.startsWith("category_")) {
    const id = data.replace("category_", "");
    return await handleCategory(env, chatId, id);
  }

  // ================= FILE =================
  if (data.startsWith("file_")) {
    const id = data.replace("file_", "");
    return await handleFile(env, chatId, id, telegramId);
  }

  // ================= UNLOCK =================
  if (data.startsWith("unlock_")) {
    const fileId = data.replace("unlock_", "");

    const fileRes = await query(
      env,
      "files",
      "GET",
      null,
      `?id=eq.${fileId}`
    );

    const file = fileRes?.[0];

    if (!file) {
      return await sendMessage(env, chatId, "❌ File not found");
    }

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

  // ================= ADMIN =================
  if (data === "admin_add_category") {
    if (!isAdmin(env, telegramId)) {
      return await sendMessage(env, chatId, "❌ Access denied");
    }

    await setState(env, telegramId, "add_category");
    return await sendMessage(env, chatId, "✏️ Send category name:");
  }

  if (data === "admin_add_file") {
    if (!isAdmin(env, telegramId)) {
      return await sendMessage(env, chatId, "❌ Access denied");
    }

    const categories = await query(env, "categories", "GET");

    if (!categories.length) {
      return await sendMessage(env, chatId, "❌ No categories found.");
    }

    const buttons = categories.map(cat => [
      {
        text: cat.name,
        callback_data: `choosecat_${cat.id}`
      }
    ]);

    return await sendMessage(
      env,
      chatId,
      "📁 Choose category:",
      inlineKeyboard(buttons)
    );
  }

  if (data.startsWith("choosecat_")) {
    const categoryId = data.replace("choosecat_", "");

    await setState(env, telegramId, `add_file_${categoryId}`);

    return await sendMessage(env, chatId, "📎 Now send the file.");
  }

  // ================= DELETE =================
  if (data === "admin_delete_category") {
    if (!isAdmin(env, telegramId)) {
      return await sendMessage(env, chatId, "❌ Access denied");
    }

    const categories = await query(env, "categories", "GET");

    const buttons = categories.map(c => [
      {
        text: `🗑 ${c.name}`,
        callback_data: `deletecat_${c.id}`
      }
    ]);

    return await sendMessage(
      env,
      chatId,
      "Select category:",
      inlineKeyboard(buttons)
    );
  }

  if (data.startsWith("deletecat_")) {
    const id = data.replace("deletecat_", "");

    return await sendMessage(
      env,
      chatId,
      "⚠️ Confirm delete?",
      inlineKeyboard([
        [
          { text: "✅ Yes", callback_data: `confirmdelete_${id}` },
          { text: "❌ Cancel", callback_data: "cancel_delete" }
        ]
      ])
    );
  }

  if (data.startsWith("confirmdelete_")) {
    const id = data.replace("confirmdelete_", "");

    await query(env, "files", "DELETE", null, `?category_id=eq.${id}`);
    await query(env, "categories", "DELETE", null, `?id=eq.${id}`);

    return await sendMessage(env, chatId, "✅ Deleted successfully.");
  }

  if (data === "cancel_delete") {
    return await sendMessage(env, chatId, "❌ Cancelled.");
  }

  // ================= STATS =================
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
      `📊 Stats\n\n👤 Users: ${users.length}\n📁 Categories: ${categories.length}\n📄 Files: ${files.length}`
    );
  }

  // ================= CREDITS =================
  if (data === "credits") {
    const c = await getCredits(env, telegramId);
    return await sendMessage(env, chatId, `💰 Credits: ${c}`);
  }

  return await sendMessage(env, chatId, "❌ Unknown action");
}
