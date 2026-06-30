import { query } from "../database/supabase.js";

export async function getUser(env, telegramId) {
  const users = await query(
    env,
    "users",
    "GET",
    null,
    `?telegram_id=eq.${telegramId}`
  );

  return users.length ? users[0] : null;
}

export async function createUser(env, user) {
  return await query(
    env,
    "users",
    "POST",
    {
      telegram_id: user.id,
      username: user.username || "",
      first_name: user.first_name || "",
      credits: 0
    }
  );
}

export async function getOrCreateUser(env, telegramUser) {
  let user = await getUser(env, telegramUser.id);

  if (!user) {
    await createUser(env, telegramUser);
    user = await getUser(env, telegramUser.id);
  }

  return user;
}
