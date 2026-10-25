#!/usr/bin/env python3
"""Capture real screenshots of the built theme through the Chrome DevTools Protocol.

Unlike `chrome --screenshot`, this waits in wall-clock time, so CSS transitions
and the 2s WebSocket refresh have actually run when the frame is captured.

    python tools/screenshot.py --url http://127.0.0.1:8771/ --out shot.png
    python tools/screenshot.py --url http://127.0.0.1:8771/ --click article --out drawer.png
"""

from __future__ import annotations

import argparse
import asyncio
import base64
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
    "chromium",
]


def find_chrome() -> str:
    for candidate in CHROME_CANDIDATES:
        if os.path.sep in candidate or candidate.endswith(".exe"):
            if Path(candidate).is_file():
                return candidate
        elif shutil.which(candidate):
            return shutil.which(candidate)  # type: ignore[return-value]
    sys.exit("no Chrome/Edge binary found")


async def wait_for_debugger(port: int, timeout: float = 25.0) -> dict:
    deadline = asyncio.get_event_loop().time() + timeout
    async with aiohttp.ClientSession() as session:
        while asyncio.get_event_loop().time() < deadline:
            try:
                async with session.get(f"http://127.0.0.1:{port}/json/version") as res:
                    if res.status == 200:
                        return await res.json()
            except (aiohttp.ClientError, asyncio.TimeoutError):
                pass
            await asyncio.sleep(0.3)
    sys.exit("chrome devtools endpoint never came up")


async def new_target(port: int, url: str) -> dict:
    endpoint = f"http://127.0.0.1:{port}/json/new?{url}"
    async with aiohttp.ClientSession() as session:
        for method in ("PUT", "GET"):
            async with session.request(method, endpoint) as res:
                if res.status == 200:
                    return await res.json()
    sys.exit("could not open a devtools target")


class CDP:
    def __init__(self, ws: aiohttp.ClientWebSocketResponse) -> None:
        self.ws = ws
        self.next_id = 0

    async def call(self, method: str, **params):
        self.next_id += 1
        message_id = self.next_id
        await self.ws.send_json({"id": message_id, "method": method, "params": params})
        while True:
            message = json.loads(await self.ws.receive_str())
            if message.get("id") == message_id:
                if "error" in message:
                    raise RuntimeError(f"{method}: {message['error']}")
                return message.get("result", {})


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--width", type=int, default=1440)
    parser.add_argument("--height", type=int, default=1180)
    parser.add_argument("--wait", type=float, default=4.0)
    parser.add_argument("--click", default="")
    parser.add_argument("--after-click", type=float, default=1.6)
    parser.add_argument("--full", action="store_true", help="capture the whole scrollable page")
    parser.add_argument("--port", type=int, default=9333)
    args = parser.parse_args()

    profile = tempfile.mkdtemp(prefix="km-shot-")
    chrome = subprocess.Popen(
        [
            find_chrome(),
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--hide-scrollbars",
            "--no-first-run",
            "--disable-extensions",
            f"--user-data-dir={profile}",
            f"--window-size={args.width},{args.height}",
            f"--remote-debugging-port={args.port}",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    try:
        await wait_for_debugger(args.port)
        target = await new_target(args.port, "about:blank")
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(target["webSocketDebuggerUrl"], max_msg_size=0) as ws:
                cdp = CDP(ws)
                await cdp.call("Page.enable")
                await cdp.call("Emulation.setDeviceMetricsOverride",
                               width=args.width, height=args.height,
                               deviceScaleFactor=1, mobile=False)
                await cdp.call("Page.navigate", url=args.url)
                await asyncio.sleep(args.wait)
                if args.click:
                    await cdp.call(
                        "Runtime.evaluate",
                        expression=f"document.querySelector({json.dumps(args.click)})?.click()",
                    )
                    await asyncio.sleep(args.after_click)
                shot_params = {"format": "png"}
                if args.full:
                    # Keep the viewport (so 100vh stays honest) and paint the
                    # overflow instead of resizing the window.
                    metrics = await cdp.call("Page.getLayoutMetrics")
                    content = metrics.get("cssContentSize") or metrics["contentSize"]
                    shot_params.update(
                        clip={
                            "x": 0,
                            "y": 0,
                            "width": args.width,
                            "height": int(content["height"]),
                            "scale": 1,
                        },
                        captureBeyondViewport=True,
                    )
                shot = await cdp.call("Page.captureScreenshot", **shot_params)
                Path(args.out).write_bytes(base64.b64decode(shot["data"]))
                print(f"saved {args.out} ({args.width}x{'content' if args.full else args.height})")
    finally:
        chrome.terminate()
        try:
            chrome.wait(timeout=10)
        except subprocess.TimeoutExpired:
            chrome.kill()
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == "__main__":
    asyncio.run(main())
