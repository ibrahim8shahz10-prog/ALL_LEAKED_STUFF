import { query } from "../database/supabase.js";

export async function addPoints(env, telegramId, amount) {
  const user = await query(
    env,
    "users",
    "GET",
    null,
    `?telegram_id=eq.${telegramId}`
  );

  if (!user.length) return;

  const points = (user[0].points || 0) + amount;

  await query(
    env,
    "users",
    "PATCH",
    { points },
    `?telegram_id=eq.${telegramId}`
  );
}

export async function getPoints(env, telegramId) {
  const user = await query(
    env,
    "users",
    "GET",
    null,
    `?telegram_id=eq.${telegramId}`
  );

  if (!user.length) return 0;

  return user[0].points || 0;
}
