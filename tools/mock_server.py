#!/usr/bin/env python3
"""Local mock of the Komari API for previewing the theme without a server.

Not part of the theme package: it only exists so `python tools/mock_server.py`
can serve `dist/` at the exact URL layout Komari uses and answer the public
endpoints with synthetic data. Development tool, delete it if you ship the repo.

    python tools/mock_server.py --port 8771 --appearance dark
"""

from __future__ import annotations

import argparse
import asyncio
import json
import math
import os
import pathlib
import random
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from aiohttp import web

ROOT = Path(__file__).resolve().parent.parent
SHORT = "Mono"

NODES = [
    ("tokyo-01", "Tokyo-01", "JP", "亚洲", "AMD EPYC 7443", 4, 2048, 40960, 8.0, 12, 1),
    ("hk-premium", "HK-Premium", "HK", "亚洲", "AMD Ryzen 9 7950X", 8, 4096, 81920, 2.5, 21, 1),
    ("frankfurt", "Frankfurt", "DE", "欧洲", "Intel Xeon E5-2680 v4", 2, 1024, 20480, 3.0, 45, 0),
    ("singapore", "Singapore", "SG", "亚洲", "AMD EPYC 7763", 4, 2048, 30720, 4.0, 9, 1),
    ("los-angeles", "Los Angeles", "US", "美洲", "Intel Xeon Gold 6248", 2, 1536, 25600, 1.0, 3, 1),
    ("shanghai", "Shanghai", "CN", "亚洲", "AMD Ryzen 7 5800X", 6, 3072, 51200, 6.0, 88, 0),
    ("sydney", "Sydney", "AU", "大洋洲", "AMD EPYC 7302", 2, 1024, 20480, 2.0, 33, 1),
    ("helsinki", "Helsinki", "FI", "欧洲", "Intel Xeon E5-2690 v4", 3, 2048, 40960, 12.0, 140, 1),
]

# `--dupe` clones one node onto the same region so pin clustering can be tested.
DUPE = False
if os.environ.get("MOCK_DUPE") == "1":
    NODES.append(
        ("hk-clone", "HK-Clone", "HK", "亚洲", "AMD EPYC 7003", 2, 1024, 20480, 1.0, 10, 1)
    )

PING_TASKS = [
    {"id": 1, "name": "Telecom", "clients": [], "weight": 1, "type": "icmp", "interval": 60},
    {"id": 2, "name": "Unicom", "clients": [], "weight": 2, "type": "icmp", "interval": 60},
    {"id": 3, "name": "Mobile", "clients": [], "weight": 3, "type": "icmp", "interval": 60},
]


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


SAVED_SETTINGS: dict | None = None
ADMIN_ENABLED = os.environ.get("MOCK_NO_ADMIN") != "1"


def public_settings() -> dict:
    settings = _env_settings()
    if SAVED_SETTINGS is not None:
        settings.update(SAVED_SETTINGS)
    return settings


def _env_settings() -> dict:
    return {
        "accent": os.environ.get("MOCK_ACCENT", "mono"),
        "accentColor": os.environ.get("MOCK_ACCENT_HEX", "#7c5cff"),
        "density": os.environ.get("MOCK_DENSITY", "comfortable"),
        "grain": "true",
        "showSidebar": "true",
        "showTraffic": "true",
        "showSparkline": "true",
        "showPing": "true",
        "showExpiry": "true",
        "showPrice": "true",
        "featuredPingTasks": "1,2",
        "featuredNodes": "Shanghai",
        "historyHours": "4",
        "footerHtml": "",
        "banner": "",
        "logoUrl": os.environ.get("MOCK_LOGO", ""),
        "logoText": os.environ.get("MOCK_LOGO_TEXT", ""),
        "background": "/bg.jpg" if WANT_BG else "",
        "backgroundLight": os.environ.get("MOCK_BG_LIGHT", ""),
        "backgroundDark": os.environ.get("MOCK_BG_DARK", ""),
        "backgroundVeil": "55",
        "backgroundBlur": str(BG_BLUR),
        "backgroundFit": BG_FIT,
        "fontFamily": FONT_FAMILY,
        "fontStack": FONT_STACK,
        "fontSize": str(FONT_SIZE),
        "fontUrl": FONT_URL,
        "tabularNumbers": "true",
        "showMap": "false" if os.environ.get("MOCK_NO_MAP") == "1" else "true",
    }


