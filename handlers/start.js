import { sendMessage } from "../services/telegram.js";
import { query } from "../database/supabase.js";

export async function handleStart(env, message) {
  const userId = message.from.id;
  const chatId = message.chat.id;

  const ref = message.text?.split(" ")[1];

  // create user if not exists
  const user = await query(
    env,
    "users",
    "GET",
    null,
    `?telegram_id=eq.${userId}`
  );

  if (!user.length) {
    await query(env, "users", "POST", {
      telegram_id: userId,
      referred_by: ref || null,
      is_verified: false,
      points: 0
    });
  }

  // get channels
  const channels = await query(env, "required_channels", "GET");

  let text = "🚫 You must join all channels to continue:\n\n";
  let buttons = [];

  for (const ch of channels) {
    text += `• ${ch.channel_username}\n`;

    buttons.push([
      {
        text: `Join ${ch.channel_username}`,
        url: ch.invite_link
      }
    ]);
  }

  buttons.push([
    {
      text: "✅ Verify",
      callback_data: "verify_join"
    }
  ]);

  await sendMessage(env, chatId, text, {
    inline_keyboard: buttons
  });
}
