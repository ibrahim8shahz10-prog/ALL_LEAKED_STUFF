import { query } from "../database/supabase.js";

export async function setState(env, userId, state) {
  // always overwrite (simple + safe)
  await query(env, "bot_state", "DELETE", null, `?telegram_id=eq.${userId}`);

  await query(env, "bot_state", "POST", {
    telegram_id: userId,
    state: state
  });
}

export async function getState(env, userId) {
  const res = await query(
    env,
    "bot_state",
    "GET",
    null,
    `?telegram_id=eq.${userId}`
  );

  return res?.[0] || null;
}

export async function clearState(env, userId) {
  await query(env, "bot_state", "DELETE", null, `?telegram_id=eq.${userId}`);
}
