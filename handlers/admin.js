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
    "👑 <b>Admin Panel</b>\n━━━━━━━━━━━━━━━━",
    inlineKeyboard([
      [
        { text: "➕ Add Category", callback_data: "admin_add_category" },
        { text: "📁 Add Content", callback_data: "admin_add_content" }
      ],
      [
        { text: "✏️ Edit Category", callback_data: "admin_edit_category" },
        { text: "✏️ Edit Content", callback_data: "admin_edit_content" }
      ],
      [{ text: "🗑 Delete Category", callback_data: "admin_delete_category" }],
      [
        { text: "💰 Give Points", callback_data: "admin_give_points" },
        { text: "🚫 Ban User", callback_data: "admin_ban_user" }
      ],
      [
        { text: "✅ Unban User", callback_data: "admin_unban_user" },
        { text: "🔍 Search User", callback_data: "admin_search_user" }
      ],
      [
        { text: "📊 Stats", callback_data: "admin_stats" },
        { text: "🔥 Top Purchased", callback_data: "admin_top_purchased" }
      ],
      [
        { text: "📢 Broadcast", callback_data: "admin_broadcast" },
        { text: "🎁 Redeem Code", callback_data: "admin_create_code" }
      ],
      [
        { text: "👥 Referral Pts", callback_data: "admin_set_refpoints" },
        { text: "🎯 Daily Pts", callback_data: "admin_set_dailypoints" }
      ],
      [
        { text: "🔒 Req. Channels", callback_data: "admin_manage_channels" },
        { text: "💳 Buy Pts Info", callback_data: "admin_set_buypoints" }
      ]
    ])
  );
}
