import { sendMessage } from "../services/telegram.js";
import { isAdmin } from "../utils/admin.js";
import { inlineKeyboard } from "../keyboards/inlineKeyboard.js";

export async function handleAdmin(env, message) {
  if (!isAdmin(env, message.from.id)) {
    return await sendMessage(env, message.chat.id, "❌ Access denied");
  }

  await sendMessage(
    env,
    message.chat.id,
    `👑 Admin Panel

Choose an option:`,
    inlineKeyboard([
      [{ text: "➕ Add Category", callback_data: "admin_add_category" }],
      [{ text: "➕ Add File", callback_data: "admin_add_file" }],
      [{ text: "📊 Stats", callback_data: "admin_stats" }]
    ])
  );
}
