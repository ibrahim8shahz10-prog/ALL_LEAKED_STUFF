import { sendMessage } from "../services/telegram.js";

export async function handleStart(env, chatId) {
  await sendMessage(
    env,
    chatId,
    "🎉 Welcome!\n\nYour bot is now running successfully."
  );
}
