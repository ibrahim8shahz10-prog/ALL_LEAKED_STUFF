import { sendMessage } from "../services/telegram.js";
import { query } from "../database/supabase.js";

export async function handleStart(env, message) {
  const userId = message.from.id;
  const chatId = message.chat.id;

  const ref = message.text?.split(" ")[1];

  let userRes = await query(
    env,
    "users",
    "GET",
    null,
    `?telegram_id=eq.${userId}`
  );

  if (!userRes.length) {
    await query(env, "users", "POST", {
      telegram_id: userId,
      referred_by: ref || null,
      is_verified: false,
      points: 0
    });

    userRes = [{ is_verified: false }];
  }

  const user = userRes[0];

  // ================= NOT VERIFIED =================
  if (!user.is_verified) {
    const channels = await query(env, "required_channels", "GET");

    if (!channels || channels.length === 0) {
      return await sendMessage(env, chatId, "⚠️ No channels set.");
    }

    let text = "🚫 Join all channels to continue:\n\n";
    let buttons = [];

    for (const ch of channels) {
      text += `• ${ch.channel_username}\n`;

      buttons.push([
        {
          text: `Join ${ch.channel_username}`,
          url: ch.invite_link
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

  // ================= MAIN MENU =================
  return await sendMessage(env, chatId, "👋 Welcome!", {
    inline_keyboard: [
      [{ text: "📂 Browse Files", callback_data: "browse" }],
      [{ text: "💰 Credits", callback_data: "credits" }],
      [{ text: "👥 Referral", callback_data: "referral" }]
    ]
  });
}
