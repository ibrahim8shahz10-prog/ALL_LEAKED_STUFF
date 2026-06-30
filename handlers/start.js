import { sendMessage } from "../services/telegram.js";
import { mainMenu } from "../keyboards/mainMenu.js";
import { getOrCreateUser } from "../models/user.js";
import { query } from "../database/supabase.js";

export async function handleStart(env, message) {
  const user = await getOrCreateUser(env, message.from);

  const args = message.text?.split(" ");

  // referral check
  if (args.length > 1) {
    const refCode = args[1];

    const refUser = await query(
      env,
      "users",
      "GET",
      null,
      `?referral_code=eq.${refCode}`
    );

    if (refUser.length && refUser[0].telegram_id !== message.from.id) {
      const referrer = refUser[0];

      // give reward
      await query(env, "users?telegram_id=eq." + referrer.telegram_id, "PATCH", {
        credits: (referrer.credits || 0) + 5
      });

      // mark user
      await query(env, "users?telegram_id=eq." + message.from.id, "PATCH", {
        referred_by: referrer.telegram_id
      });
    }
  }

  await sendMessage(
    env,
    message.chat.id,
`👋 Welcome, ${message.from.first_name}!

💰 Earn 5 credits per referral.

Your account is ready.`,
    mainMenu()
  );
}
