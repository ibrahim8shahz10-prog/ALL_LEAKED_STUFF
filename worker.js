import { handleStart } from "./handlers/start.js";
import { handleCallback } from "./handlers/callback.js";
import { verifyJoin } from "./handlers/verify.js";

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Bot is running!");
    }

    const update = await request.json();

    // Handle /start
    if (update.message?.text === "/start") {
      await handleStart(env, update.message);
      return new Response("OK");
    }

    // Handle callback buttons
    if (update.callback_query) {

      // Verify Join button
      if (update.callback_query.data === "verify_join") {
        await verifyJoin(env, update.callback_query);
        return new Response("OK");
      }

      // Other buttons
      await handleCallback(env, update.callback_query);
      return new Response("OK");
    }

    return new Response("OK");
  }
};
