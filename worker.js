import { handleStart } from "./handlers/start.js";
import { handleCallback } from "./handlers/callback.js";
import { handleAdmin } from "./handlers/admin.js";
import { verifyJoin } from "./handlers/verify.js";
import { query } from "./database/supabase.js";
import { isAdmin } from "./utils/admin.js";
import { getState, clearState } from "./utils/stateDb.js";
import { sendMessage } from "./services/telegram.js";

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Bot is running!");
    }

    const update = await request.json();

    const message = update.message;
    const callback = update.callback_query;

    // Callback buttons
    if (callback) {
      if (callback.data === "verify_join") {
        await verifyJoin(env, callback);
        return new Response("OK");
      }

      await handleCallback(env, callback);
      return new Response("OK");
    }

    // Handle all messages
    if (message) {
      const userId = message.from.id;
      const chatId = message.chat.id;

      const text = message.text || "";
      const document = message.document;

      // Commands
      if (text === "/start") {
        await handleStart(env, message);
        return new Response("OK");
      }

      if (text === "/admin") {
        await handleAdmin(env, message);
        return new Response("OK");
      }

      // Admin states
      if (await isAdmin(env, userId)) {
        const stateRow = await getState(env, userId);

        // Add Category
        if (stateRow && stateRow.state === "add_category") {
          await query(env, "categories", "POST", {
            name: text
          });

          await clearState(env, userId);

          await sendMessage(
            env,
            chatId,
            `✅ Category "${text}" added successfully.`
          );

          return new Response("OK");
        }

        // Add File (Step 1)
        if (stateRow && stateRow.state.startsWith("add_file_")) {

          if (!document) {
            await sendMessage(
              env,
              chatId,
              "📎 Please send a document."
            );

            return new Response("OK");
          }

          await sendMessage(
            env,
            chatId,
            "✅ File received!\n\n✏️ Now send the title."
          );

          return new Response("OK");
        }
      }

      return new Response("OK");
    }

    return new Response("OK");
  }
};
