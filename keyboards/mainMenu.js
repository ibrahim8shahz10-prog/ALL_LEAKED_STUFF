export function mainMenu() {
  return {
    inline_keyboard: [
      [
        { text: "📂 Browse", callback_data: "browse" },
        { text: "🔍 Search", callback_data: "search_files" }
      ],
      [
        { text: "👤 Profile", callback_data: "my_profile" },
        { text: "💰 Buy Points", callback_data: "buy_points" }
      ],
      [
        { text: "🎁 Daily Bonus", callback_data: "daily" },
        { text: "🏆 Leaderboard", callback_data: "leaderboard" }
      ],
      [
        { text: "ℹ️ Help", callback_data: "help" },
        { text: "📩 Contact Admin", callback_data: "contact_admin" }
      ]
    ]
  };
}
