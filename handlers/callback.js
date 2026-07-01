import { sendMessage } from "../services/telegram.js";
import { getPoints, addPoints } from "../services/users.js";
import { handleBrowse } from "./browse.js";
import { handleCategory } from "./category.js";
import { handleFile } from "./file.js";
import { query } from "../database/supabase.js";
import { isAdmin } from "../utils/admin.js";
import { setState } from "../utils/stateDb.js";
import { mainMenu } from "../keyboards/mainMenu.js";
import { rewardReferrer } from "../services/referrals.js";
import { claimDailyBonus } from "../services/daily.js";
import { leaderboardMenu } from "./leaderboard.js";

async function answerCallback(env, callback, text = "") {
  try {
    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callback.id,
        text
      })
    });
  } catch (e) {
    console.log("answerCallback error:", e);
  }
}

async function checkJoin(env, telegramId) {
  try {
    const channels = await query(env, "required_channels", "GET");

    if (!Array.isArray(channels) || channels.length === 0) return true;

    for (const ch of channels) {
      // Only Telegram membership can be verified via the Bot API.
      // Non-Telegram channels (e.g. WhatsApp) are shown as a join
      // button but cannot be technically enforced.
      if (ch.platform && ch.platform !== "telegram") continue;

      const chatId = String(ch?.channel_username || "").trim();
      if (!chatId) continue;

      const res = await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${telegramId}`
      );

      const data = await res.json();
      if (!data?.ok) return false;

      const status = data?.result?.status;
      if (status === "left" || status === "kicked") return false;
    }

    return true;
  } catch (e) {
    console.log("CHECK JOIN ERROR:", e);
    return false;
  }
}

export async function handleCallback(env, callback) {
  try {
    const chatId = callback?.message?.chat?.id;
    const telegramId = callback?.from?.id;
    const data = callback?.data || "";

    if (!chatId || !telegramId) return;

    const reply = (msg, kb) => sendMessage(env, chatId, msg, kb);

    if (data === "verify_join") {
      await answerCallback(env, callback, "Checking...");

      const ok = await checkJoin(env, telegramId);

      if (!ok) {
        return await reply(
          "❌ You have not joined all channels yet.\nPlease join and try again."
        );
      }

      const userRes = await query(env, "users", "GET", null, `?telegram_id=eq.${telegramId}`);
      const user = userRes?.[0];

      await query(
        env,
        "users",
        "PATCH",
        { is_verified: true },
        `?telegram_id=eq.${telegramId}`
      );

      if (user && user.referred_by && !user.referral_rewarded) {
        await rewardReferrer(env, user.referred_by);
        await query(
          env,
          "users",
          "PATCH",
          { referral_rewarded: true },
          `?telegram_id=eq.${telegramId}`
        );
      }

      return await reply(
        "✅ <b>Verified Successfully!</b>\n\n🎉 Welcome to the main menu:",
        mainMenu()
      );
    }

    const userRes = await query(
      env,
      "users",
      "GET",
      null,
      `?telegram_id=eq.${telegramId}`
    );

    const user = userRes?.[0];

    if (user && user.is_verified === false && data !== "verify_join") {
      return await reply("🚫 Please join channels and verify first.");
    }

    if (!data) return await reply("❌ Invalid action");

    if (data === "browse") return await handleBrowse(env, chatId);

    if (data.startsWith("category_")) {
      return await handleCategory(env, chatId, data.replace("category_", ""));
    }

    if (data.startsWith("file_")) {
      return await handleFile(env, chatId, data.replace("file_", ""), telegramId);
    }

    if (data.startsWith("unlock_")) {
      const fileId = data.replace("unlock_", "");

      const fileRes = await query(env, "files", "GET", null, `?id=eq.${fileId}`);
      const file = fileRes?.[0];

      if (!file) return await reply("❌ File not found");

      const points = await getPoints(env, telegramId);

      if ((points || 0) < file.price) {
        return await reply("❌ Not enough points");
      }

      await addPoints(env, telegramId, -file.price);

      return await reply(
        `✅ <b>Unlocked!</b>\n\n📄 ${file.title}\n🔗 ${file.file_url}`
      );
    }

    if (data === "referral") {
      if (!user) return await reply("❌ Please send /start first.");

      const botUsername = env.BOT_USERNAME;
      const link = `https://t.me/${botUsername}?start=${user.referral_code}`;

      const referredRes = await query(
        env,
        "users",
        "GET",
        null,
        `?referred_by=eq.${telegramId}&select=telegram_id`
      );
      const count = referredRes?.length || 0;

      return await reply(
        `👥 <b>Your Referral Link</b>\n\n${link}\n\n👤 Total Referrals: ${count}\n⭐ You earn points for every friend who joins and verifies!`
      );
    }

    if (data === "points") {
      return await reply(`⭐ Points: ${user?.points || 0}`);
    }

    if (data === "daily") {
      return await claimDailyBonus(env, chatId, telegramId);
    }

    if (data === "leaderboard") {
      return await leaderboardMenu(env, chatId);
    }

    if (data === "admin_add_category") {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      await setState(env, telegramId, "add_category");
      return await reply("✏️ Send category name:");
    }

    if (data === "admin_add_file") {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      const categories = await query(env, "categories", "GET");

      if (!Array.isArray(categories) || categories.length === 0) {
        return await reply("❌ No categories found.");
      }

      const buttons = categories.map(c => ([
        { text: c?.name || "Unnamed", callback_data: `choosecat_${c.id}` }
      ]));

      return await reply("📁 Choose category:", {
        inline_keyboard: buttons
      });
    }

    if (data.startsWith("choosecat_")) {
      await setState(env, telegramId, `add_file_${data.replace("choosecat_", "")}`);
      return await reply("📎 Now send the file.");
    }

    if (data === "admin_delete_category") {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      const categories = await query(env, "categories", "GET");

      if (!Array.isArray(categories)) {
        return await reply("❌ No categories found.");
      }

      const buttons = categories.map(c => ([
        { text: `🗑 ${c?.name}`, callback_data: `deletecat_${c.id}` }
      ]));

      return await reply("Select category:", {
        inline_keyboard: buttons
      });
    }

    if (data.startsWith("deletecat_")) {
      return await reply("⚠️ Confirm delete?", {
        inline_keyboard: [
          [
            { text: "✅ Yes", callback_data: `confirmdelete_${data.replace("deletecat_", "")}` },
            { text: "❌ Cancel", callback_data: "cancel_delete" }
          ]
        ]
      });
    }

    if (data.startsWith("confirmdelete_")) {
      const id = data.replace("confirmdelete_", "");

      await query(env, "files", "DELETE", null, `?category_id=eq.${id}`);
      await query(env, "categories", "DELETE", null, `?id=eq.${id}`);

      return await reply("✅ Deleted successfully.");
    }

    if (data === "cancel_delete") {
      return await reply("❌ Cancelled.");
    }

    if (data === "admin_stats") {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      const users = await query(env, "users", "GET");
      const categories = await query(env, "categories", "GET");
      const files = await query(env, "files", "GET");

      return await reply(
        `📊 <b>Stats</b>\n\n👤 Users: ${users?.length || 0}\n📁 Categories: ${categories?.length || 0}\n📄 Files: ${files?.length || 0}`
      );
    }

    if (data === "admin_broadcast") {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      await setState(env, telegramId, "broadcast");
      return await reply("📢 Send the message you want to broadcast to all users:");
    }

    if (data === "admin_create_code") {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      await setState(env, telegramId, "create_code_points");
      return await reply("🎁 How many points should this code give?");
    }

    if (data === "admin_set_refpoints") {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      await setState(env, telegramId, "set_refpoints");
      return await reply("👥 Enter new referral point reward (per verified referral):");
    }

    if (data === "admin_set_dailypoints") {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      await setState(env, telegramId, "set_dailypoints");
      return await reply("🎁 Enter new daily bonus points value:");
    }

    return await reply("❌ Unknown action");
  } catch (err) {
    console.log("handleCallback error:", err.message);
  }
        }
