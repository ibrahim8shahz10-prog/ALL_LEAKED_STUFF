import { sendMessage } from "../services/telegram.js";
import { query } from "../database/supabase.js";

export async function handleStart(env, message) {
  try {
    const userId = message.from.id;
    const chatId = message.chat.id;
    const ref = message.text?.split(" ")[1] || null;

    let userRes = await query(
      env,
      "users",
      "GET",
      null,
      `?telegram_id=eq.${userId}`
    );

    if (!Array.isArray(userRes) || userRes.length === 0) {
      await query(env, "users", "POST", {
        telegram_id: userId,
        referred_by: ref,
        is_verified: false,
        credits: 0,
        points: 0
      });

      userRes = [{
        telegram_id: userId,
        is_verified: false,
        credits: 0,
        points: 0
      }];
    }

    const user = userRes[0];

    if (!user.is_verified) {
      const channels = await query(env, "required_channels", "GET");

      if (!Array.isArray(channels) || channels.length === 0) {
        return await sendMessage(
          env,
          chatId,
          "⚠️ No required channels have been added by the admin."
        );
      }

      const buttons = channels.map(ch => ([
        {
          text: `📢 Join ${ch.channel_username}`,
          url: ch.invite_link
        }
      ]));

      buttons.push([
        {
          text: "✅ Verify",
          callback_data: "verify_join"
        }
      ]);

      return await sendMessage(
        env,
        chatId,
        "🚫 Please join all required channels first.",
        {
          inline_keyboard: buttons
        }
      );
    }

    return await sendMessage(env, chatId, "👋 Welcome!", {
      inline_keyboard: [
        [{ text: "📂 Browse Files", callback_data: "browse" }],
        [{ text: "💰 Credits", callback_data: "credits" }],
        [{ text: "👥 Referral", callback_data: "referral" }]
      ]
    });

  } catch (err) {
    console.log("handleStart error:", err.message);

    return await sendMessage(
      env,
      message.chat.id,
      `❌ Error:\n<code>${err.message}</code>`
    );
  }
}