NODE_PAYLOAD = []
for index, (uuid, name, region, group, cpu_name, cores, mem, disk, price, left, on) in enumerate(NODES):
    NODE_PAYLOAD.append(
        {
            "uuid": uuid,
            "name": name,
            "cpu_name": cpu_name,
            "arch": "amd64",
            "cpu_cores": cores,
            "os": "Ubuntu 24.04 LTS",
            "ipv4": f"203.0.113.{10 + index}",
            "ipv6": f"2001:db8::{10 + index}",
            "region": region,
            "group": group,
            "mem_total": mem * 1024 * 1024,
            "swap_total": 1024 * 1024 * 1024,
            "disk_total": disk * 1024 * 1024,
            "weight": index,
            "price": price,
            "currency": "USD",
            "expired_at": iso(datetime.now(timezone.utc) + timedelta(days=left)),
            "traffic_limit": 1024 * 1024 * 1024 * 1024,
            "traffic_limit_type": "sum" if index % 2 else "max",
            "tags": "ssd;cn2" if index % 3 == 0 else "",
            "public_remark": "三网优化 · 流媒体解锁" if index % 4 == 0 else "",
        }
    )

START = time.time()


def snapshot() -> dict:
    t = time.time() - START
    data = {}
    online = []
    for index, node in enumerate(NODE_PAYLOAD):
        if index == 2:
            continue
        online.append(node["uuid"])
        base = 18 + index * 7
        cpu = max(2.0, base + 14 * math.sin(t / 11 + index) + random.uniform(-3, 3))
        mem_total = node["mem_total"]
        mem_used = mem_total * (0.28 + 0.06 * math.sin(t / 17 + index))
        disk_total = node["disk_total"]
        data[node["uuid"]] = {
            "cpu": {
                "name": node["cpu_name"],
                "cores": node["cpu_cores"],
                "arch": "amd64",
                "usage": round(cpu, 2),
            },
            "ram": {"total": mem_total, "used": int(mem_used)},
            "swap": {"total": 1 << 30, "used": int((1 << 30) * 0.08)},
            "load": {
                "load1": round(cpu / 22, 2),
                "load5": round(cpu / 25, 2),
                "load15": round(cpu / 28, 2),
            },
            "disk": {"total": disk_total, "used": int(disk_total * 0.41)},
            "network": {
                "up": int(120_000 + 90_000 * math.sin(t / 7 + index)),
                "down": int(2_400_000 + 1_500_000 * math.sin(t / 5 + index * 0.7)),
                "totalUp": int((2.1 + index * 0.35) * 1e11),
                "totalDown": int((5.4 + index * 0.8) * 1e11),
            },
            "connections": {"tcp": 120 + index * 13, "udp": 14 + index},
            "uptime": 86400 * (12 + index) + 3600 * 5,
            "process": 142 + index * 7,
            "message": "",
            "updated_at": iso(datetime.now(timezone.utc)),
        }
    return {"status": "success", "data": {"online": online, "data": data}}


def load_records(uuid: str, hours: int) -> list[dict]:
    index = next((i for i, n in enumerate(NODE_PAYLOAD) if n["uuid"] == uuid), 0)
    now = datetime.now(timezone.utc)
    count = min(hours * 12, 288)
    records = []
    for step in range(count):
        moment = now - timedelta(minutes=(count - step) * 5)
        phase = step / 9 + index
        records.append(
            {
                "client": uuid,
                "time": iso(moment),
                "cpu": round(max(3, 20 + index * 6 + 16 * math.sin(phase)), 1),
                "ram": int(NODE_PAYLOAD[index]["mem_total"] * (0.3 + 0.05 * math.sin(phase / 2))),
                "ram_total": NODE_PAYLOAD[index]["mem_total"],
                "net_in": int(2_000_000 + 1_400_000 * math.sin(phase / 1.7)),
                "net_out": int(180_000 + 120_000 * math.sin(phase)),
                "disk": int(NODE_PAYLOAD[index]["disk_total"] * 0.41),
                "disk_total": NODE_PAYLOAD[index]["disk_total"],
            }
        )
    return records


