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

    // /start
    if (update.message?.text === "/start") {
      await handleStart(env, update.message);
      return new Response("OK");
    }

    // 👑 ADMIN COMMAND
    if (update.message?.text === "/admin") {
      await handleAdmin(env, update.message);
      return new Response("OK");
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
