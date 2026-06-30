import { sendMessage } from "../services/telegram.js";
import { mainMenu } from "../keyboards/mainMenu.js";

export async function handleStart(env, chatId) {
  await sendMessage(
    env,
    chatId,
    `👋 Welcome!

This bot uses:
• Credits
• Referrals
• Leaderboard
• Unlockable Content

Choose an option below.`,
    mainMenu()
  );
}
