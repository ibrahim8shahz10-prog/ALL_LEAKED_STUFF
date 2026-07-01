export function mainMenu() {
  return {
    inline_keyboard: [
      [{ text: "📂 Browse Files", callback_data: "browse" }],
      [
        { text: "💰 Credits", callback_data: "credits" },
        { text: "⭐ Points", callback_data: "points" }
      ],
      [
        { text: "👥 Referral", callback_data: "referral" },
        { text: "🎁 Daily Bonus", callback_data: "daily" }
      ],
      [{ text: "🏆 Leaderboard", callback_data: "leaderboard" }]
    ]
  };
}
