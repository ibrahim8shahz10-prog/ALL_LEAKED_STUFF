import { sendMessage } from "../services/telegram.js";
import { inlineKeyboard } from "../keyboards/inlineKeyboard.js";
import { query } from "../database/supabase.js";

export async function handleBrowse(env, chatId) {
  const categories = await query(
    env,
    "categories",
    "GET"
  );

  if (!categories.length) {
    return await sendMessage(
      env,
      chatId,
      "📂 No categories available yet."
    );
  }

  const buttons = categories.map(category => ([
    {
      text: `📂 ${category.name}`,
      callback_data: `category_${category.id}`
    }
  ]));

  await sendMessage(
    env,
    chatId,
    "📂 *Browse Categories*\n\nSelect a category:",
    inlineKeyboard(buttons),
    "Markdown"
  );
}
