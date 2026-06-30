import { handleStart } from "./handlers/start.js";
import { handleCallback } from "./handlers/callback.js";
import { handleAdmin } from "./handlers/admin.js";
import { verifyJoin } from "./handlers/verify.js";

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Bot is running!");
    }

    const update = await request.json();

    const chatId = update.message?.chat?.id;

    // /start
    if (update.message?.text === "/start") {
      await handleStart(env, update.message);
      return new Response("OK");
    }

    // /admin
    if (update.message?.text === "/admin") {
      await handleAdmin(env, update.message);
      return new Response("OK");
    }

    // =========================
    // ADMIN TEXT HANDLER (FIXED)
    // =========================
    if (update.message?.text && update.message?.from) {
      const { isAdmin } = await import("./utils/admin.js");
      const { query } = await import("./database/supabase.js");

      const userId = update.message.from.id;
      const text = update.message.text;

      if (await isAdmin(env, userId)) {
        const state = await env.STATE.get("state_" + userId);

        if (state === "add_category") {
          await query(env, "categories", "POST", {
            name: text
          });

          await env.STATE.delete("state_" + userId);

          return new Response("OK");
        }
      }
    }

    // callbacks
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