def ping_records(task_id: int, hours: int) -> list[dict]:
    now = datetime.now(timezone.utc)
    records = []
    for index, node in enumerate(NODE_PAYLOAD):
        base = 12 + index * 11 + task_id * 9
        for step in range(12):
            records.append(
                {
                    "task_id": task_id,
                    "client": node["uuid"],
                    "time": iso(now - timedelta(minutes=step * 5)),
                    "value": round(base + random.uniform(-4, 9), 1),
                }
            )
    return records


async def api_public(_: web.Request) -> web.Response:
    return web.json_response(
        {
            "status": "success",
            "message": "",
            "data": {
                "sitename": "Aurora Lab",
                "description": "极光玻璃 · 自托管监控演示",
                "custom_head": "",
                "custom_body": "",
                "allow_cors": True,
                "theme_settings": public_settings(),
            },
        }
    )


async def api_nodes(_: web.Request) -> web.Response:
    return web.json_response({"status": "success", "message": "", "data": NODE_PAYLOAD})


async def api_ping_tasks(_: web.Request) -> web.Response:
    return web.json_response({"status": "success", "message": "", "data": PING_TASKS})


async def api_records_load(request: web.Request) -> web.Response:
    uuid = request.query.get("uuid", NODE_PAYLOAD[0]["uuid"])
    hours = int(request.query.get("hours", "4"))
    return web.json_response(
        {"status": "success", "message": "", "data": {"records": load_records(uuid, hours)}}
    )


async def api_records_ping(request: web.Request) -> web.Response:
    task_id = int(request.query.get("task_id", "1"))
    hours = int(request.query.get("hours", "1"))
    return web.json_response(
        {"status": "success", "message": "", "data": {"records": ping_records(task_id, hours)}}
    )


async def api_me(_: web.Request) -> web.Response:
    return web.json_response({"logged_in": False})


async def ws_clients(request: web.Request) -> web.WebSocketResponse:
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    await ws.send_str(json.dumps(snapshot()))
    async for message in ws:
        if message.data == "get":
            await ws.send_str(json.dumps(snapshot()))
    return ws


async def index(_: web.Request) -> web.Response:
    html = (ROOT / "dist" / "index.html").read_text(encoding="utf-8")
    if APPEARANCE != "system":
        html = html.replace(
            "<body>",
            f'<body><script>localStorage.setItem("appearance","{APPEARANCE}")</script>',
            1,
        )
    return web.Response(text=html, content_type="text/html")


async def static_file(request: web.Request) -> web.Response:
    relative = request.match_info["path"]
    target = (ROOT / "dist" / relative).resolve()
    if not target.is_file() or ROOT.resolve() not in target.parents:
        raise web.HTTPNotFound()
    return web.FileResponse(target)


async def admin_theme_list(request: web.Request) -> web.Response:
    if not ADMIN_ENABLED:
        raise web.HTTPUnauthorized()
    return web.json_response(
        {"status": "success", "message": "", "data": [{"short": SHORT, "version": "1.7.0"}]}
    )


async def admin_theme_settings(request: web.Request) -> web.Response:
    global SAVED_SETTINGS
    if not ADMIN_ENABLED:
        raise web.HTTPUnauthorized()
    if request.query.get("theme") != SHORT:
        return web.json_response({"status": "error", "message": "unknown theme", "data": None}, status=400)
    body = await request.json()
    if not isinstance(body, dict):
        return web.json_response({"status": "error", "message": "bad body", "data": None}, status=400)
    SAVED_SETTINGS = dict(body)
    print("saved theme settings -> accent:", SAVED_SETTINGS.get("accent"), "hex:", SAVED_SETTINGS.get("accentColor"), flush=True)
    return web.json_response({"status": "success", "message": "", "data": None})


