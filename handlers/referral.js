import { sendMessage } from "../services/telegram.js";
import { getUser } from "../models/user.js";

export async function referralMenu(env, callback) {
  const user = await getUser(env, callback.from.id);

  const link = `https://t.me/${env.BOT_USERNAME}?start=${user.referral_code}`;

  await sendMessage(
    env,
    callback.message.chat.id,
    `👥 Your referral link:\n\n${link}`
  );
}
