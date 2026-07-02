export function mainMenu() {
  return {
    inline_keyboard: [
      [{ text: "📂 Browse Files", callback_data: "browse" }],
      [
        { text: "⭐ Points", callback_data: "points" },
        { text: "🎁 Daily Bonus", callback_data: "daily" }
      ],
      [
        { text: "👥 Referral", callback_data: "referral" },
        { text: "🏆 Leaderboard", callback_data: "leaderboard" }
      ],
      [
        { text: "ℹ️ Help", callback_data: "help" },
        { text: "📩 Contact Admin", callback_data: "contact_admin" }
      ]
    ]
  };
}
