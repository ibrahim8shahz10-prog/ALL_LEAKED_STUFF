export function mainMenu() {
  return {
    inline_keyboard: [
      [
        {
          text: "📁 Browse",
          callback_data: "browse"
        }
      ],
      [
        {
          text: "💰 Credits",
          callback_data: "credits"
        },
        {
          text: "👥 Refer",
          callback_data: "refer"
        }
      ],
      [
        {
          text: "🏆 Leaderboard",
          callback_data: "leaderboard"
        }
      ],
      [
        {
          text: "ℹ️ Help",
          callback_data: "help"
        }
      ]
    ]
  };
}