async def plugin_file(request: web.Request) -> web.Response:
    """Serve the companion plugin page so it can be exercised offline."""
    root = pathlib.Path(r"D:\dsh\komari-plugin-mono-palette")
    target = (root / request.match_info["name"]).resolve()
    if not target.is_file() or root not in target.parents:
        raise web.HTTPNotFound()
    return web.FileResponse(target)


async def test_bg(request: web.Request) -> web.Response:
    """Stand-in wallpaper so the background setting can be exercised offline."""
    path = ROOT / "docs" / "test-bg.jpg"
    if not path.is_file():
        raise web.HTTPNotFound()
    return web.FileResponse(path)


async def test_bg_light(request: web.Request) -> web.Response:
    """A pale wallpaper, handy for checking per-scheme backgrounds."""
    path = ROOT / "docs" / "test-bg-light.jpg"
    if not path.is_file():
        raise web.HTTPNotFound()
    return web.FileResponse(path)


APPEARANCE = "system"
WANT_BG = True
BG_BLUR = 0
BG_FIT = "cover"
FONT_FAMILY = "system"
FONT_STACK = ""
FONT_SIZE = 15
FONT_URL = ""


def main() -> None:
    global APPEARANCE, WANT_BG, BG_BLUR, BG_FIT, FONT_FAMILY, FONT_STACK, FONT_SIZE, FONT_URL
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8771)
    parser.add_argument("--appearance", default="system", choices=["system", "light", "dark"])
    parser.add_argument("--no-bg", action="store_true", help="do not set a page background")
    parser.add_argument("--bg-blur", type=int, default=0, help="background blur in px")
    parser.add_argument("--bg-fit", default="cover", help="cover / contain / tile, or a messy label")
    parser.add_argument(
        "--font",
        default="system",
        help="system / sans / serif / mono / rounded / custom, or a messy label",
    )
    parser.add_argument("--font-stack", default="", help="custom font-family value")
    parser.add_argument("--font-size", type=int, default=15)
    parser.add_argument("--font-url", default="", help="webfont CSS url")
    args = parser.parse_args()
    APPEARANCE = args.appearance
    WANT_BG = not args.no_bg
    BG_BLUR = args.bg_blur
    BG_FIT = os.environ.get("MOCK_BG_FIT", args.bg_fit)
    FONT_FAMILY = os.environ.get("MOCK_FONT", args.font)
    FONT_STACK = args.font_stack
    FONT_SIZE = args.font_size
    FONT_URL = args.font_url

    app = web.Application()
    app.router.add_get("/api/public", api_public)
    app.router.add_get("/api/nodes", api_nodes)
    app.router.add_get("/api/me", api_me)
    app.router.add_get("/api/task/ping", api_ping_tasks)
    app.router.add_get("/api/records/load", api_records_load)
    app.router.add_get("/api/records/ping", api_records_ping)
    app.router.add_get("/api/clients", ws_clients)
    app.router.add_get(f"/themes/{SHORT}/dist/{{path:.*}}", static_file)
    app.router.add_get("/api/admin/theme/list", admin_theme_list)
    app.router.add_post("/api/admin/theme/settings", admin_theme_settings)
    app.router.add_get("/api/admin/plugin/mono-palette/{name}", plugin_file)
    app.router.add_get("/bg.jpg", test_bg)
    app.router.add_get("/bg-light.jpg", test_bg_light)
    app.router.add_get("/", index)
    app.router.add_get("/{tail:.*}", index)
    print(f"mock komari on http://127.0.0.1:{args.port}/  appearance={APPEARANCE}")
    web.run_app(app, host="127.0.0.1", port=args.port, print=None)


if __name__ == "__main__":
    main()
