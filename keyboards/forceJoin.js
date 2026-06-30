export function forceJoinKeyboard(channels) {
  return {
    inline_keyboard: [
      ...channels.map(channel => [
        {
          text: `📢 ${channel.channel_name}`,
          url: channel.invite_link
        }
      ]),
      [
        {
          text: "✅ Verify",
          callback_data: "verify_join"
        }
      ]
    ]
  };
}
