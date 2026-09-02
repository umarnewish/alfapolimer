#!/usr/bin/env python3
"""
Bulk-export patient outpatient cards from the medplus clinic system as PDF + HTML.

This automates actions a logged-in user can already perform in the app's own UI:
open each patient record and click its built-in "print outpatient card" button.
The card popup that would normally call window.print() is saved to PDF instead.

SETUP
-----
    pip install playwright
    playwright install chromium

USAGE
-----
    # the session cookie is read from the environment (not hard-coded):
    export PHPSESSID=<your-logged-in-session-id>    # from your browser cookies
    # export AUTH_COOKIE=...                       # only if the app needs one

    # verify a single card first:
    python export.py --only 41704

    # full batch:
    python export.py

Output goes to OUT_DIR: one <elid>.pdf and one <elid>.html per patient, plus
export_log.csv. Re-running skips patients whose PDF already exists (resume).

NOTE: the exported files contain sensitive personal/health data. Store and
handle them according to whatever data-protection rules apply to the clinic.
"""

import argparse
import csv
import os
import re
import sys
import time
from datetime import datetime, timezone

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE      = "http://195.158.7.189:5869"
DOCTOR_ID = "69"
FROM      = "2023-01-01"
TO        = "2026-08-31"
OUT_DIR   = "cards"

# Session cookie. This is a live credential, so it is read from the
# environment rather than hard-coded (keeps it out of source control):
#     PHPSESSID=xxxxxxxx python export.py --only 41704
PHPSESSID = os.environ.get("PHPSESSID", "")

# Optional second session cookie. If the session also needs an "auth" cookie
# (or anything else), set its name here and pass the value via AUTH_COOKIE env
# var. Leave AUTH_COOKIE_NAME = "" to skip it.
AUTH_COOKIE_NAME  = ""      # e.g. "auth"
AUTH_COOKIE_VALUE = os.environ.get("AUTH_COOKIE", "")

# Behaviour knobs
SLEEP_BETWEEN   = 0.5       # seconds to pause between patients
RETRIES         = 2         # extra attempts per patient after the first failure
NAV_TIMEOUT     = 30_000    # ms
POPUP_TIMEOUT   = 30_000    # ms
MAX_PAGES       = 500       # pagination safety cap
PRINT_BUTTON    = "Распечатать амбулаторная карта"
LOG_CSV         = "export_log.csv"

# A navigation that ends up here means the session is dead.
LOGIN_MARKERS = ("chklogin", "op=login", "mod=login")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
class SessionExpired(Exception):
    pass


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def list_url(page_num=1):
    url = (f"index.php?mod=doctor&op=mgmnt&from={FROM}&to={TO}"
           f"&filial=&doctor={DOCTOR_ID}")
    if page_num > 1:
        url += f"&page={page_num}"
    return url


def edit_url(elid):
    return f"index.php?mod=treatment&op=edit&elid={elid}"


def looks_like_login(page):
    """True if the current page is a login screen / redirected to chklogin."""
    url = (page.url or "").lower()
    if any(m in url for m in LOGIN_MARKERS):
        return True
    try:
        html = page.content().lower()
    except Exception:
        return False
    if any(m in html for m in LOGIN_MARKERS):
        return True
    # A bare password field with almost no other content is a strong signal.
    try:
        if page.locator("input[type='password']").count() > 0 and \
           page.locator("table").count() == 0:
            return True
    except Exception:
        pass
    return False


def guard_login(page):
    if looks_like_login(page):
        raise SessionExpired(
            f"Redirected to a login form ({page.url}). "
            "The PHPSESSID (or auth cookie) is no longer valid."
        )


def extract_elids(page):
    """Collect every elid referenced on the current list page."""
    try:
        html = page.content()
    except Exception:
        html = ""
    ids = set(re.findall(r"elid=(\d+)", html))
    # Also pull from anchor hrefs in case they are built by JS after load.
    try:
        hrefs = page.eval_on_selector_all(
            "a[href*='elid=']",
            "els => els.map(e => e.getAttribute('href') || '')",
        )
        for h in hrefs:
            ids.update(re.findall(r"elid=(\d+)", h or ""))
    except Exception:
        pass
    return ids


def collect_all_elids(page):
    """Page through the results table and return a de-duplicated, ordered list."""
    seen = []
    seen_set = set()
    for p in range(1, MAX_PAGES + 1):
        page.goto(list_url(p), wait_until="domcontentloaded",
                  timeout=NAV_TIMEOUT)
        guard_login(page)
        ids = extract_elids(page)
        new = [i for i in sorted(ids, key=int) if i not in seen_set]
        if not ids:
            break
        if not new:
            # page= param ignored or we've run past the last page -> stop.
            break
        for i in new:
            seen_set.add(i)
            seen.append(i)
        print(f"  page {p}: +{len(new)} ids (total {len(seen)})")
    return seen


