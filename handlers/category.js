import { sendMessage } from "../services/telegram.js";
import { inlineKeyboard } from "../keyboards/inlineKeyboard.js";
import { query } from "../database/supabase.js";

export async function handleCategory(env, chatId, categoryId) {
  const files = await query(
    env,
    "files",
    "GET",
    null,
    `?category_id=eq.${categoryId}&order=id.asc`
  );

  if (!files.length) {
    return await sendMessage(
      env,
      chatId,
      "📂 This category has no files yet."
    );
  }

  const buttons = files.map(file => ([
    {
      text: `📄 ${file.title} (${file.price} Points)`,
      callback_data: `file_${file.id}`
    }
  ]));

  buttons.push([
    {
      text: "⬅️ Back",
      callback_data: "browse"
    }
  ]);

  await sendMessage(
    env,
    chatId,
    "📂 Select a file:",
    inlineKeyboard(buttons)
  );
}
