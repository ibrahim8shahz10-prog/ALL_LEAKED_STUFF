import { handleStart } from "./handlers/start.js";
import { handleCallback } from "./handlers/callback.js";
import { handleAdmin } from "./handlers/admin.js";
import { verifyJoin } from "./handlers/verify.js";
import { query } from "./database/supabase.js";
import { isAdmin } from "./utils/admin.js";
import { getState, clearState } from "./utils/stateDb.js";

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Bot is running!");
    }

    const update = await request.json();

    // START
    if (update.message?.text === "/start") {
      await handleStart(env, update.message);
      return new Response("OK");
    }

    // ADMIN PANEL
    if (update.message?.text === "/admin") {
      await handleAdmin(env, update.message);
      return new Response("OK");
    }

    // 👑 STATE HANDLER (FIXED CORE ISSUE)
    if (update.message?.text && update.message?.from) {
      const userId = update.message.from.id;
      const text = update.message.text;

      if (await isAdmin(env, userId)) {
        const stateRow = await getState(env, userId);

        if (stateRow && stateRow.state === "add_category") {
          await query(env, "categories", "POST", {
            name: text
          });

          await clearState(env, userId);

          return new Response("OK");
        }
      }
    }

    // CALLBACKS
    if (update.callback_query) {
      if (update.callback_query.data === "verify_join") {
        await verifyJoin(env, update.callback_query);
        return new Response("OK");
      }

      await handleCallback(env, update.callback_query);
      return new Response("OK");
    }

    return new Response("OK");
  }
};
