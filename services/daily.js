import { sendMessage } from "./telegram.js";
import { query } from "../database/supabase.js";
import { getSettings } from "../utils/settings.js";

export async function claimDailyBonus(env, chatId, telegramId) {
  const userRes = await query(env, "users", "GET", null, `?telegram_id=eq.${telegramId}`);
  const user = userRes?.[0];

  if (!user) {
    return await sendMessage(env, chatId, "❌ Please send /start first.");
  }

  const now = Date.now();
  const last = user.last_daily ? new Date(user.last_daily).getTime() : 0;
  const hoursSince = (now - last) / (1000 * 60 * 60);

  if (last && hoursSince < 24) {
    const hoursLeft = Math.ceil(24 - hoursSince);
    return await sendMessage(
      env,
      chatId,
      `⏳ <b>Already Claimed</b>\n\nCome back in ~${hoursLeft}h for your next bonus.`
    );
  }

  const settings = await getSettings(env);
  const reward = settings.daily_points ?? 1;
  const newPoints = (user.points || 0) + reward;

  await query(
    env,
    "users",
    "PATCH",
    {
      points: newPoints,
      last_daily: new Date().toISOString()
    },
    `?telegram_id=eq.${telegramId}`
  );

  return await sendMessage(
    env,
    chatId,
    `🎁 <b>Daily Bonus Claimed!</b>\n\n+${reward} points\n⭐ Total Points: ${newPoints}`
  );
}
