import { query } from "../database/supabase.js";

export async function addCredits(env, telegramId, amount) {
  const user = await query(
    env,
    "users",
    "GET",
    null,
    `?telegram_id=eq.${telegramId}`
  );

  if (!user.length) return;

  const credits = (user[0].credits || 0) + amount;

  await query(
    env,
    "users?telegram_id=eq." + telegramId,
    "PATCH",
    {
      credits
    }
  );
}

export async function getCredits(env, telegramId) {
  const user = await query(
    env,
    "users",
    "GET",
    null,
    `?telegram_id=eq.${telegramId}`
  );

  if (!user.length) return 0;

  return user[0].credits || 0;
}
