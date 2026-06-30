import { sendMessage } from "../services/telegram.js";

export async function helpMenu(env, callback) {
  await sendMessage(
    env,
    callback.message.chat.id,
`ℹ️ Help

• Browse content
• Earn credits
• Invite friends
• Unlock content using credits

If you need help, contact the admin.`
  );
}
