import { sendMessage } from "../services/telegram.js";
import { query } from "../database/supabase.js";
import { getReferral } from "../services/referrals.js";
import { generateCode } from "../utils/generateCode.js";
import { mainMenu } from "../keyboards/mainMenu.js";

export async function handleStart(env, message) {
  try {
    const userId = message.from.id;
    const chatId = message.chat.id;
    const refCode = message.text?.split(" ")[1] || null;

    let userRes = await query(
      env,
      "users",
      "GET",
      null,
      `?telegram_id=eq.${userId}`
    );

    if (!Array.isArray(userRes) || userRes.length === 0) {
      let referredBy = null;

      if (refCode) {
        const referrer = await getReferral(env, refCode);
        if (referrer && referrer.telegram_id !== userId) {
          referredBy = referrer.telegram_id;
        }
      }

      await query(env, "users", "POST", {
        telegram_id: userId,
        username: message.from.username || "",
        first_name: message.from.first_name || "",
        referred_by: referredBy,
        referral_code: generateCode(userId),
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
        "🚫 <b>One Step Left</b>\n\nPlease join all required channels, then tap Verify below.",
        {
          inline_keyboard: buttons
        }
      );
    }

    return await sendMessage(
      env,
      chatId,
      `👋 <b>Welcome back!</b>\n\nUse the menu below to get started.`,
      mainMenu()
    );

  } catch (err) {
    console.log("handleStart error:", err.message);

    return await sendMessage(
      env,
      message.chat.id,
      `❌ Error:\n<code>${err.message}</code>`
    );
  }
}
