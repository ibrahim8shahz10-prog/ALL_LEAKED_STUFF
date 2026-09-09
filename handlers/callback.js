import { sendMessage, sendDocument } from "../services/telegram.js";
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
import { generateCode } from "../utils/generateCode.js";
import { helpMenu } from "./help.js";
import { inlineKeyboard } from "../keyboards/inlineKeyboard.js";

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

      let referralNote = "";

      if (user && user.referred_by && !user.referral_rewarded) {
        await rewardReferrer(env, user.referred_by);
        await query(
          env,
          "users",
          "PATCH",
          { referral_rewarded: true },
          `?telegram_id=eq.${telegramId}`
        );
        referralNote = "\n\n🔗 Referral credited to your inviter!";
      } else if (user && !user.referred_by) {
        referralNote = "\n\nℹ️ No referral was linked to this account.";
      }

      return await reply(
        `✅ <b>Verified Successfully!</b>${referralNote}\n\n🎉 Welcome to the main menu:`,
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

    if (user && user.banned) {
      return await reply("🚫 You have been banned from using this bot.");
    }

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

      if (file.content_type === "text") {
        return await reply(
          `✅ <b>Unlocked!</b>\n\n📄 ${file.title}\n\n${file.text_content || ""}`
        );
      }

      await reply(`✅ <b>Unlocked!</b>\n\n📄 ${file.title}`);
      return await sendDocument(env, chatId, file.file_url, file.title);
    }

    if (data === "referral") {
      if (!user) return await reply("❌ Please send /start first.");

      let referralCode = user.referral_code;

      if (!referralCode) {
        referralCode = generateCode(telegramId);
        await query(
          env,
          "users",
          "PATCH",
          { referral_code: referralCode },
          `?telegram_id=eq.${telegramId}`
        );
      }

      const botUsername = env.BOT_USERNAME;
      const link = `https://t.me/${botUsername}?start=${referralCode}`;

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

    if (data === "admin_add_content") {
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
      const catId = data.replace("choosecat_", "");

      return await reply("What type of content is this?", {
        inline_keyboard: [
          [
            { text: "📎 File", callback_data: `ctype_file_${catId}` },
            { text: "📝 Text", callback_data: `ctype_text_${catId}` }
          ]
        ]
      });
    }

    if (data.startsWith("ctype_file_")) {
      const catId = data.replace("ctype_file_", "");
      await setState(env, telegramId, `addc_file_wait_${catId}`);
      return await reply("📎 Now send the file.");
    }

    if (data.startsWith("ctype_text_")) {
      const catId = data.replace("ctype_text_", "");
      await setState(env, telegramId, `addc_text_wait_${catId}`);
      return await reply("📝 Now send the text content.");
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
        `📊 <b>Stats Overview</b>\n\n👤 Users: ${users?.length || 0}\n📁 Categories: ${categories?.length || 0}\n📄 Files: ${files?.length || 0}\n\nTap below to see details:`,
        {
          inline_keyboard: [
            [{ text: "👤 View Users", callback_data: "admin_view_users" }],
            [{ text: "📁 View Categories", callback_data: "admin_view_categories" }],
            [{ text: "📄 View Files", callback_data: "admin_view_files" }]
          ]
        }
      );
    }

    if (data === "admin_view_users") {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");const users = await query(env, "users", "GET", null, "?select=telegram_id,first_name,points,is_verified,banned&order=joined_at.desc&limit=30");

      if (!users?.length) return await reply("No users found.");

      let text = `👤 <b>Users (latest 30 of ${users.length})</b>\n\n`;

      users.forEach((u, i) => {
        const status = u.banned ? "🚫" : (u.is_verified ? "✅" : "⏳");
        text += `${i + 1}. ${status} ${u.first_name || "Unknown"} (<code>${u.telegram_id}</code>) — ⭐ ${u.points || 0}\n`;
      });

      return await reply(text);
    }

    if (data === "admin_view_categories") {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      const categories = await query(env, "categories", "GET");

      if (!categories?.length) return await reply("No categories found.");

      let text = `📁 <b>Categories</b>\n\n`;

      for (const c of categories) {
        const catFiles = await query(env, "files", "GET", null, `?category_id=eq.${c.id}&select=id`);
        text += `• ${c.name} — ${catFiles?.length || 0} item(s)\n`;
      }

      return await reply(text);
    }

    if (data === "admin_view_files") {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      const files = await query(env, "files", "GET", null, "?select=title,content_type,price,category_id&order=id.desc&limit=30");

      if (!files?.length) return await reply("No files found.");

      let text = `📄 <b>Files (latest 30 of ${files.length})</b>\n\n`;

      files.forEach((f, i) => {
        const icon = f.content_type === "text" ? "📝" : "📎";
        text += `${i + 1}. ${icon} ${f.title} — ⭐ ${f.price}\n`;
      });

      return await reply(text);
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

    if (data === "help") {
      return await helpMenu(env, chatId);
    }

    if (data === "contact_admin") {
      await setState(env, telegramId, "feedback_wait");
      return await reply("📩 Send your message now — it'll be forwarded to the admin.");
    }

    if (data.startsWith("admin_reply_")) {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      const targetId = data.replace("admin_reply_", "");
      await setState(env, telegramId, `reply_wait_${targetId}`);
      return await reply(`✏️ Send your reply to user ${targetId}:`);
    }

    if (data === "admin_give_points") {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      await setState(env, telegramId, "give_points_id");
      return await reply("👤 Send the Telegram ID of the user:");
    }

    if (data === "admin_ban_user") {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      await setState(env, telegramId, "ban_user_id");
      return await reply("👤 Send the Telegram ID of the user to ban:");
    }

    if (data === "admin_unban_user") {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      await setState(env, telegramId, "unban_user_id");
      return await reply("👤 Send the Telegram ID of the user to unban:");
    }

    if (data === "admin_edit_category") {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      const categories = await query(env, "categories", "GET");

      if (!categories?.length) return await reply("❌ No categories found.");

      const buttons = categories.map(c => ([
        { text: c.name, callback_data: `editcat_${c.id}` }
      ]));

      return await reply("✏️ Select category to rename:", { inline_keyboard: buttons });
    }

    if (data.startsWith("editcat_")) {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      const catId = data.replace("editcat_", "");
      await setState(env, telegramId, `edit_cat_name_${catId}`);
      return await reply("✏️ Send the new category name:");
    }

    if (data === "admin_edit_content") {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      const categories = await query(env, "categories", "GET");

      if (!categories?.length) return await reply("❌ No categories found.");

      const buttons = categories.map(c => ([
        { text: c.name, callback_data: `editcatfiles_${c.id}` }
      ]));

      return await reply("📁 Select category:", { inline_keyboard: buttons });
    }

    if (data.startsWith("editcatfiles_")) {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      const catId = data.replace("editcatfiles_", "");
      const files = await query(env, "files", "GET", null, `?category_id=eq.${catId}`);

      if (!files?.length) return await reply("❌ No content in this category.");

      const buttons = files.map(f => ([
        { text: f.title, callback_data: `editfile_${f.id}` }
      ]));

      return await reply("📄 Select item to edit:", { inline_keyboard: buttons });
    }

    if (data.startsWith("editfile_")) {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      const fileId = data.replace("editfile_", "");

      return await reply("✏️ What do you want to edit?", {
        inline_keyboard: [
          [
            { text: "📝 Title", callback_data: `editfield_title_${fileId}` },
            { text: "📄 Description", callback_data: `editfield_desc_${fileId}` }
          ],
          [
            { text: "💰 Price", callback_data: `editfield_price_${fileId}` },
            { text: "📎 Replace Content", callback_data: `editfield_content_${fileId}` }
          ],
          [{ text: "🗑 Delete Item", callback_data: `deletefile_${fileId}` }]
        ]
      });
    }

    if (data.startsWith("editfield_title_")) {
      const fileId = data.replace("editfield_title_", "");
      await setState(env, telegramId, `edit_file_title_${fileId}`);
      return await reply("✏️ Send the new title:");
    }

    if (data.startsWith("editfield_desc_")) {
      const fileId = data.replace("editfield_desc_", "");
      await setState(env, telegramId, `edit_file_desc_${fileId}`);
      return await reply("📄 Send the new description:");
    }

    if (data.startsWith("editfield_price_")) {
      const fileId = data.replace("editfield_price_", "");
      await setState(env, telegramId, `edit_file_price_${fileId}`);
      return await reply("💰 Send the new price (in points):");
    }

    if (data.startsWith("editfield_content_")) {
      const fileId = data.replace("editfield_content_", "");

      return await reply("What type of content is the replacement?", {
        inline_keyboard: [
          [
            { text: "📎 File", callback_data: `editctype_file_${fileId}` },
            { text: "📝 Text", callback_data: `editctype_text_${fileId}` }
          ]
        ]
      });
    }

    if (data.startsWith("editctype_file_")) {
      const fileId = data.replace("editctype_file_", "");
      await setState(env, telegramId, `edit_file_content_file_${fileId}`);
      return await reply("📎 Send the new file:");
    }

    if (data.startsWith("editctype_text_")) {
      const fileId = data.replace("editctype_text_", "");
      await setState(env, telegramId, `edit_file_content_text_${fileId}`);
      return await reply("📝 Send the new text content:");
    }

    if (data.startsWith("deletefile_")) {
      const fileId = data.replace("deletefile_", "");

      return await reply("⚠️ Confirm delete this item?", {
        inline_keyboard: [
          [
            { text: "✅ Yes", callback_data: `confirmdeletefile_${fileId}` },
            { text: "❌ Cancel", callback_data: "cancel_delete" }
          ]
        ]
      });
    }

    if (data.startsWith("confirmdeletefile_")) {
      const fileId = data.replace("confirmdeletefile_", "");
      await query(env, "files", "DELETE", null, `?id=eq.${fileId}`);
      return await reply("✅ Item deleted.");
    }

    if (data === "admin_manage_channels") {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      const channels = await query(env, "required_channels", "GET");

      let text = "🔒 <b>Required Channels/Groups</b>\n\n";
      const buttons = [];

      if (!Array.isArray(channels) || channels.length === 0) {
        text += "None added yet.";
      } else {
        channels.forEach((ch, i) => {
          text += `${i + 1}. ${ch.channel_username}\n`;
          buttons.push([
            { text: `🗑 Remove ${ch.channel_username}`, callback_data: `delchannel_${ch.id}` }
          ]);
        });
      }

      buttons.push([{ text: "➕ Add Channel/Group", callback_data: "admin_add_channel" }]);

      return await reply(text, { inline_keyboard: buttons });
    }

    if (data === "admin_add_channel") {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      await setState(env, telegramId, "add_channel_username");
      return await reply("✏️ Send the channel/group username (e.g. @SocialXservices):");
    }

    if (data.startsWith("delchannel_")) {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      const id = data.replace("delchannel_", "");
      return await reply("⚠️ Remove this from required channels?", {
        inline_keyboard: [
          [
            { text: "✅ Yes", callback_data: `confirmdelchannel_${id}` },
            { text: "❌ Cancel", callback_data: "cancel_delete" }
          ]
        ]
      });
    }

    if (data.startsWith("confirmdelchannel_")) {
      if (!isAdmin(env, telegramId)) return await reply("❌ Access denied");

      const id = data.replace("confirmdelchannel_", "");
      await query(env, "required_channels", "DELETE", null, `?id=eq.${id}`);
      return await reply("✅ Removed from required channels.");
    }

    return await reply("❌ Unknown action");
  } catch (err) {
    console.log("handleCallback error:", err.message);

    const fallbackChatId = callback?.message?.chat?.id;
    if (fallbackChatId) {
      try {
        await sendMessage(
          env,
          fallbackChatId,
          `❌ Error:\n<code>${err.message}</code>`
        );
      } catch (e) {
        console.log("failed to report error:", e.message);
      }
    }
  }
}
