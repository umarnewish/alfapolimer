import os
import secrets
import string

import httpx

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
API_BASE = f"https://api.telegram.org/bot{BOT_TOKEN}"

CODE_ALPHABET = "".join(c for c in (string.ascii_uppercase + string.digits) if c not in "0O1IL")
CODE_LENGTH = 6
CODE_TTL_SECONDS = 10 * 60

RENEW_CALLBACK = "renew"


def generate_code() -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))


def code_message(code: str) -> str:
    return (
        "🔑 <b>Код для входа в каталог</b>\n\n"
        f"<code>{code}</code>\n\n"
        "Нажмите на код, чтобы скопировать, и вставьте его на "
        "<b>catalog.omborchi.systems</b>.\n\n"
        "Код действует 10 минут и одноразовый — если он устарел, нажмите «Обновить»."
    )


RENEW_KEYBOARD = {"inline_keyboard": [[{"text": "🔄 Обновить", "callback_data": RENEW_CALLBACK}]]}


async def tg_call(method: str, **params):
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(f"{API_BASE}/{method}", json=params)
        return resp.json()


async def send_code_message(chat_id: str, code: str):
    return await tg_call(
        "sendMessage",
        chat_id=chat_id,
        text=code_message(code),
        parse_mode="HTML",
        reply_markup=RENEW_KEYBOARD,
    )


async def edit_code_message(chat_id: str, message_id: int, code: str):
    return await tg_call(
        "editMessageText",
        chat_id=chat_id,
        message_id=message_id,
        text=code_message(code),
        parse_mode="HTML",
        reply_markup=RENEW_KEYBOARD,
    )


async def answer_callback(callback_query_id: str, text: str | None = None):
    params = {"callback_query_id": callback_query_id}
    if text:
        params["text"] = text
    return await tg_call("answerCallbackQuery", **params)
