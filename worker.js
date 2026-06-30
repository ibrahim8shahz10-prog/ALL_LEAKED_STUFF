import { handleStart } from "./handlers/start.js";

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Bot is running!");
    }

    const update = await request.json();

    if (update.message?.text === "/start") {
      await handleStart(env, update.message.chat.id);
    }

    return new Response("OK");
  }
};
