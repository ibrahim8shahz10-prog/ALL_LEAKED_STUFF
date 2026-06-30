import { query } from "../database/supabase.js";

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

export async function saveReferral(env, telegramId, referredBy) {
  return await query(
    env,
    "referrals",
    "POST",
    {
      telegram_id: telegramId,
      referred_by: referredBy
    }
  );
}
