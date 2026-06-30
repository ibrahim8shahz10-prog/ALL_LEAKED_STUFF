import { sendMessage } from "../services/telegram.js";
import { query } from "../database/supabase.js";

export async function referralMenu(env, callback) {
  const user = await query(
    env,
    "users",
    "GET",
    null,
    `?telegram_id=eq.${callback.from.id}`
  );

  const botUsername = env.BOT_USERNAME;

  const link = `https://t.me/${botUsername}?start=${user[0].referral_code}`;

  await sendMessage(
    env,
    callback.message.chat.id,
`👥 Your Referral Link:

${link}

💰 Earn 5 credits per user who joins.`
  );
}
