import { sendMessage } from "../services/telegram.js";
import { mainMenu } from "../keyboards/mainMenu.js";
import { getOrCreateUser } from "../models/user.js";

export async function handleStart(env, message) {
  await getOrCreateUser(env, message.from);

  await sendMessage(
    env,
    message.chat.id,
    `👋 Welcome, ${message.from.first_name}!

Your account has been created successfully.`,
    mainMenu()
  );
}
