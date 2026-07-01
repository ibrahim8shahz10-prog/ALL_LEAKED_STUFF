import { query } from "../database/supabase.js";
import { getSettings } from "../utils/settings.js";

export async function getReferral(env, code) {
  const result = await query(
    env,
    "users",
    "GET",
    null,
    `?referral_code=eq.${code}`
  );

  return result.length ? result[0] : null;
}

export async function rewardReferrer(env, referrerId) {
  if (!referrerId) return;

  const settings = await getSettings(env);
  const reward = settings.referral_points ?? 1;

  const userRes = await query(env, "users", "GET", null, `?telegram_id=eq.${referrerId}`);
  const referrer = userRes?.[0];

  if (!referrer) return;

  await query(
    env,
    "users",
    "PATCH",
    { points: (referrer.points || 0) + reward },
    `?telegram_id=eq.${referrerId}`
  );
}
