import { query } from "../database/supabase.js";

function generateRedeemCode() {
  return "GIFT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createRedeemCode(env, points, maxUses) {
  const code = generateRedeemCode();

  await query(env, "redeem_codes", "POST", {
    code,
    points,
    max_uses: maxUses,
    used_count: 0
  });

  return code;
}

export async function redeemCode(env, telegramId, code) {
  const rows = await query(env, "redeem_codes", "GET", null, `?code=eq.${code}`);
  const redeemRow = rows?.[0];

  if (!redeemRow) {
    return { ok: false, message: "❌ Invalid code." };
  }

  if (redeemRow.used_count >= redeemRow.max_uses) {
    return { ok: false, message: "❌ This code has reached its usage limit." };
  }

  const claimed = await query(
    env,
    "redeem_claims",
    "GET",
    null,
    `?code=eq.${code}&telegram_id=eq.${telegramId}`
  );

  if (claimed?.length > 0) {
    return { ok: false, message: "❌ You already redeemed this code." };
  }

  const userRes = await query(env, "users", "GET", null, `?telegram_id=eq.${telegramId}`);
  const user = userRes?.[0];

  if (!user) {
    return { ok: false, message: "❌ Please send /start first." };
  }

  const newPoints = (user.points || 0) + redeemRow.points;

  await query(env, "users", "PATCH", { points: newPoints }, `?telegram_id=eq.${telegramId}`);

  await query(env, "redeem_claims", "POST", {
    code,
    telegram_id: telegramId
  });

  await query(
    env,
    "redeem_codes",
    "PATCH",
    { used_count: redeemRow.used_count + 1 },
    `?code=eq.${code}`
  );

  return {
    ok: true,
    message: `✅ <b>Redeemed!</b>\n\n+${redeemRow.points} points\n⭐ Total Points: ${newPoints}`
  };
}
