import { getLeaderboard } from "../services/leaderboard.js";
import { sendMessage } from "../services/telegram.js";

export async function leaderboardMenu(env, chatId) {
  const users = await getLeaderboard(env);

  let text = "🏆 <b>Top Users</b>\n\n";

  if (!users.length) {
    text += "No users found yet.";
  } else {
    const medals = ["🥇", "🥈", "🥉"];
    users.forEach((user, index) => {
      const medal = medals[index] || `${index + 1}.`;
      const name = user.first_name || "Anonymous";
      text += `${medal} ${name} — ⭐ ${user.points || 0} points\n`;
    });
  }

  await sendMessage(env, chatId, text, {
    inline_keyboard: [
      [{ text: "👥 Top Referrers", callback_data: "referral_leaderboard" }]
    ]
  });
}
