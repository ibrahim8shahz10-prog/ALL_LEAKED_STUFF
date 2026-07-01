import { sendMessage } from "../services/telegram.js";
import { inlineKeyboard } from "../keyboards/inlineKeyboard.js";
import { query } from "../database/supabase.js";

export async function handleFile(env, chatId, fileId, telegramId) {
  const files = await query(
    env,
    "files",
    "GET",
    null,
    `?id=eq.${fileId}`
  );

  if (!files.length) {
    return await sendMessage(env, chatId, "❌ File not found.");
  }

  const file = files[0];

  await sendMessage(
    env,
    chatId,
`📄 <b>${file.title}</b>

⭐ Price: ${file.price} Points

📝 ${file.description || "No description"}
`,
    inlineKeyboard([
      [
        {
          text: "🔓 Unlock",
          callback_data: `unlock_${file.id}`
        }
      ],
      [
        {
          text: "⬅️ Back",
          callback_data: `category_${file.category_id}`
        }
      ]
    ])
  );
}
