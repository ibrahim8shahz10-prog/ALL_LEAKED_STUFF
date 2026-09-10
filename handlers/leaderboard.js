import { sendMessage } from "../services/telegram.js";
import { query } from "../database/supabase.js";

export async function leaderboardMenu(env, chatId) {
  const allUsers = await query(
    env,
    "users",
    "GET",
    null,
    "?select=telegram_id,first_name,referred_by"
  );

  const counts = {};
  const nameMap = {};

  (allUsers || []).forEach(u => {
    nameMap[u.telegram_id] = u.first_name || "Anonymous";
    if (u.referred_by) {
      counts[u.referred_by] = (counts[u.referred_by] || 0) + 1;
    }
  });

  const referrerIds = Object.keys(counts);

  let text = "🏆 <b>Top 10 Referrers</b>\n━━━━━━━━━━━━━━━━\n\n";

  if (referrerIds.length === 0) {
    text += "No referrals yet.";
  } else {
    const sorted = referrerIds.sort((a, b) => counts[b] - counts[a]).slice(0, 10);
    const medals = ["🥇", "🥈", "🥉"];

    sorted.forEach((id, i) => {
      const medal = medals[i] || `${i + 1}.`;
      text += `${medal} ${nameMap[id] || "Anonymous"} — ${counts[id]} referral(s)\n`;
    });
  }

  await sendMessage(env, chatId, text);
}
