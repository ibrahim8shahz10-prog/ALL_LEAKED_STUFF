import { sendMessage } from "../services/telegram.js";
import { query } from "../database/supabase.js";

export async function handleStart(env, message) {
  const userId = message.from.id;
  const chatId = message.chat.id;

  const ref = message.text?.split(" ")[1];

  // create user if not exists
  const user = await query(
    env,
    "users",
    "GET",
    null,
    `?telegram_id=eq.${userId}`
  );

  if (!user.length) {
    await query(env, "users", "POST", {
      telegram_id: userId,
      referred_by: ref || null,
      is_verified: false,
      points: 0
    });
  }

  const userData = user[0];

  // 🔒 If not verified → show channels
  if (!userData?.is_verified) {

    const channels = await query(env, "required_channels", "GET");

    if (!channels || channels.length === 0) {
      return await sendMessage(
        env,
        chatId,
        "⚠️ No channels set by admin."
      );
    }

    let text = "🚫 You must join all channels to continue:\n\n";
    let buttons = [];

    for (const ch of channels) {
      const name = ch.channel_username;
      const link = ch.invite_link;

      text += `• ${name}\n`;

      buttons.push([
        {
          text: `Join ${name}`,
          url: link
        }
      ]);
    }

    buttons.push([
      {
        text: "✅ Verify",
        callback_data: "verify_join"
      }
    ]);

    return await sendMessage(env, chatId, text, {
      inline_keyboard: buttons
    });
  }

  // ✅ VERIFIED USERS → MAIN MENU
  return await sendMessage(
    env,
    chatId,
    "👋 Welcome back!",
    {
      inline_keyboard: [
        [{ text: "📂 Browse Files", callback_data: "browse" }],
        [{ text: "💰 Credits", callback_data: "credits" }],
        [{ text: "👥 Referral", callback_data: "referral" }]
      ]
    }
  );
}
