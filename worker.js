import { handleStart } from "./handlers/start.js";
import { handleCallback } from "./handlers/callback.js";
import { handleAdmin } from "./handlers/admin.js";
import { verifyJoin } from "./handlers/verify.js";
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

    // Safely parse JSON to prevent crashes on empty requests
    let update;
    try {
      update = await request.json();
    } catch (e) {
      return new Response("Invalid JSON", { status: 400 });
    }

    const message = update.message;
    const callback = update.callback_query;

    // =====================
    // CALLBACK HANDLER
    // =====================
    if (callback) {
      if (callback.data === "verify_join") {
        await verifyJoin(env, callback);
        return new Response("OK");
      }

      await handleCallback(env, callback);
      return new Response("OK");
    }

    // =====================
    // MESSAGE HANDLER
    // =====================
    if (message) {
      const userId = message.from.id;
      const chatId = message.chat.id;
      const text = message.text || "";
      const document = message.document;

      // 1. COMMANDS FIRST
      if (text === "/start") {
        await handleStart(env, message);
        return new Response("OK");
      }

      if (text === "/admin") {
        await handleAdmin(env, message);
        return new Response("OK");
      }

      // 2. STATE HANDLING SECOND
      if (await isAdmin(env, userId)) {
        const stateRow = await getState(env, userId);

        if (stateRow) {
          // ---------------------
          // ADD CATEGORY
          // ---------------------
          if (stateRow.state === "add_category") {
            if (!text.trim()) {
              await sendMessage(env, chatId, "❌ Please send a valid text name for the category.");
              return new Response("OK");
            }

            await query(env, "categories", "POST", { name: text });
            await clearState(env, userId);
            await sendMessage(env, chatId, `✅ Category "${text}" added successfully.`);
            return new Response("OK");
          }

          // =====================
          // ADD FILE - STEP 1 (DOCUMENT)
          // =====================
          if (
            stateRow.state.startsWith("add_file_") && 
            !stateRow.state.includes("_title_") && 
            !stateRow.state.includes("_desc_") && 
            !stateRow.state.includes("_price_")
          ) {
            const categoryId = stateRow.state.replace("add_file_", "");

            if (!document) {
              await sendMessage(env, chatId, "📎 Please send a document (file).");
              return new Response("OK");
            }

            // Save temp upload
            await createUpload(env, userId, categoryId, document.file_id);

            // Move to next step
            await clearState(env, userId);
            await setState(env, userId, `add_file_title_${categoryId}`);

            await sendMessage(env, chatId, "✅ File received!\n\n✏️ Now send the TITLE.");
            return new Response("OK");
          }

          // =====================
          // ADD FILE - STEP 2 (TITLE)
          // =====================
          if (stateRow.state.startsWith("add_file_title_")) {
            const categoryId = stateRow.state.replace("add_file_title_", "");

            if (!text.trim()) {
              await sendMessage(env, chatId, "❌ Please send a valid text title.");
              return new Response("OK");
            }

            // Save title to upload_temp table
            await query(env, "upload_temp", "PATCH", { title: text }, { user_id: userId, category_id: categoryId });

            // Move to next step
            await clearState(env, userId);
            await setState(env, userId, `add_file_desc_${categoryId}`);

            await sendMessage(env, chatId, "✅ Title saved!\n\n📝 Now send the DESCRIPTION.");
            return new Response("OK");
          }
        }
      }

      // 3. ALWAYS END SAFE
      return new Response("OK");
    }

    return new Response("OK");
  }
};
