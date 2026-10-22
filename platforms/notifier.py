"""
Instant Multi-Channel Notification Dispatcher
================================================================================
Sends real-time alerts on job applications via:
  1. Telegram Bot (Instant smartphone push alerts)
  2. Discord Webhook (Rich embed cards)
  3. System console / Windows toast notifications
"""

import os
import logging
import threading
import requests
from datetime import datetime
from dotenv import load_dotenv

logger = logging.getLogger("Notifier")
load_dotenv()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "").strip()
DISCORD_WEBHOOK = os.getenv("DISCORD_WEBHOOK_URL", "").strip()


def _send_telegram(message: str):
    """Deliver markdown message to Telegram."""
    if not (TELEGRAM_TOKEN and TELEGRAM_CHAT_ID):
        return
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
        payload = {
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": "Markdown"
        }
        requests.post(url, json=payload, timeout=5)
    except Exception as e:
        logger.debug(f"Telegram alert notice: {e}")


def _send_discord(title: str, description: str, fields: list = None):
    """Deliver rich embed to Discord webhook."""
    if not DISCORD_WEBHOOK:
        return
    try:
        embed = {
            "title": title,
            "description": description,
            "color": 3447003, # Blue
            "timestamp": datetime.utcnow().isoformat(),
            "footer": {"text": "Universal Job Auto Apply Bot • 2026 Edition"}
        }
        if fields:
            embed["fields"] = fields

        payload = {"embeds": [embed]}
        requests.post(DISCORD_WEBHOOK, json=payload, timeout=5)
    except Exception as e:
        logger.debug(f"Discord alert notice: {e}")


def notify_application_success(platform: str, job_title: str, company: str, url: str = ""):
    """Non-blocking notification for a successfully submitted application."""
    def _worker():
        # 1. Telegram
        tg_text = (
            f"🎯 *New Job Applied!*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🏢 *Platform:* {platform}\n"
            f"💼 *Role:* {job_title}\n"
            f"🏢 *Company:* {company or 'Not specified'}\n"
            f"🕒 *Time:* {datetime.now().strftime('%H:%M:%S | %d %b')}\n"
        )
        if url:
            tg_text += f"🔗 [View Job Posting]({url})"
        _send_telegram(tg_text)

        # 2. Discord
        discord_fields = [
            {"name": "Platform", "value": platform, "inline": True},
            {"name": "Company", "value": company or "N/A", "inline": True},
            {"name": "Status", "value": "✅ Applied Successfully", "inline": True}
        ]
        if url:
            discord_fields.append({"name": "Job Link", "value": f"[Open Job]({url})", "inline": False})
        _send_discord(
            title=f"🚀 Applied: {job_title}",
            description=f"Your profile has been submitted successfully to **{company or 'Company'}** via **{platform}**.",
            fields=discord_fields
        )

    threading.Thread(target=_worker, daemon=True).start()


def notify_batch_completed(platform_counts: dict, total: int):
    """Notification when an auto-apply session finishes."""
    def _worker():
        breakdown = "\n".join([f"• *{p}:* {c} jobs" for p, c in platform_counts.items() if c > 0])
        tg_text = (
            f"🎉 *Auto-Apply Session Completed!*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"📊 *Total Jobs Applied:* {total}\n\n"
            f"*Platform Summary:*\n{breakdown or 'None'}\n\n"
            f"⏰ *Completed At:* {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        )
        _send_telegram(tg_text)
        _send_discord(
            title="🏁 Auto-Apply Batch Completed",
            description=f"Successfully applied to **{total} jobs** across configured platforms."
        )

    threading.Thread(target=_worker, daemon=True).start()
