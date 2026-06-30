import { handleStart } from "./handlers/start.js";
import { handleCallback } from "./handlers/callback.js";
import { handleAdmin } from "./handlers/admin.js";

import { query } from "./database/supabase.js";
import { isAdmin } from "./utils/admin.js";
import { getState, setState, clearState } from "./utils/stateDb.js";
import { sendMessage } from "./services/telegram.js";
import { createUpload } from "./utils/uploadTemp.js";

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Bot is running!");
    }

    const update = await request.json();

    const message = update.message;
    const callback = update.callback_query;

    // ================= CALLBACK =================
    if (callback) {
      await handleCallback(env, callback);
      return new Response("OK");
    }

    // ================= MESSAGE =================
    if (message) {
      const userId = message.from.id;
      const chatId = message.chat.id;
      const text = message.text || "";
      const document = message.document;

      // ================= COMMANDS =================
      if (text === "/start") {
        await handleStart(env, message);
        return new Response("OK");
      }

      if (text === "/admin") {
        await handleAdmin(env, message);
        return new Response("OK");
      }

      // ================= ADMIN STATE SYSTEM =================
      if (await isAdmin(env, userId)) {

        const stateRow = await getState(env, userId);

        // ================= ADD CATEGORY =================
        if (stateRow?.state === "add_category") {
          await query(env, "categories", "POST", {
            name: text
          });

          await clearState(env, userId);

          await sendMessage(env, chatId, `✅ Category added: ${text}`);
          return new Response("OK");
        }

        // ================= ADD FILE FLOW =================
        if (stateRow?.state?.startsWith("add_file_")) {
          const categoryId = stateRow.state.replace("add_file_", "");

          // STEP 1: RECEIVE FILE
          if (!stateRow.state.includes("title") &&
              !stateRow.state.includes("desc") &&
              !stateRow.state.includes("price")) {

            if (!document) {
              await sendMessage(env, chatId, "📎 Please send a file (document).");
              return new Response("OK");
            }

            await createUpload(env, userId, categoryId, document.file_id);

            await setState(env, userId, `add_file_title_${categoryId}`);

            await sendMessage(env, chatId, "✏️ Now send TITLE");
            return new Response("OK");
          }

          // STEP 2: TITLE
          if (stateRow.state.startsWith("add_file_title_")) {
            await query(env, "upload_temp", "PATCH", {
              title: text
            }, `?telegram_id=eq.${userId}`);

            const catId = stateRow.state.replace("add_file_title_", "");

            await setState(env, userId, `add_file_desc_${catId}`);

            await sendMessage(env, chatId, "📝 Now send DESCRIPTION");
            return new Response("OK");
          }

          // STEP 3: DESCRIPTION
          if (stateRow.state.startsWith("add_file_desc_")) {
            await query(env, "upload_temp", "PATCH", {
              description: text
            }, `?telegram_id=eq.${userId}`);

            const catId = stateRow.state.replace("add_file_desc_", "");

            await setState(env, userId, `add_file_price_${catId}`);

            await sendMessage(env, chatId, "💰 Now send PRICE");
            return new Response("OK");
          }

          // STEP 4: PRICE + SAVE
          if (stateRow.state.startsWith("add_file_price_")) {
            const price = parseInt(text);

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
              file_url: data.file_id
            });

            await clearState(env, userId);

            await query(env, "upload_temp", "DELETE", null, `?telegram_id=eq.${userId}`);

            await sendMessage(env, chatId, "✅ File added successfully!");
            return new Response("OK");
          }
        }
      }

      return new Response("OK");
    }

    return new Response("OK");
  }
};
