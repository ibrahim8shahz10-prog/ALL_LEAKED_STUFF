const api = (token) => `https://api.telegram.org/bot${token}`;

export async function sendMessage(env, chatId, text, keyboard = null) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "HTML"
  };

  if (keyboard) {
    body.reply_markup = keyboard;
  }

  const res = await fetch(`${api(env.BOT_TOKEN)}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return res.json();
}
