import { query } from "../database/supabase.js";
import { generateCode } from "../utils/generateCode.js";

export async function getUser(env, telegramId) {
  const users = await query(
    env,
    "users",
    "GET",
    null,
    `?telegram_id=eq.${telegramId}`
  );

  return users?.[0] || null;
}

export async function createUser(env, user) {
  await query(env, "users", "POST", {
    telegram_id: user.id,
    username: user.username || "",
    first_name: user.first_name || "",
    credits: 0,
    is_verified: false,
    referral_code: generateCode(user.id)
  });

  return await getUser(env, user.id);
}

export async function getOrCreateUser(env, telegramUser) {
  let user = await getUser(env, telegramUser.id);

  if (!user) {
    user = await createUser(env, telegramUser);
  }

  return user;
}

export async function getCredits(env, telegramId) {
  const user = await getUser(env, telegramId);
  return user?.credits || 0;
}

export async function addCredits(env, telegramId, amount) {
  const current = await getCredits(env, telegramId);

  await query(
    env,
    "users",
    "PATCH",
    {
      credits: current + amount
    },
    `?telegram_id=eq.${telegramId}`
  );

  return current + amount;
}
