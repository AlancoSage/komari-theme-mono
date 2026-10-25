"""Generate the projected world outline and the region -> coordinates table.

Inputs are public-domain Natural Earth 110m land polygons and the mledoze
country list (ODbL). Both are downloaded once by tools/fetch_map.py and are not
shipped in the theme; only the generated TypeScript is committed.

    python tools/gen_map.py
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
W, H = 2000, 1000
LAT_TOP, LAT_BOTTOM = 84.0, -58.0
TOLERANCE = 1.4
MIN_AREA = 80.0


def project(lon: float, lat: float) -> tuple[float, float]:
    return ((lon + 180.0) / 360.0 * W, (90.0 - lat) / 180.0 * H)


def ring_area(points: list[tuple[float, float]]) -> float:
    area = 0.0
    for index in range(len(points) - 1):
        x1, y1 = points[index]
        x2, y2 = points[index + 1]
        area += x1 * y2 - x2 * y1
    return abs(area) / 2.0


def simplify(points: list[tuple[float, float]], tolerance: float) -> list[tuple[float, float]]:
    """Douglas-Peucker on a closed ring (first point repeated at the end)."""
    if len(points) < 4:
        return points

    def segment(points: list[tuple[float, float]], first: int, last: int, keep: list[bool]) -> None:
        x1, y1 = points[first]
        x2, y2 = points[last]
        dx, dy = x2 - x1, y2 - y1
        length = (dx * dx + dy * dy) ** 0.5
        best, best_index = 0.0, -1
        for index in range(first + 1, last):
            px, py = points[index]
            if length == 0:
                distance = ((px - x1) ** 2 + (py - y1) ** 2) ** 0.5
            else:
                distance = abs(dy * px - dx * py + x2 * y1 - y2 * x1) / length
            if distance > best:
                best, best_index = distance, index
        if best > tolerance and best_index != -1:
            keep[best_index] = True
            segment(points, first, best_index, keep)
            segment(points, best_index, last, keep)

    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    segment(points, 0, len(points) - 1, keep)
    result = [point for point, flag in zip(points, keep) if flag]
    if len(result) < 4:
        return points[:2]
    return result


def load_land() -> list[list[list[tuple[float, float]]]]:
    data = json.loads((ROOT / "tools/_land.json").read_text(encoding="utf-8"))
    polygons: list[list[list[tuple[float, float]]]] = []
    for feature in data["features"]:
        geometry = feature["geometry"]
        if geometry["type"] == "Polygon":
            groups = [geometry["coordinates"]]
        elif geometry["type"] == "MultiPolygon":
            groups = geometry["coordinates"]
        else:
            continue
        for group in groups:
            rings = []
            for ring in group:
                points = [project(lon, lat) for lon, lat, *_ in ring]
                rings.append(points)
            polygons.append(rings)
    return polygons


def build_path(polygons: list[list[list[tuple[float, float]]]]) -> tuple[str, int, int]:
    parts: list[str] = []
    kept = 0
    top_y = project(0, LAT_TOP)[1]
    bottom_y = project(0, LAT_BOTTOM)[1]
    for rings in polygons:
        outer = rings[0]
        # y grows downward: skip rings fully below the bottom or above the top
        if min(y for _, y in outer) > bottom_y or max(y for _, y in outer) < top_y:
            continue
        # Antarctica and its shelf islands: mean latitude far south
        mean_lat = 90.0 - (sum(y for _, y in outer) / len(outer)) / H * 180.0
        if mean_lat < -56.0:
            continue
        if ring_area(outer) < MIN_AREA:
            continue
        simplified = simplify(outer, TOLERANCE)
        if len(simplified) < 4:
            continue
        # close the ring, drop duplicated points, round to integer pixels
        points: list[tuple[int, int]] = []
        for x, y in simplified:
            pair = (round(x), round(y))
            if not points or points[-1] != pair:
                points.append(pair)
        if points[0] != points[-1]:
            points.append(points[0])
        if len(points) < 4:
            continue
        kept += 1
        parts.append(
            "M"
            + "L".join(f"{x},{y}" for x, y in points[:-1])
            + "z"
        )
    return "".join(parts), kept, sum(len(part) for part in parts)


def build_countries() -> tuple[dict[str, list[float]], dict[str, str]]:
    """Natural Earth label points; public domain, no attribution needed."""
    data = json.loads((ROOT / "tools/_admin0.json").read_text(encoding="utf-8"))
    centroids: dict[str, list[float]] = {}
    names: dict[str, str] = {}
    for feature in data["features"]:
        props = feature["properties"]
        code = props.get("ISO_A2_EH") or props.get("ISO_A2")
        lat, lon = props.get("LABEL_Y"), props.get("LABEL_X")
        if not code or code in {"-99", ""} or lat is None or lon is None:
            continue
        centroids[code] = [round(lat, 2), round(lon, 2)]
        for name in (props.get("NAME"), props.get("NAME_ZH"), code):
            if name:
                names[str(name).strip().lower()] = code
    # Territories too small for the 1:110m file but common in node labels.
    for code, lat, lon, english, chinese in SMALL_TERRITORIES:
        centroids.setdefault(code, [lat, lon])
        for name in (english, chinese, code):
            names.setdefault(name.strip().lower(), code)
    return centroids, names


# Territories too small to survive the 1:110m simplification.
SMALL_TERRITORIES = [
    ("SG", 1.35, 103.82, "Singapore", "新加坡"),
    ("HK", 22.32, 114.17, "Hong Kong", "中国香港"),
    ("MO", 22.2, 113.54, "Macao", "中国澳门"),
    ("BH", 26.07, 50.55, "Bahrain", "巴林"),
    ("MT", 35.9, 14.51, "Malta", "马耳他"),
    ("MU", -20.35, 57.55, "Mauritius", "毛里求斯"),
    ("SC", -4.68, 55.49, "Seychelles", "塞舌尔"),
    ("MV", 3.2, 73.22, "Maldives", "马尔代夫"),
    ("CV", 16.0, -24.0, "Cape Verde", "佛得角"),
    ("KM", -11.65, 43.33, "Comoros", "科摩罗"),
    ("PW", 7.51, 134.58, "Palau", "帕劳"),
    ("MH", 7.13, 171.18, "Marshall Islands", "马绍尔群岛"),
    ("KI", 1.87, 172.98, "Kiribati", "基里巴斯"),
    ("TO", -21.18, -175.2, "Tonga", "汤加"),
    ("WS", -13.76, -172.1, "Samoa", "萨摩亚"),
    ("GU", 13.44, 144.79, "Guam", "关岛"),
]

# Hosting-heavy cities whose name often replaces the country in `region`.
CITIES: dict[str, tuple[float, float]] = {
    "tokyo": (35.68, 139.69),
    "osaka": (34.69, 135.50),
    "seoul": (37.57, 126.98),
    "hong kong": (22.32, 114.17),
    "hongkong": (22.32, 114.17),
    "香港": (22.32, 114.17),
    "taipei": (25.03, 121.57),
    "台北": (25.03, 121.57),
    "singapore": (1.35, 103.82),
    "新加坡": (1.35, 103.82),
    "sydney": (-33.87, 151.21),
    "melbourne": (-37.81, 144.96),
    "auckland": (-36.85, 174.76),
    "los angeles": (34.05, -118.24),
    "san francisco": (37.77, -122.42),
    "seattle": (47.61, -122.33),
    "new york": (40.71, -74.01),
    "dallas": (32.78, -96.80),
    "chicago": (41.88, -87.63),
    "toronto": (43.65, -79.38),
    "vancouver": (49.28, -123.12),
    "frankfurt": (50.11, 8.68),
    "helsinki": (60.17, 24.94),
    "amsterdam": (52.37, 4.90),
    "london": (51.51, -0.13),
    "paris": (48.86, 2.35),
    "dublin": (53.35, -6.26),
    "stockholm": (59.33, 18.07),
    "oslo": (59.91, 10.75),
    "zurich": (47.38, 8.54),
    "milan": (45.46, 9.19),
    "madrid": (40.42, -3.70),
    "warsaw": (52.23, 21.01),
    "bucharest": (44.43, 26.10),
    "moscow": (55.76, 37.62),
    "istanbul": (41.01, 28.98),
    "dubai": (25.20, 55.27),
    "mumbai": (19.08, 72.88),
    "delhi": (28.61, 77.21),
    "bangkok": (13.76, 100.50),
    "jakarta": (-6.21, 106.85),
    "kuala lumpur": (3.14, 101.69),
    "manila": (14.60, 120.98),
    "hanoi": (21.03, 105.85),
    "sao paulo": (-23.55, -46.63),
    "santiago": (-33.45, -70.67),
    "lima": (-12.05, -77.04),
    "buenos aires": (-34.60, -58.38),
    "mexico city": (19.43, -99.13),
    "johannesburg": (-26.20, 28.05),
    "cairo": (30.04, 31.24),
    "shanghai": (31.23, 121.47),
    "上海": (31.23, 121.47),
    "beijing": (39.90, 116.41),
    "北京": (39.90, 116.41),
    "shenzhen": (22.54, 114.06),
    "广州": (23.13, 113.26),
    "guangzhou": (23.13, 113.26),
    "hangzhou": (30.27, 120.15),
    "chengdu": (30.57, 104.07),
}


def main() -> None:
    polygons = load_land()
    path, kept, path_size = build_path(polygons)
    centroids, names = build_countries()

    out = ROOT / "src/lib/geoData.ts"
    lines = [
        "// Generated by tools/gen_map.py — Natural Earth 110m land (public domain)",
        "// and mledoze/countries centroids (ODbL). Do not edit by hand.",
        "",
        f"export const MAP_W = {W};",
        f"export const MAP_H = {H};",
        f"export const MAP_TOP = {project(0, LAT_TOP)[1]:.0f};",
        f"export const MAP_BOTTOM = {project(0, LAT_BOTTOM)[1]:.0f};",
        "",
        f'export const WORLD_PATH =\n  "{path}";',
        "",
        "export const COUNTRY_CENTROIDS: Record<string, [number, number]> = {",
    ]
    for code, (lat, lon) in sorted(centroids.items()):
        lines.append(f"  {code}: [{lat}, {lon}],")
    lines += ["};", "", "export const NAME_TO_CODE: Record<string, string> = {"]
    for name, code in sorted(names.items()):
        lines.append(f'  "{name}": "{code}",')
    lines += ["};", "", "export const CITY_COORDS: Record<string, [number, number]> = {"]
    for name, (lat, lon) in sorted(CITIES.items()):
        lines.append(f'  "{name}": [{lat}, {lon}],')
    lines += ["};", ""]
    out.write_text("\n".join(lines), encoding="utf-8")

    print(f"polygons kept : {kept}")
    print(f"path chars    : {path_size / 1024:.1f} KiB")
    print(f"countries     : {len(centroids)}")
    print(f"name aliases  : {len(names)}")
    print(f"cities        : {len(CITIES)}")
    print(f"file size     : {out.stat().st_size / 1024:.1f} KiB")


if __name__ == "__main__":
    main()
