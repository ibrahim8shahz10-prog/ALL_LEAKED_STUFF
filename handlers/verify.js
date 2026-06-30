import { sendMessage } from "../services/telegram.js";

export async function verifyJoin(env, callback) {
  await sendMessage(
    env,
    callback.message.chat.id,
    "✅ Verification feature will be added next."
  );
}
