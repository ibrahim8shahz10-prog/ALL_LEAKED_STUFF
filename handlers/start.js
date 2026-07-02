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
    let refDebug = refCode ? `\n\n🔍 <i>Debug: received code "${refCode}"</i>` : "";

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
          refDebug += `\n🔍 <i>Matched referrer ID: ${referrer.telegram_id}</i>`;
        } else if (referrer) {
          refDebug += `\n🔍 <i>Code matched yourself — ignored</i>`;
        } else {
          refDebug += `\n🔍 <i>No user found with that referral_code</i>`;
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
    } else {
      // Existing but unverified user opening a referral link later —
      // attach them to the referrer if not already linked.
      const existing = userRes[0];

      if (refCode && !existing.referred_by && !existing.is_verified) {
        const referrer = await getReferral(env, refCode);

        if (referrer && referrer.telegram_id !== userId) {
          await query(
            env,
            "users",
            "PATCH",
            { referred_by: referrer.telegram_id },
            `?telegram_id=eq.${userId}`
          );

          existing.referred_by = referrer.telegram_id;
          refDebug += `\n🔍 <i>Matched referrer ID: ${referrer.telegram_id} (attached)</i>`;
        } else if (referrer) {
          refDebug += `\n🔍 <i>Code matched yourself — ignored</i>`;
        } else {
          refDebug += `\n🔍 <i>No user found with that referral_code</i>`;
        }
      } else if (refCode && existing.referred_by) {
        refDebug += `\n🔍 <i>Already linked to referrer ID: ${existing.referred_by}</i>`;
      } else if (refCode && existing.is_verified) {
        refDebug += `\n🔍 <i>Account already verified — too late to attach</i>`;
      }
    }

    const user = userRes[0];

    if (user.banned) {
      return await sendMessage(env, chatId, "🚫 You have been banned from using this bot.");
    }

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
        `🚫 <b>One Step Left</b>\n\nPlease join all required channels, then tap Verify below.${refDebug}`,
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
