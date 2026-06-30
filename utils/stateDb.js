import { query } from "../database/supabase.js";

export async function setState(env, userId, state) {
  await query(env, "bot_state", "POST", {
    telegram_id: userId,
    state: state,
    data: ""
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

  return res[0];
}

export async function clearState(env, userId) {
  await query(
    env,
    "bot_state",
    "DELETE",
    null,
    `?telegram_id=eq.${userId}`
  );
}
