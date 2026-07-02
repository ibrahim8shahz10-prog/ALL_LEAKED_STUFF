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

      if (text === "/start") {
        await handleStart(env, message);
        return new Response("OK");
      }

      if (text === "/admin") {
        await handleAdmin(env, message);
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

      if (await isAdmin(env, userId)) {

        const stateRow = await getState(env, userId);

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

        if (stateRow?.state === "add_category") {
          await query(env, "categories", "POST", {
            name: text
          });

          await clearState(env, userId);

          await sendMessage(env, chatId, `✅ Category added: ${text}`);
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
      }

      return new Response("OK");
    }

    return new Response("OK");
  }
};
