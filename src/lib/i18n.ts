import { useCallback, useEffect, useState } from "react";

export type Lang = "zh-CN" | "en";

const DICT = {
  "zh-CN": {
    nodes: "节点",
    online: "在线",
    offline: "离线",
    totalTraffic: "累计流量",
    avgCpu: "平均 CPU",
    search: "搜索节点 / 分组 / 地区…",
    all: "全部",
    cpu: "CPU",
    ram: "内存",
    disk: "硬盘",
    network: "网络",
    swap: "交换",
    load: "负载",
    uptime: "运行",
    traffic: "流量",
    expires: "到期",
    price: "价格",
    ping: "延迟",
    details: "详情",
    history: "历史曲线",
    system: "系统信息",
    live: "实时指标",
    latency: "延迟监测",
    noData: "暂无数据",
    loading: "加载中…",
    empty: "还没有节点",
    emptyHint: "在后台添加节点并部署 Agent 后，这里会自动出现。",
    private: "站点已开启私有模式，请先登录后台。",
    error: "连不上服务端",
    updated: "更新于",
    connecting: "连接中",
    connected: "实时",
    disconnected: "重连中",
    appearance: "外观",
    light: "浅色",
    dark: "深色",
    system_label: "跟随系统",
    process: "进程",
    os: "系统",
    arch: "架构",
    region: "地区",
    group: "分组",
    cores: "核心",
    gpu: "GPU",
    ago: "前",
    close: "关闭",
    login: "登录后台",
    retry: "重试",
    refresh: "刷新",
    overview: "概览",
    groups: "分组",
    status: "状态",
    about: "关于",
    note: "公告",
    noteBody: "这里是 Komari 监控面板，节点状态每 2 秒刷新一次。",
    navOverview: "总览",
    navNodes: "节点",
    navAdmin: "后台",
    navSitemap: "站点地图",
    sitemapDesc: "按分组或地区浏览全部节点，点任意一行直接打开详情。",
    backHome: "返回总览",
    byGroup: "按分组",
    byRegion: "按地区",
    worldMap: "全球分布",
    located: "个已定位",
    noRegion: "region 里没有可识别的国家或城市，地图暂无点位。可以用 ISO 国家码（HK、US）或城市名。",
    viewDetails: "查看详情",
    onlineRate: "在线率",
    totalNodes: "节点总数",
    filtered: "筛选中",
  },
  en: {
    nodes: "Nodes",
    online: "Online",
    offline: "Offline",
    totalTraffic: "Traffic",
    avgCpu: "Avg CPU",
    search: "Search node / group / region…",
    all: "All",
    cpu: "CPU",
    ram: "Memory",
    disk: "Disk",
    network: "Network",
    swap: "Swap",
    load: "Load",
    uptime: "Uptime",
    traffic: "Traffic",
    expires: "Expires",
    price: "Price",
    ping: "Latency",
    details: "Details",
    history: "History",
    system: "System",
    live: "Live",
    latency: "Latency",
    noData: "No data",
    loading: "Loading…",
    empty: "No nodes yet",
    emptyHint: "Add a node in the admin panel and deploy its agent.",
    private: "This site is private. Please sign in first.",
    error: "Cannot reach server",
    updated: "Updated",
    connecting: "Connecting",
    connected: "Live",
    disconnected: "Reconnecting",
    appearance: "Appearance",
    light: "Light",
    dark: "Dark",
    system_label: "System",
    process: "Processes",
    os: "OS",
    arch: "Arch",
    region: "Region",
    group: "Group",
    cores: "Cores",
    gpu: "GPU",
    ago: "ago",
    close: "Close",
    login: "Sign in",
    retry: "Retry",
    refresh: "Refresh",
    overview: "Overview",
    groups: "Groups",
    status: "Status",
    about: "About",
    note: "Notice",
    noteBody: "Komari monitor. Node state refreshes every 2 seconds.",
    navOverview: "Overview",
    navNodes: "Nodes",
    navAdmin: "Admin",
    navSitemap: "Sitemap",
    sitemapDesc: "Every node by group or region. Click a row to open its details.",
    backHome: "Back to overview",
    byGroup: "By group",
    byRegion: "By region",
    worldMap: "Global spread",
    located: "located",
    noRegion:
      "No region could be mapped. Use an ISO code (HK, US) or a city name in the region field.",
    viewDetails: "View details",
    onlineRate: "Online rate",
    totalNodes: "Total nodes",
    filtered: "Filtered",
  },
} as const;

export type MessageKey = keyof (typeof DICT)["zh-CN"];

const STORAGE_KEY = "language";

function detect(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "zh-CN" || saved === "en") return saved;
    if (saved && saved.toLowerCase().startsWith("zh")) return "zh-CN";
  } catch {
    /* storage blocked */
  }
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function useI18n() {
  const [lang, setLangState] = useState<Lang>(() => detect());

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback((key: MessageKey) => DICT[lang][key] ?? key, [lang]);

  return { lang, setLang, t };
}
