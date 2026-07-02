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

export async function sendDocument(env, chatId, fileId, caption = "") {
  const body = {
    chat_id: chatId,
    document: fileId,
    parse_mode: "HTML"
  };

  if (caption) {
    body.caption = caption;
  }

  const res = await fetch(`${api(env.BOT_TOKEN)}/sendDocument`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return res.json();
}