def save_card(context, page, elid):
    """Open the patient record, trigger the print-card popup, save PDF + HTML."""
    page.goto(edit_url(elid), wait_until="domcontentloaded",
              timeout=NAV_TIMEOUT)
    guard_login(page)

    button = page.get_by_text(PRINT_BUTTON, exact=False)
    button.wait_for(state="visible", timeout=NAV_TIMEOUT)

    with context.expect_page(timeout=POPUP_TIMEOUT) as popup_info:
        button.first.click()
    popup = popup_info.value

    # Let the card render. networkidle is best-effort; fall back to load.
    try:
        popup.wait_for_load_state("networkidle", timeout=POPUP_TIMEOUT)
    except PWTimeout:
        popup.wait_for_load_state("load", timeout=POPUP_TIMEOUT)

    guard_login(popup)

    html_path = os.path.join(OUT_DIR, f"{elid}.html")
    pdf_path  = os.path.join(OUT_DIR, f"{elid}.pdf")

    with open(html_path, "w", encoding="utf-8") as fh:
        fh.write(popup.content())

    # Render with print styles (the card was designed for window.print()).
    try:
        popup.emulate_media(media="print")
    except Exception:
        pass
    popup.pdf(path=pdf_path, format="A4", print_background=True)

    popup.close()


def write_log(rows):
    new_file = not os.path.exists(LOG_CSV)
    with open(LOG_CSV, "a", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        if new_file:
            w.writerow(["elid", "status", "timestamp"])
        w.writerows(rows)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Bulk-export medplus outpatient cards.")
    ap.add_argument("--only", metavar="ELID",
                    help="export just this one patient (for testing)")
    args = ap.parse_args()

    if not PHPSESSID:
        sys.exit("PHPSESSID is not set. Run: PHPSESSID=<your-session> "
                 "python export.py [--only ELID]")

    os.makedirs(OUT_DIR, exist_ok=True)

    cookies = [{"name": "PHPSESSID", "value": PHPSESSID, "url": BASE}]
    if AUTH_COOKIE_NAME:
        cookies.append({"name": AUTH_COOKIE_NAME,
                        "value": AUTH_COOKIE_VALUE, "url": BASE})

    log_rows = []
    exit_code = 0

    # Allow pointing at a pre-installed Chromium (e.g. in CI/sandbox images
    # where `playwright install` is disabled). Set CHROME_PATH to override.
    exe = os.environ.get("CHROME_PATH") or None

    with sync_playwright() as pw:
        launch_kwargs = {"headless": True}
        if exe:
            launch_kwargs["executable_path"] = exe
        browser = pw.chromium.launch(**launch_kwargs)
        context = browser.new_context(base_url=BASE)
        context.set_default_navigation_timeout(NAV_TIMEOUT)
        context.set_default_timeout(NAV_TIMEOUT)
        # Neutralise the card's automatic window.print() call.
        context.add_init_script("window.print = function(){};")
        context.add_cookies(cookies)
        page = context.new_page()

        try:
            if args.only:
                elids = [str(args.only)]
                print(f"Single-patient mode: elid={args.only}")
            else:
                print(f"Collecting patient ids for doctor {DOCTOR_ID} "
                      f"({FROM} .. {TO}) ...")
                elids = collect_all_elids(page)
                print(f"Found {len(elids)} unique patient ids.")

            for idx, elid in enumerate(elids, 1):
                pdf_path = os.path.join(OUT_DIR, f"{elid}.pdf")
                if os.path.exists(pdf_path):
                    print(f"[{idx}/{len(elids)}] {elid}: skip (already exported)")
                    log_rows.append([elid, "skipped", now_iso()])
                    continue

                status = None
                for attempt in range(RETRIES + 1):
                    try:
                        save_card(context, page, elid)
                        status = "ok"
                        print(f"[{idx}/{len(elids)}] {elid}: ok")
                        break
                    except SessionExpired:
                        raise
                    except Exception as e:
                        if attempt < RETRIES:
                            print(f"[{idx}/{len(elids)}] {elid}: "
                                  f"attempt {attempt + 1} failed ({e}); retrying")
                            time.sleep(SLEEP_BETWEEN)
                        else:
                            status = f"error: {e}"
                            print(f"[{idx}/{len(elids)}] {elid}: FAILED -> {e}")

                log_rows.append([elid, status, now_iso()])
                time.sleep(SLEEP_BETWEEN)

        except SessionExpired as e:
            print("\n" + "=" * 60)
            print("SESSION EXPIRED")
            print(str(e))
            print("Update PHPSESSID (and AUTH_COOKIE_* if used) and re-run. "
                  "Already-exported cards are kept; the run resumes.")
            print("=" * 60)
            exit_code = 2
        finally:
            write_log(log_rows)
            context.close()
            browser.close()

    ok = sum(1 for r in log_rows if r[1] == "ok")
    skipped = sum(1 for r in log_rows if r[1] == "skipped")
    failed = sum(1 for r in log_rows if str(r[1]).startswith("error"))
    print(f"\nDone. ok={ok} skipped={skipped} failed={failed}. "
          f"Log: {LOG_CSV}")
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
