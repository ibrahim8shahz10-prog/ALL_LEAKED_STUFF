import { query } from "../database/supabase.js";

const SETTINGS_ID = 1;

export async function getSettings(env) {
  const rows = await query(env, "settings", "GET", null, `?id=eq.${SETTINGS_ID}`);

  if (!rows?.[0]) {
    await query(env, "settings", "POST", {
      id: SETTINGS_ID,
      referral_points: 1,
      daily_points: 1
    });

    return { id: SETTINGS_ID, referral_points: 1, daily_points: 1 };
  }

  return rows[0];
}

export async function updateSettings(env, fields) {
  await query(env, "settings", "PATCH", fields, `?id=eq.${SETTINGS_ID}`);
}
