#!/usr/bin/env python3
"""Headless smoke test: render the theme against the mock API and assert the
things a screenshot alone cannot prove (meter fills, card count, JS errors).

    python tools/inspect.py --url http://127.0.0.1:8771/
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import aiohttp

CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "google-chrome",
]

PROBE = r"""
(() => {
  const cards = [...document.querySelectorAll('article')];
  const meters = [...document.querySelectorAll('.meter > i')].slice(0, 8).map((el) => {
    const rect = el.getBoundingClientRect();
    return {
      width: Math.round(rect.width * 10) / 10,
      bg: getComputedStyle(el).backgroundImage.slice(0, 42),
    };
  });
  const spark = document.querySelector('article svg path');
  return {
    cards: cards.length,
    titles: cards.slice(0, 4).map((c) => c.querySelector('h3')?.textContent),
    meters,
    sparkline: spark ? spark.getAttribute('d')?.slice(0, 24) : null,
    stats: [...document.querySelectorAll('main section > div')].slice(0, 4)
      .map((d) => d.textContent?.replace(/\s+/g, ' ').trim()),
    errors: window.__errs || [],
  };
})()
"""


def find_chrome() -> str:
    for candidate in CHROME_CANDIDATES:
        if Path(candidate).is_file():
            return candidate
    found = shutil.which("google-chrome") or shutil.which("chromium")
    if found:
        return found
    sys.exit("no Chrome/Edge binary found")


async def wait_debugger(port: int, timeout: float = 25.0) -> None:
    deadline = asyncio.get_event_loop().time() + timeout
    async with aiohttp.ClientSession() as session:
        while asyncio.get_event_loop().time() < deadline:
            try:
                async with session.get(f"http://127.0.0.1:{port}/json/version") as res:
                    if res.status == 200:
                        return
            except (aiohttp.ClientError, asyncio.TimeoutError):
                pass
            await asyncio.sleep(0.3)
    sys.exit("devtools endpoint never came up")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--wait", type=float, default=6.0)
    parser.add_argument("--click", default="")
    parser.add_argument("--probe", default="", help="override the JS probe")
    parser.add_argument("--probe-file", default="", help="read the JS probe from a file")
    parser.add_argument("--port", type=int, default=9334)
    args = parser.parse_args()

    if args.probe_file:
        args.probe = Path(args.probe_file).read_text(encoding="utf-8")

    profile = tempfile.mkdtemp(prefix="km-inspect-")
    chrome = subprocess.Popen(
        [
            find_chrome(), "--headless=new", "--disable-gpu", "--no-sandbox",
            "--hide-scrollbars", "--no-first-run", f"--user-data-dir={profile}",
            "--window-size=1440,1180", f"--remote-debugging-port={args.port}",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        await wait_debugger(args.port)
        async with aiohttp.ClientSession() as session:
            async with session.put(
                f"http://127.0.0.1:{args.port}/json/new?about:blank"
            ) as res:
                target = await res.json()
            async with session.ws_connect(target["webSocketDebuggerUrl"], max_msg_size=0) as ws:
                counter = {"id": 0}

                async def call(method: str, **params):
                    counter["id"] += 1
                    current = counter["id"]
                    await ws.send_json({"id": current, "method": method, "params": params})
                    while True:
                        message = json.loads(await ws.receive_str())
                        if message.get("id") == current:
                            if "error" in message:
                                raise RuntimeError(f"{method}: {message['error']}")
                            return message.get("result", {})

                await call("Page.enable")
                await call("Runtime.enable")
                await call(
                    "Page.addScriptToEvaluateOnNewDocument",
                    source="window.__errs=[];"
                    "addEventListener('error',e=>window.__errs.push(String(e.message)));"
                    "addEventListener('unhandledrejection',e=>window.__errs.push(String(e.reason)));",
                )
                await call("Page.navigate", url=args.url)
                await asyncio.sleep(args.wait)
                if args.click:
                    await call("Runtime.evaluate",
                               expression=f"document.querySelector({json.dumps(args.click)})?.click()")
                    await asyncio.sleep(1.6)
                result = await call(
                    "Runtime.evaluate",
                    expression=args.probe or PROBE,
                    returnByValue=True,
                    awaitPromise=True,
                )
                print(json.dumps(result["result"]["value"], ensure_ascii=False, indent=2))
    finally:
        chrome.terminate()
        try:
            chrome.wait(timeout=10)
        except subprocess.TimeoutExpired:
            chrome.kill()
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == "__main__":
    asyncio.run(main())
