import { getLeaderboard } from "../services/leaderboard.js";
import { sendMessage } from "../services/telegram.js";

export async function leaderboardMenu(env, callback) {
  const users = await getLeaderboard(env);

  let text = "🏆 Top Users\n\n";

  if (!users.length) {
    text += "No users found.";
  } else {
    users.forEach((user, index) => {
      text += `${index + 1}. ${user.first_name} — ${user.credits} credits\n`;
    });
  }

  await sendMessage(
    env,
    callback.message.chat.id,
    text
  );
}
