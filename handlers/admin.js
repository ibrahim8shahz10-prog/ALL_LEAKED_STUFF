import { sendMessage } from "../services/telegram.js";
import { isAdmin } from "../utils/admin.js";
import { inlineKeyboard } from "../keyboards/inlineKeyboard.js";

export async function handleAdmin(env, message) {
  if (!isAdmin(env, message.from.id)) {
    return await sendMessage(
      env,
      message.chat.id,
      "❌ Access denied"
    );
  }

  await sendMessage(
    env,
    message.chat.id,
    "👑 <b>Admin Panel</b>",
    inlineKeyboard([
      [{ text: "➕ Add Category", callback_data: "admin_add_category" }],
      [{ text: "📁 Add File", callback_data: "admin_add_file" }],
      [{ text: "🗑 Delete Category", callback_data: "admin_delete_category" }],
      [{ text: "📊 Stats", callback_data: "admin_stats" }],
      [{ text: "📢 Broadcast Message", callback_data: "admin_broadcast" }],
      [{ text: "🎁 Create Redeem Code", callback_data: "admin_create_code" }],
      [{ text: "👥 Set Referral Points", callback_data: "admin_set_refpoints" }],
      [{ text: "🎯 Set Daily Points", callback_data: "admin_set_dailypoints" }]
    ])
  );
}
