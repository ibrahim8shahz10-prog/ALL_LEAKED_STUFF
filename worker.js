import { handleStart } from "./handlers/start.js";
import { handleCallback } from "./handlers/callback.js";
import { handleAdmin } from "./handlers/admin.js";

import { query } from "./database/supabase.js";
import { isAdmin } from "./utils/admin.js";
import { getState, setState, clearState } from "./utils/stateDb.js";
import { sendMessage } from "./services/telegram.js";
import { createUpload } from "./utils/uploadTemp.js";
import { claimDailyBonus } from "./services/daily.js";
import { redeemCode, createRedeemCode } from "./utils/redeem.js";
import { updateSettings } from "./utils/settings.js";
import { helpMenu } from "./handlers/help.js";
import { inlineKeyboard } from "./keyboards/inlineKeyboard.js";

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Bot is running!");
    }

    const update = await request.json();

    const message = update.message;
    const callback = update.callback_query;

    if (callback) {
      await handleCallback(env, callback);
      return new Response("OK");
    }

    if (message) {
      const userId = message.from.id;
      const chatId = message.chat.id;
      const text = message.text || "";
      const document = message.document;

      if (text.startsWith("/start")) {
        await handleStart(env, message);
        return new Response("OK");
      }

      if (text === "/admin") {
        await handleAdmin(env, message);
        return new Response("OK");
      }

      if (text === "/help") {
        await helpMenu(env, chatId);
        return new Response("OK");
      }

      if (text === "/daily") {
        await claimDailyBonus(env, chatId, userId);
        return new Response("OK");
      }

      if (text.startsWith("/redeem")) {
        const code = text.split(" ")[1];

        if (!code) {
          await sendMessage(env, chatId, "Usage: <code>/redeem CODE</code>");
          return new Response("OK");
        }

        const result = await redeemCode(env, userId, code.trim());
        await sendMessage(env, chatId, result.message);
        return new Response("OK");
      }

      const stateRow = await getState(env, userId);

      if (stateRow?.state === "feedback_wait") {
        await clearState(env, userId);

        const fromName = message.from.username
          ? `@${message.from.username}`
          : (message.from.first_name || "User");

        await sendMessage(
          env,
          env.ADMIN_ID,
          `📩 <b>New Feedback</b>\n\nFrom: ${fromName} (ID: ${userId})\n\n${text}`,
          inlineKeyboard([
            [{ text: "💬 Reply", callback_data: `admin_reply_${userId}` }]
          ])
        );

        await sendMessage(env, chatId, "✅ Your message has been sent to the admin.");
        return new Response("OK");
      }

      if (stateRow?.state?.startsWith("reply_wait_") && (await isAdmin(env, userId))) {
        const targetId = stateRow.state.replace("reply_wait_", "");

        await clearState(env, userId);

        await sendMessage(env, targetId, `📨 <b>Reply from Admin</b>\n\n${text}`);
        await sendMessage(env, chatId, "✅ Reply sent.");
        return new Response("OK");
      }

      if (await isAdmin(env, userId)) {

        if (stateRow?.state === "broadcast") {
          await clearState(env, userId);

          const users = await query(env, "users", "GET");
          let sent = 0;

          for (const u of users || []) {
            try {
              await sendMessage(env, u.telegram_id, `📢 <b>Announcement</b>\n\n${text}`);
              sent++;
            } catch (e) {
              console.log("broadcast fail:", u.telegram_id, e.message);
            }
          }

          await sendMessage(env, chatId, `✅ Broadcast sent to ${sent} users.`);
          return new Response("OK");
        }

        if (stateRow?.state === "create_code_points") {
          const points = parseInt(text);

          if (isNaN(points)) {
            await sendMessage(env, chatId, "❌ Please send a number.");
            return new Response("OK");
          }

          await setState(env, userId, `create_code_maxuses_${points}`);
          await sendMessage(env, chatId, "👥 How many users can redeem this code?");
          return new Response("OK");
        }

        if (stateRow?.state?.startsWith("create_code_maxuses_")) {
          const points = parseInt(stateRow.state.replace("create_code_maxuses_", ""));
          const maxUses = parseInt(text);

          if (isNaN(maxUses)) {
            await sendMessage(env, chatId, "❌ Please send a number.");
            return new Response("OK");
          }

          const code = await createRedeemCode(env, points, maxUses);
          await clearState(env, userId);

          await sendMessage(
            env,
            chatId,
            `✅ <b>Redeem Code Created</b>\n\n🎁 Code: <code>${code}</code>\n⭐ Points: ${points}\n👥 Max Uses: ${maxUses}\n\nUsers redeem with:\n<code>/redeem ${code}</code>`
          );
          return new Response("OK");
        }

        if (stateRow?.state === "set_refpoints") {
          const val = parseInt(text);

          if (isNaN(val)) {
            await sendMessage(env, chatId, "❌ Please send a number.");
            return new Response("OK");
          }

          await updateSettings(env, { referral_points: val });
          await clearState(env, userId);
          await sendMessage(env, chatId, `✅ Referral points set to ${val} per verified referral.`);
          return new Response("OK");
        }

        if (stateRow?.state === "set_dailypoints") {
          const val = parseInt(text);

          if (isNaN(val)) {
            await sendMessage(env, chatId, "❌ Please send a number.");
            return new Response("OK");
          }

          await updateSettings(env, { daily_points: val });
          await clearState(env, userId);
          await sendMessage(env, chatId, `✅ Daily bonus set to ${val} points.`);
          return new Response("OK");
        }

        if (stateRow?.state === "give_points_id") {
          const targetId = text.trim();

          if (!/^\d+$/.test(targetId)) {
            await sendMessage(env, chatId, "❌ Please send a valid numeric Telegram ID.");
            return new Response("OK");
          }

          await setState(env, userId, `give_points_amount_${targetId}`);
          await sendMessage(env, chatId, "⭐ How many points to give? (use a negative number to deduct)");
          return new Response("OK");
        }

        if (stateRow?.state?.startsWith("give_points_amount_")) {
          const targetId = stateRow.state.replace("give_points_amount_", "");
          const amount = parseInt(text);

          if (isNaN(amount)) {
            await sendMessage(env, chatId, "❌ Please send a number.");
            return new Response("OK");
          }

          const userRes = await query(env, "users", "GET", null, `?telegram_id=eq.${targetId}`);
          const targetUser = userRes?.[0];

          if (!targetUser) {
            await clearState(env, userId);
            await sendMessage(env, chatId, "❌ User not found.");
            return new Response("OK");
          }

          const newPoints = (targetUser.points || 0) + amount;

          await query(
            env,
            "users",
            "PATCH",
            { points: newPoints },
            `?telegram_id=eq.${targetId}`
          );

          await clearState(env, userId);

          await sendMessage(
            env,
            chatId,
            `✅ ${amount >= 0 ? "Gave" : "Deducted"} ${Math.abs(amount)} points ${amount >= 0 ? "to" : "from"} user ${targetId}.\n⭐ New balance: ${newPoints}`
          );

          try {
            await sendMessage(
              env,
              targetId,
              amount >= 0
                ? `🎁 An admin gave you ${amount} points!\n⭐ New balance: ${newPoints}`
                : `⚠️ An admin deducted ${Math.abs(amount)} points.\n⭐ New balance: ${newPoints}`
            );
          } catch (e) {
            console.log("notify user failed:", e.message);
          }

          return new Response("OK");
        }

        if (stateRow?.state === "ban_user_id") {
          const targetId = text.trim();

          if (!/^\d+$/.test(targetId)) {
            await sendMessage(env, chatId, "❌ Please send a valid numeric Telegram ID.");
            return new Response("OK");
          }

          await query(env, "users", "PATCH", { banned: true }, `?telegram_id=eq.${targetId}`);
          await clearState(env, userId);
          await sendMessage(env, chatId, `🚫 User ${targetId} has been banned.`);
          return new Response("OK");
        }

        if (stateRow?.state === "unban_user_id") {
          const targetId = text.trim();

          if (!/^\d+$/.test(targetId)) {
            await sendMessage(env, chatId, "❌ Please send a valid numeric Telegram ID.");
            return new Response("OK");
          }

          await query(env, "users", "PATCH", { banned: false }, `?telegram_id=eq.${targetId}`);
          await clearState(env, userId);
          await sendMessage(env, chatId, `✅ User ${targetId} has been unbanned.`);
          return new Response("OK");
        }

        if (stateRow?.state === "add_category") {
          await query(env, "categories", "POST", {
            name: text
          });

          await clearState(env, userId);

          await sendMessage(env, chatId, `✅ Category added: ${text}`);
          return new Response("OK");
        }

        if (stateRow?.state?.startsWith("edit_cat_name_")) {
          const catId = stateRow.state.replace("edit_cat_name_", "");

          await query(env, "categories", "PATCH", { name: text }, `?id=eq.${catId}`);
          await clearState(env, userId);

          await sendMessage(env, chatId, `✅ Category renamed to: ${text}`);
          return new Response("OK");
        }

        if (stateRow?.state?.startsWith("edit_file_title_")) {
          const fileId = stateRow.state.replace("edit_file_title_", "");

          await query(env, "files", "PATCH", { title: text }, `?id=eq.${fileId}`);
          await clearState(env, userId);

          await sendMessage(env, chatId, "✅ Title updated.");
          return new Response("OK");
        }

        if (stateRow?.state?.startsWith("edit_file_desc_")) {
          const fileId = stateRow.state.replace("edit_file_desc_", "");

          await query(env, "files", "PATCH", { description: text }, `?id=eq.${fileId}`);
          await clearState(env, userId);

          await sendMessage(env, chatId, "✅ Description updated.");
          return new Response("OK");
        }

        if (stateRow?.state?.startsWith("edit_file_price_")) {
          const fileId = stateRow.state.replace("edit_file_price_", "");
          const price = parseInt(text);

          if (isNaN(price)) {
            await sendMessage(env, chatId, "❌ Please send a number.");
            return new Response("OK");
          }

          await query(env, "files", "PATCH", { price }, `?id=eq.${fileId}`);
          await clearState(env, userId);

          await sendMessage(env, chatId, `✅ Price updated to ${price} points.`);
          return new Response("OK");
        }

        if (stateRow?.state?.startsWith("edit_file_content_file_")) {
          const fileId = stateRow.state.replace("edit_file_content_file_", "");

          if (!document) {
            await sendMessage(env, chatId, "📎 Please send a file (document).");
            return new Response("OK");
          }

          await query(env, "files", "PATCH", {
            content_type: "file",
            file_url: document.file_id,
            text_content: null
          }, `?id=eq.${fileId}`);

          await clearState(env, userId);
          await sendMessage(env, chatId, "✅ Content replaced with new file.");
          return new Response("OK");
        }

        if (stateRow?.state?.startsWith("edit_file_content_text_")) {
          const fileId = stateRow.state.replace("edit_file_content_text_", "");

          await query(env, "files", "PATCH", {
            content_type: "text",
            text_content: text,
            file_url: null
          }, `?id=eq.${fileId}`);

          await clearState(env, userId);
          await sendMessage(env, chatId, "✅ Content replaced with new text.");
          return new Response("OK");
        }

        if (stateRow?.state?.startsWith("addc_file_wait_")) {
          const categoryId = stateRow.state.replace("addc_file_wait_", "");

          if (!document) {
            await sendMessage(env, chatId, "📎 Please send a file (document).");
            return new Response("OK");
          }

          await createUpload(env, userId, categoryId, document.file_id);
          await query(env, "upload_temp", "PATCH", {
            content_type: "file"
          }, `?telegram_id=eq.${userId}`);

          await setState(env, userId, `addc_title_${categoryId}`);
          await sendMessage(env, chatId, "✏️ Now send TITLE");
          return new Response("OK");
        }

        if (stateRow?.state?.startsWith("addc_text_wait_")) {
          const categoryId = stateRow.state.replace("addc_text_wait_", "");

          await createUpload(env, userId, categoryId, null);
          await query(env, "upload_temp", "PATCH", {
            content_type: "text",
            text_content: text
          }, `?telegram_id=eq.${userId}`);

          await setState(env, userId, `addc_title_${categoryId}`);
          await sendMessage(env, chatId, "✏️ Now send TITLE");
          return new Response("OK");
        }

        if (stateRow?.state?.startsWith("addc_title_")) {
          await query(env, "upload_temp", "PATCH", {
            title: text
          }, `?telegram_id=eq.${userId}`);

          const catId = stateRow.state.replace("addc_title_", "");
          await setState(env, userId, `addc_desc_${catId}`);
          await sendMessage(env, chatId, "📝 Now send DESCRIPTION");
          return new Response("OK");
        }

        if (stateRow?.state?.startsWith("addc_desc_")) {
          await query(env, "upload_temp", "PATCH", {
            description: text
          }, `?telegram_id=eq.${userId}`);

          const catId = stateRow.state.replace("addc_desc_", "");
          await setState(env, userId, `addc_price_${catId}`);
          await sendMessage(env, chatId, "💰 Now send PRICE (in points)");
          return new Response("OK");
        }

        if (stateRow?.state?.startsWith("addc_price_")) {
          const price = parseInt(text);

          if (isNaN(price)) {
            await sendMessage(env, chatId, "❌ Please send a number.");
            return new Response("OK");
          }

          const temp = await query(
            env,
            "upload_temp",
            "GET",
            null,
            `?telegram_id=eq.${userId}`
          );

          const data = temp?.[0];

          if (!data) {
            await sendMessage(env, chatId, "❌ Upload session expired.");
            return new Response("OK");
          }

          await query(env, "files", "POST", {
            category_id: data.category_id,
            title: data.title,
            description: data.description,
            price: price,
            content_type: data.content_type,
            file_url: data.content_type === "file" ? data.file_id : null,
            text_content: data.content_type === "text" ? data.text_content : null
          });

          await clearState(env, userId);
          await query(env, "upload_temp", "DELETE", null, `?telegram_id=eq.${userId}`);

          await sendMessage(env, chatId, "✅ Content added successfully!");
          return new Response("OK");
        }

        if (stateRow?.state === "add_channel_username") {
          const username = text.trim();

          if (!username.startsWith("@")) {
            await sendMessage(env, chatId, "❌ Please send a username starting with @ (e.g. @SocialXservices).");
            return new Response("OK");
          }

          await setState(env, userId, `add_channel_link_${username}`);
          await sendMessage(env, chatId, "🔗 Now send the invite link (e.g. https://t.me/SocialXservices):");
          return new Response("OK");
        }

        if (stateRow?.state?.startsWith("add_channel_link_")) {
          const username = stateRow.state.replace("add_channel_link_", "");
          const link = text.trim();

          await query(env, "required_channels", "POST", {
            channel_username: username,
            invite_link: link,
            platform: "telegram"
          });

          await clearState(env, userId);
          await sendMessage(env, chatId, `✅ Added to required channels: ${username}`);
          return new Response("OK");
        }
      }

      return new Response("OK");
    }

    return new Response("OK");
  }
};
