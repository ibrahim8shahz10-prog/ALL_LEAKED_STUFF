import { sendMessage } from "../services/telegram.js";
import { getCredits, addCredits } from "../services/users.js";
import { handleBrowse } from "./browse.js";
import { handleCategory } from "./category.js";
import { handleFile } from "./handleFile.js";
import { query } from "../database/supabase.js";
import { isAdmin } from "../utils/admin.js";
import { setState } from "../utils/stateDb.js";

// ================= ANSWER CALLBACK (IMPORTANT FIX) =================
async function answerCallback(env, callback, text = "") {
  try {
    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callback.id,
        text
      })
    });
  } catch (e) {
    console.log("answerCallback error:", e);
  }
}

// ================= CHECK JOIN =================
async function checkJoin(env, telegramId) {
  try {
    const channels = await query(env, "required_channels", "GET");

    if (!channels || channels.length === 0) return true;

    for (const ch of channels) {
      const chatId = String(ch.channel_username || "").trim();

      if (!chatId) continue;

      const res = await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${telegramId}`
      );

      const data = await res.json();

      if (!data?.ok) return false;

      const status = data?.result?.status;

      if (status === "left" || status === "kicked") {
        return false;
      }
    }

    return true;
  } catch (e) {
    console.log("CHECK JOIN ERROR:", e);
    return false;
  }
}

// ================= MAIN HANDLER =================
export async function handleCallback(env, callback) {
  const chatId = callback.message?.chat?.id;
  const telegramId = callback.from?.id;
  const data = callback.data;

  const reply = (msg, kb) => sendMessage(env, chatId, msg, kb);

  // ================= VERIFY JOIN =================
  if (data === "verify_join") {
    await answerCallback(env, callback, "Checking...");

    const ok = await checkJoin(env, telegramId);

    if (!ok) {
      return await reply(
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

    return await reply(
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

  if (user && !user.is_verified && data !== "verify_join") {
    return await reply("🚫 Please join channels and verify first.");
  }

  // ================= BROWSE =================
  if (data === "browse") return await handleBrowse(env, chatId);

  // ================= CATEGORY =================
  if (data.startsWith("category_")) {
    return await handleCategory(env, chatId, data.replace("category_", ""));
  }

  // ================= FILE =================
  if (data.startsWith("file_")) {
    return await handleFile(env, chatId, data.replace("file_", ""), telegramId);
  }

  // ================= UNLOCK =================
  if (data.startsWith("unlock_")) {
    const fileId = data.replace("unlock_", "");

    const fileRes = await query(env, "files", "GET", null, `?id=eq.${fileId}`);
    const file = fileRes?.[0];

    if (!file) return await reply("❌ File not found");

    const credits = await getCredits(env, telegramId);

    if (credits < file.price) {
      return await reply("❌ Not enough credits");
    }

    await addCredits(env, telegramId, -file.price);

    return await reply(
      `✅ Unlocked!\n\n📄 ${file.title}\n🔗 ${file.file_url}`
    );
  }

  // ================= ADMIN =================
  if (data === "admin_add_category") {
    if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

    await setState(env, telegramId, "add_category");
    return await reply("✏️ Send category name:");
  }

  if (data === "admin_add_file") {
    if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

    const categories = await query(env, "categories", "GET");

    if (!categories?.length) return await reply("❌ No categories found.");

    const buttons = categories.map(c => ([
      { text: c.name, callback_data: `choosecat_${c.id}` }
    ]));

    return await reply("📁 Choose category:", {
      inline_keyboard: buttons
    });
  }

  if (data.startsWith("choosecat_")) {
    await setState(env, telegramId, `add_file_${data.replace("choosecat_", "")}`);
    return await reply("📎 Now send the file.");
  }

  // ================= DELETE =================
  if (data === "admin_delete_category") {
    if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

    const categories = await query(env, "categories", "GET");

    const buttons = categories.map(c => ([
      { text: `🗑 ${c.name}`, callback_data: `deletecat_${c.id}` }
    ]));

    return await reply("Select category:", {
      inline_keyboard: buttons
    });
  }

  if (data.startsWith("deletecat_")) {
    return await reply(
      "⚠️ Confirm delete?",
      {
        inline_keyboard: [
          [
            { text: "✅ Yes", callback_data: `confirmdelete_${data.replace("deletecat_", "")}` },
            { text: "❌ Cancel", callback_data: "cancel_delete" }
          ]
        ]
      }
    );
  }

  if (data.startsWith("confirmdelete_")) {
    const id = data.replace("confirmdelete_", "");

    await query(env, "files", "DELETE", null, `?category_id=eq.${id}`);
    await query(env, "categories", "DELETE", null, `?id=eq.${id}`);

    return await reply("✅ Deleted successfully.");
  }

  if (data === "cancel_delete") {
    return await reply("❌ Cancelled.");
  }

  // ================= STATS =================
  if (data === "admin_stats") {
    if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

    const users = await query(env, "users", "GET");
    const categories = await query(env, "categories", "GET");
    const files = await query(env, "files", "GET");

    return await reply(
      `📊 Stats\n\n👤 Users: ${users.length}\n📁 Categories: ${categories.length}\n📄 Files: ${files.length}`
    );
  }

  // ================= CREDITS =================
  if (data === "credits") {
    const c = await getCredits(env, telegramId);
    return await reply(`💰 Credits: ${c}`);
  }

  return await reply("❌ Unknown action");
}
