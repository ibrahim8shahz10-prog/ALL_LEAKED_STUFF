import { handleStart } from "./handlers/start.js";
import { handleCallback } from "./handlers/callback.js";

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Bot is running!");
    }

    const update = await request.json();

    if (update.message?.text === "/start") {
      await handleStart(env, update.message.chat.id);
    }

    if (update.callback_query) {
      await handleCallback(env, update.callback_query);
    }

    return new Response("OK");
  }
};
