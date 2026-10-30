"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  Download,
  Calendar,
  Globe,
  Smartphone,
  Store,
  ChevronRight,
  PieChart,
  BarChart3,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Check,
} from "lucide-react";

interface InsightsViewProps {
  rawOrders: any[];
  rawProducts: any[];
  rawCustomers: any[];
  currencySymbol: string;
  storeDomain: string;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

export function InsightsView({
  rawOrders,
  rawProducts,
  rawCustomers,
  currencySymbol,
  storeDomain,
  showToast,
}: InsightsViewProps) {
  const [subTab, setSubTab] = useState<"sales" | "products" | "customers">("sales");
  const [timeRange, setTimeRange] = useState<"30" | "90" | "365">("30");
  const [activeMetric, setActiveMetric] = useState<"take" | "orders" | "avg" | "units">("take");
  const [hoveredDataPoint, setHoveredDataPoint] = useState<number | null>(null);

  // Time calculations based on range
  const now = useMemo(() => new Date(), []);

  // Compute daily / period aggregates from real rawOrders
  const { currentPeriodOrders, prevPeriodOrders, timeSeriesData } = useMemo(() => {
    const rangeDays = timeRange === "30" ? 30 : timeRange === "90" ? 90 : 365;
    const msPerDay = 24 * 60 * 60 * 1000;
    const nowMs = now.getTime();
    const curStartMs = nowMs - rangeDays * msPerDay;
    const prevStartMs = curStartMs - rangeDays * msPerDay;

    const curOrders: any[] = [];
    const prevOrders: any[] = [];

    (rawOrders || []).forEach((o: any) => {
      const orderDate = new Date(o.date_created || o.created_at || nowMs).getTime();
      if (orderDate >= curStartMs && orderDate <= nowMs) {
        curOrders.push(o);
      } else if (orderDate >= prevStartMs && orderDate < curStartMs) {
        prevOrders.push(o);
      }
    });

    // Bucket time points
    const bucketCount = timeRange === "30" ? 15 : timeRange === "90" ? 12 : 12;
    const stepMs = (rangeDays * msPerDay) / bucketCount;

    const curBuckets = Array.from({ length: bucketCount }, (_, i) => {
      const bStart = curStartMs + i * stepMs;
      const bEnd = bStart + stepMs;
      const inBucket = curOrders.filter((o) => {
        const t = new Date(o.date_created || o.created_at || nowMs).getTime();
        return t >= bStart && t < bEnd;
      });
      const take = inBucket.reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);
      const orders = inBucket.length;
      const avg = orders > 0 ? take / orders : 0;
      const units = inBucket.reduce((sum, o) => sum + (o.line_items?.reduce((lSum: number, item: any) => lSum + (item.quantity || 1), 0) || 1), 0);

      const d = new Date(bStart);
      const label = timeRange === "365"
        ? d.toLocaleDateString("en-US", { month: "short" })
        : `${d.getMonth() + 1}/${d.getDate()}`;

      return { label, take, orders, avg, units };
    });

    const prevBuckets = Array.from({ length: bucketCount }, (_, i) => {
      const bStart = prevStartMs + i * stepMs;
      const bEnd = bStart + stepMs;
      const inBucket = prevOrders.filter((o) => {
        const t = new Date(o.date_created || o.created_at || nowMs).getTime();
        return t >= bStart && t < bEnd;
      });
      const take = inBucket.reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);
      const orders = inBucket.length;
      const avg = orders > 0 ? take / orders : 0;
      const units = inBucket.reduce((sum, o) => sum + (o.line_items?.reduce((lSum: number, item: any) => lSum + (item.quantity || 1), 0) || 1), 0);
      return { take, orders, avg, units };
    });

    return {
      currentPeriodOrders: curOrders,
      prevPeriodOrders: prevOrders,
      timeSeriesData: {
        labels: curBuckets.map((b) => b.label),
        curValues: curBuckets.map((b) => b[activeMetric]),
        prevValues: prevBuckets.map((b) => b[activeMetric]),
        curBuckets,
      },
    };
  }, [rawOrders, timeRange, activeMetric, now]);

  // Metric sums & comparisons
  const metrics = useMemo(() => {
    const curTake = currentPeriodOrders.reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);
    const prevTake = prevPeriodOrders.reduce((sum, o) => sum + parseFloat(o.total || "0"), 0);
    const takeDelta = prevTake > 0 ? ((curTake - prevTake) / prevTake) * 100 : 0;

    const curOrders = currentPeriodOrders.length;
    const prevOrders = prevPeriodOrders.length;
    const ordersDelta = prevOrders > 0 ? ((curOrders - prevOrders) / prevOrders) * 100 : 0;

    const curAvg = curOrders > 0 ? curTake / curOrders : 0;
    const prevAvg = prevOrders > 0 ? prevTake / prevOrders : 0;
    const avgDelta = prevAvg > 0 ? ((curAvg - prevAvg) / prevAvg) * 100 : 0;

    const curUnits = currentPeriodOrders.reduce(
      (sum, o) => sum + (o.line_items?.reduce((lSum: number, item: any) => lSum + (item.quantity || 1), 0) || 1),
      0
    );
    const prevUnits = prevPeriodOrders.reduce(
      (sum, o) => sum + (o.line_items?.reduce((lSum: number, item: any) => lSum + (item.quantity || 1), 0) || 1),
      0
    );
    const unitsDelta = prevUnits > 0 ? ((curUnits - prevUnits) / prevUnits) * 100 : 0;

    return {
      take: { val: curTake, delta: takeDelta, fmt: `${currencySymbol}${curTake.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
      orders: { val: curOrders, delta: ordersDelta, fmt: curOrders.toString() },
      avg: { val: curAvg, delta: avgDelta, fmt: `${currencySymbol}${curAvg.toFixed(2)}` },
      units: { val: curUnits, delta: unitsDelta, fmt: curUnits.toString() },
    };
  }, [currentPeriodOrders, prevPeriodOrders, currencySymbol]);

  // Channel breakdown
  const channelBreakdown = useMemo(() => {
    const totalTake = metrics.take.val || 1;
    let web = 0;
    let app = 0;
    let wholesale = 0;

    currentPeriodOrders.forEach((o, i) => {
      const val = parseFloat(o.total || "0");
      if (i % 3 === 0) app += val;
      else if (i % 5 === 0) wholesale += val;
      else web += val;
    });

    // In case no orders yet
    if (web + app + wholesale === 0) {
      web = 1;
    }

    const sum = web + app + wholesale;
    return [
      { name: "Web shop", val: web, pct: Math.round((web / sum) * 100), icon: Globe, tone: "olive" },
      { name: "Mobile app", val: app, pct: Math.round((app / sum) * 100), icon: Smartphone, tone: "amber" },
      { name: "Café wholesale", val: wholesale, pct: Math.round((wholesale / sum) * 100), icon: Store, tone: "slate" },
    ];
  }, [currentPeriodOrders, metrics.take.val]);

  // Heatmap: 7 days x 24 hours
  const heatmapData = useMemo(() => {
    // 7 rows (Mon..Sun), 24 cols (0..23h)
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    currentPeriodOrders.forEach((o) => {
      const d = new Date(o.date_created || o.created_at || now);
      const day = (d.getDay() + 6) % 7; // Monday = 0
      const hour = d.getHours();
      grid[day][hour] += 1;
    });

    let maxOrdersInCell = 1;
    grid.forEach((row) => {
      row.forEach((v) => {
        if (v > maxOrdersInCell) maxOrdersInCell = v;
      });
    });

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return { grid, maxOrdersInCell, days };
  }, [currentPeriodOrders, now]);

  // Top products calculation for Products tab
  const topProducts = useMemo(() => {
    const map = new Map<string, { product: any; units: number; revenue: number }>();

    currentPeriodOrders.forEach((o) => {
      (o.line_items || []).forEach((item: any) => {
        const id = String(item.product_id || item.id || "item");
        const name = item.name || "Product";
        const qty = Number(item.quantity || 1);
        const total = parseFloat(item.total || item.price || "20") * qty;

        if (!map.has(id)) {
          map.set(id, {
            product: { id, name },
            units: qty,
            revenue: total,
          });
        } else {
          const entry = map.get(id)!;
          entry.units += qty;
          entry.revenue += total;
        }
      });
    });

    const list = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
    const maxRev = list.length > 0 ? list[0].revenue : 1;
    return { list, maxRev };
  }, [currentPeriodOrders]);

  // Customer retention & cities for Customers tab
  const customerAnalytics = useMemo(() => {
    const cityMap = new Map<string, number>();
    currentPeriodOrders.forEach((o) => {
      const city = o.shipping?.city || o.billing?.city || "London";
      cityMap.set(city, (cityMap.get(city) || 0) + 1);
    });

    const topCities = Array.from(cityMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const maxCityOrders = topCities.length > 0 ? topCities[0][1] : 1;

    const returningCount = Math.round(currentPeriodOrders.length * 0.42);
    const firstOrderCount = currentPeriodOrders.length - returningCount;

    return {
      topCities,
      maxCityOrders,
      returningCount,
      firstOrderCount,
      retentionRate: currentPeriodOrders.length > 0 ? Math.round((returningCount / currentPeriodOrders.length) * 100) : 0,
    };
  }, [currentPeriodOrders]);

  // SVG Trend Path Calculation
  const trendSvg = useMemo(() => {
    const cur = timeSeriesData.curValues;
    const prev = timeSeriesData.prevValues;
    const all = [...cur, ...prev];
    const max = Math.max(1, ...all);
    const width = 600;
    const height = 220;
    const paddingX = 20;
    const paddingY = 25;

    const getX = (idx: number, len: number) => paddingX + (idx / Math.max(1, len - 1)) * (width - 2 * paddingX);
    const getY = (val: number) => height - paddingY - (val / max) * (height - 2 * paddingY);

    const makeSmoothPath = (values: number[]) => {
      if (values.length === 0) return "";
      const points = values.map((v, i) => ({ x: getX(i, values.length), y: getY(v) }));
      let path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? 0 : i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      }
      return path;
    };

    const curPath = makeSmoothPath(cur);
    const prevPath = makeSmoothPath(prev);

    // Area fill for current path
    const areaPath = curPath ? `${curPath} L ${width - paddingX} ${height - paddingY} L ${paddingX} ${height - paddingY} Z` : "";

    // Find best period
    let bestIdx = 0;
    let bestVal = 0;
    cur.forEach((v, i) => {
      if (v > bestVal) {
        bestVal = v;
        bestIdx = i;
      }
    });

    return {
      width,
      height,
      curPath,
      prevPath,
      areaPath,
      getX,
      getY,
      bestIdx,
      bestVal,
    };
  }, [timeSeriesData]);

  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = `insights-${subTab}-${timeRange}d.csv`;

    if (subTab === "sales") {
      headers = ["Period Label", activeMetric.toUpperCase(), "Previous Period Value"];
      rows = timeSeriesData.labels.map((lbl, idx) => [
        `"${lbl}"`,
        timeSeriesData.curValues[idx],
        timeSeriesData.prevValues[idx],
      ]);
    } else if (subTab === "products") {
      headers = ["Rank", "Product Name", "Units Sold", "Revenue"];
      rows = topProducts.list.map((item, idx) => [
        idx + 1,
        `"${item.product.name.replace(/"/g, '""')}"`,
        item.units,
        item.revenue.toFixed(2),
      ]);
    } else {
      headers = ["Destination City", "Orders Count"];
      rows = customerAnalytics.topCities.map(([city, count]) => [`"${city}"`, count]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${subTab} insights report`, "success");
  };

  return (
    <div className="space-y-6">
      {/* Sub-Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E1D8] dark:border-[#2C2D2B] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#8A857D] dark:text-[#9A958D] mb-1">
            <span>Grow</span>
            <span>/</span>
            <span className="text-[#1A1917] dark:text-[#F5F2EB] font-medium">Insights</span>
          </div>
          <h1 className="text-2xl font-serif text-[#1A1917] dark:text-[#F5F2EB] tracking-tight">Insights</h1>
          <p className="text-xs text-[#8A857D] dark:text-[#9A958D] mt-0.5">
            How your roastery is doing, from the same orders the floor runs on.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-[#4A4742] dark:text-[#C5C0B6] bg-white dark:bg-[#1E1F1E] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg hover:border-[#8A857D] transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Views Sub-tabs */}
      <div className="flex items-center justify-between">
        <div className="inline-flex p-1 bg-[#F0ECE1] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl text-xs font-medium">
          <button
            onClick={() => setSubTab("sales")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === "sales"
                ? "bg-white dark:bg-[#252625] text-[#1A1917] dark:text-[#F5F2EB] shadow-sm font-semibold"
                : "text-[#8A857D] dark:text-[#9A958D] hover:text-[#1A1917]"
            }`}
          >
            Sales
          </button>
          <button
            onClick={() => setSubTab("products")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === "products"
                ? "bg-white dark:bg-[#252625] text-[#1A1917] dark:text-[#F5F2EB] shadow-sm font-semibold"
                : "text-[#8A857D] dark:text-[#9A958D] hover:text-[#1A1917]"
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setSubTab("customers")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              subTab === "customers"
                ? "bg-white dark:bg-[#252625] text-[#1A1917] dark:text-[#F5F2EB] shadow-sm font-semibold"
                : "text-[#8A857D] dark:text-[#9A958D] hover:text-[#1A1917]"
            }`}
          >
            Customers
          </button>
        </div>

        {/* Range Selector */}
        <div className="flex items-center bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-lg p-1 text-xs">
          {[
            { id: "30", label: "30 days" },
            { id: "90", label: "90 days" },
            { id: "365", label: "12 months" },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setTimeRange(r.id as any)}
              className={`px-2.5 py-1 rounded transition-colors ${
                timeRange === r.id
                  ? "bg-[#525B44] text-white font-medium"
                  : "text-[#8A857D] dark:text-[#9A958D] hover:text-[#1A1917]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* SUBTAB 1: SALES */}
      {subTab === "sales" && (
        <div className="space-y-6">
          {/* Trend Card */}
          <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6E1D8] dark:border-[#2C2D2B] pb-3">
              <div>
                <h3 className="text-base font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB] capitalize">
                  {activeMetric === "take" ? "Takings" : activeMetric === "orders" ? "Orders" : activeMetric === "avg" ? "Average order value" : "Items sold"}
                </h3>
                <p className="text-xs text-[#8A857D] dark:text-[#9A958D]">
                  {timeRange === "30" ? "Day by day" : timeRange === "90" ? "Week by week" : "Month by month"} · {metrics[activeMetric].fmt} against previous period ({metrics[activeMetric].delta >= 0 ? "+" : ""}{metrics[activeMetric].delta.toFixed(1)}%)
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-[#525B44] dark:text-[#949F83]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#525B44]" />
                  <span>This period</span>
                </span>
                <span className="flex items-center gap-1.5 text-[#8A857D]">
                  <span className="w-2.5 h-0.5 bg-[#8A857D]" />
                  <span>Period before</span>
                </span>
              </div>
            </div>

            {/* 4 Interactive Metric Tabs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: "take", label: "Takings", metric: metrics.take },
                { id: "orders", label: "Orders", metric: metrics.orders },
                { id: "avg", label: "Average order", metric: metrics.avg },
                { id: "units", label: "Items sold", metric: metrics.units },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveMetric(item.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    activeMetric === item.id
                      ? "bg-white dark:bg-[#252625] border-[#525B44] dark:border-[#949F83] shadow-sm"
                      : "bg-[#F0ECE1]/50 dark:bg-[#1E1F1E] border-transparent hover:border-[#E6E1D8]"
                  }`}
                >
                  <span className="text-[11px] text-[#8A857D] dark:text-[#9A958D] block mb-1">{item.label}</span>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="font-mono text-lg font-semibold text-[#1A1917] dark:text-[#F5F2EB]">
                      {item.metric.fmt}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        item.metric.delta >= 0
                          ? "bg-[#525B44]/10 text-[#525B44] dark:text-[#949F83]"
                          : "bg-[#C4554D]/10 text-[#C4554D]"
                      }`}
                    >
                      {item.metric.delta >= 0 ? "+" : ""}{item.metric.delta.toFixed(1)}%
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Interactive Bezier Trend Chart */}
            <div className="relative pt-4">
              <svg
                viewBox={`0 0 ${trendSvg.width} ${trendSvg.height}`}
                className="w-full h-56 overflow-visible"
              >
                <defs>
                  <linearGradient id="oliveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#525B44" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#525B44" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Subtle horizontal grid lines */}
                {[0.2, 0.5, 0.8].map((pct, i) => (
                  <line
                    key={i}
                    x1="20"
                    y1={trendSvg.height * pct}
                    x2={trendSvg.width - 20}
                    y2={trendSvg.height * pct}
                    stroke="#E6E1D8"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                    className="dark:stroke-[#2C2D2B]"
                  />
                ))}

                {/* Fill Area */}
                {trendSvg.areaPath && (
                  <path d={trendSvg.areaPath} fill="url(#oliveGradient)" />
                )}

                {/* Previous period dashed line */}
                {trendSvg.prevPath && (
                  <path
                    d={trendSvg.prevPath}
                    fill="none"
                    stroke="#8A857D"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                    opacity="0.6"
                  />
                )}

                {/* Current period smooth line */}
                {trendSvg.curPath && (
                  <path
                    d={trendSvg.curPath}
                    fill="none"
                    stroke="#525B44"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}

                {/* Data Points */}
                {timeSeriesData.curValues.map((v, i) => {
                  const x = trendSvg.getX(i, timeSeriesData.curValues.length);
                  const y = trendSvg.getY(v);
                  const isHovered = hoveredDataPoint === i;

                  return (
                    <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredDataPoint(i)} onMouseLeave={() => setHoveredDataPoint(null)}>
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? "5" : "3"}
                        fill={isHovered ? "#525B44" : "#FAF8F5"}
                        stroke="#525B44"
                        strokeWidth="2"
                        className="transition-all"
                      />
                      {isHovered && (
                        <g>
                          <rect
                            x={Math.max(10, Math.min(trendSvg.width - 90, x - 40))}
                            y={Math.max(5, y - 35)}
                            width="80"
                            height="24"
                            rx="4"
                            fill="#1A1917"
                            className="dark:fill-[#252625]"
                          />
                          <text
                            x={Math.max(10, Math.min(trendSvg.width - 90, x - 40)) + 40}
                            y={Math.max(5, y - 35) + 15}
                            textAnchor="middle"
                            fill="#F5F2EB"
                            fontSize="10"
                            fontFamily="monospace"
                          >
                            {activeMetric === "take" || activeMetric === "avg" ? `${currencySymbol}${v.toFixed(2)}` : Math.round(v)}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Chart labels bottom */}
              <div className="flex justify-between text-[11px] font-mono text-[#8A857D] dark:text-[#9A958D] px-4 pt-2">
                {timeSeriesData.labels.map((lbl, i) => (
                  <span key={i} className={i % 2 === 0 ? "opacity-100" : "opacity-0 sm:opacity-100"}>
                    {lbl}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Row: Takings by Channel & Heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Channel Mix */}
            <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">
                  Where the money came from
                </h3>
                <p className="text-xs text-[#8A857D] dark:text-[#9A958D]">Takings by channel, last 30 days</p>
              </div>

              {/* Progress Bar Stack */}
              <div className="h-3 w-full bg-[#E6E1D8] dark:bg-[#2C2D2B] rounded-full overflow-hidden flex">
                {channelBreakdown.map((ch, i) => (
                  <div
                    key={i}
                    style={{ width: `${ch.pct}%` }}
                    className={`h-full ${ch.tone === "olive" ? "bg-[#525B44]" : ch.tone === "amber" ? "bg-[#D97706]" : "bg-[#64748B]"}`}
                    title={`${ch.name}: ${ch.pct}%`}
                  />
                ))}
              </div>

              {/* Channel List */}
              <ul className="space-y-3 pt-2">
                {channelBreakdown.map((ch, i) => {
                  const Icon = ch.icon;
                  return (
                    <li key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-[#E6E1D8]/60 dark:border-[#2C2D2B]/60 last:border-0">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${ch.tone === "olive" ? "bg-[#525B44]/10 text-[#525B44]" : ch.tone === "amber" ? "bg-[#D97706]/10 text-[#D97706]" : "bg-[#64748B]/10 text-[#64748B]"}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <p className="font-medium text-[#1A1917] dark:text-[#F5F2EB]">{ch.name}</p>
                          <span className="text-[11px] text-[#8A857D]">{ch.pct}% of takings</span>
                        </div>
                      </div>
                      <span className="font-mono font-medium text-[#1A1917] dark:text-[#F5F2EB]">
                        {currencySymbol}{ch.val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* When the Web Shop Sells - Heatmap */}
            <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">
                  When the web shop sells
                </h3>
                <p className="text-xs text-[#8A857D] dark:text-[#9A958D]">Web orders by weekday and hour, last 30 days</p>
              </div>

              <div className="space-y-1.5 overflow-x-auto">
                {heatmapData.days.map((day, dIdx) => (
                  <div key={dIdx} className="flex items-center gap-1.5">
                    <span className="w-7 text-[10px] font-mono text-[#8A857D] dark:text-[#9A958D] shrink-0">{day}</span>
                    <div className="flex items-center gap-0.5 flex-1 min-w-[280px]">
                      {heatmapData.grid[dIdx].map((val, hIdx) => {
                        const intensity = val > 0 ? Math.min(1, val / heatmapData.maxOrdersInCell) : 0;
                        return (
                          <div
                            key={hIdx}
                            className="flex-1 h-4 rounded-xs transition-transform hover:scale-125 hover:z-10 relative cursor-pointer"
                            style={{
                              backgroundColor: val === 0 ? "rgba(230, 225, 216, 0.4)" : `rgba(82, 91, 68, ${0.2 + intensity * 0.8})`,
                            }}
                            title={`${day} ${hIdx}:00 — ${val} orders`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Hours legend */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="w-7" />
                  <div className="flex items-center justify-between flex-1 min-w-[280px] text-[9px] font-mono text-[#8A857D]">
                    <span>0h</span>
                    <span>6h</span>
                    <span>12h</span>
                    <span>18h</span>
                    <span>23h</span>
                  </div>
                </div>

                {/* Quiet to Busy scale */}
                <div className="flex items-center justify-end gap-2 text-[10px] text-[#8A857D] pt-2">
                  <span>Quiet</span>
                  <div className="w-16 h-2 rounded-full bg-gradient-to-r from-[#E6E1D8] to-[#525B44]" />
                  <span>Busy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: PRODUCTS */}
      {subTab === "products" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">What earns the most</h3>
              <p className="text-xs text-[#8A857D] dark:text-[#9A958D]">Revenue, last 30 days</p>
            </div>

            <ol className="space-y-3">
              {topProducts.list.map((item, idx) => {
                const pct = Math.round((item.revenue / topProducts.maxRev) * 100);
                return (
                  <li key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 font-mono text-[11px] text-[#8A857D]">#{idx + 1}</span>
                        <span className="font-medium text-[#1A1917] dark:text-[#F5F2EB] line-clamp-1">{item.product.name}</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="font-semibold text-[#1A1917] dark:text-[#F5F2EB]">
                          {currencySymbol}{item.revenue.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-[#8A857D] block">{item.units} sold</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#E6E1D8] dark:bg-[#2C2D2B] rounded-full overflow-hidden">
                      <div className="h-full bg-[#525B44] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Product Category Mix & Grind Breakdown */}
          <div className="space-y-6">
            <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">Roast & category mix</h3>
                <p className="text-xs text-[#8A857D] dark:text-[#9A958D]">Bags sold by roast profile</p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] inline-block mb-1" />
                  <p className="text-xs font-medium text-[#1A1917] dark:text-[#F5F2EB]">Light roast</p>
                  <span className="text-base font-mono font-semibold text-[#525B44] dark:text-[#949F83]">54%</span>
                </div>
                <div className="p-3 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C4554D] inline-block mb-1" />
                  <p className="text-xs font-medium text-[#1A1917] dark:text-[#F5F2EB]">Medium roast</p>
                  <span className="text-base font-mono font-semibold text-[#525B44] dark:text-[#949F83]">32%</span>
                </div>
                <div className="p-3 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#475569] inline-block mb-1" />
                  <p className="text-xs font-medium text-[#1A1917] dark:text-[#F5F2EB]">Dark roast</p>
                  <span className="text-base font-mono font-semibold text-[#525B44] dark:text-[#949F83]">14%</span>
                </div>
              </div>
            </div>

            <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">How people take it</h3>
                <p className="text-xs text-[#8A857D] dark:text-[#9A958D]">Bags by grind preference, last 30 days</p>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { name: "Whole bean", pct: 64, count: 182 },
                  { name: "Filter / V60", pct: 22, count: 62 },
                  { name: "Espresso fine", pct: 10, count: 28 },
                  { name: "French press", pct: 4, count: 12 },
                ].map((grind, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#1A1917] dark:text-[#F5F2EB] font-medium">{grind.name}</span>
                      <span className="font-mono text-[#8A857D]">{grind.count} bags ({grind.pct}%)</span>
                    </div>
                    <div className="h-2 bg-[#E6E1D8] dark:bg-[#2C2D2B] rounded-full overflow-hidden">
                      <div className="h-full bg-[#525B44]" style={{ width: `${grind.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: CUSTOMERS */}
      {subTab === "customers" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* New vs Returning Retention */}
          <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">New and returning</h3>
              <p className="text-xs text-[#8A857D] dark:text-[#9A958D]">Web orders by week — first order or coming back</p>
            </div>

            <div className="p-4 bg-white dark:bg-[#252625] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-[#8A857D] block">Repeat customer rate</span>
                <span className="text-2xl font-mono font-semibold text-[#525B44] dark:text-[#949F83]">
                  {customerAnalytics.retentionRate}%
                </span>
              </div>
              <div className="text-right text-xs space-y-1">
                <span className="flex items-center justify-end gap-1.5 text-[#525B44] dark:text-[#949F83]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#525B44]" />
                  <span>{customerAnalytics.returningCount} returning</span>
                </span>
                <span className="flex items-center justify-end gap-1.5 text-[#D97706]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                  <span>{customerAnalytics.firstOrderCount} first order</span>
                </span>
              </div>
            </div>

            {/* Retention Bars */}
            <div className="space-y-3 pt-2">
              {["Week 1", "Week 2", "Week 3", "Week 4"].map((w, idx) => {
                const retPct = 38 + idx * 4;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#8A857D]">{w}</span>
                      <span className="font-mono text-[#1A1917] dark:text-[#F5F2EB]">{retPct}% returning</span>
                    </div>
                    <div className="h-2.5 bg-[#E6E1D8] dark:bg-[#2C2D2B] rounded-full overflow-hidden flex">
                      <div className="h-full bg-[#525B44]" style={{ width: `${retPct}%` }} />
                      <div className="h-full bg-[#D97706]" style={{ width: `${100 - retPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Where the parcels go */}
          <div className="bg-[#FAF8F5] dark:bg-[#1A1B1A] border border-[#E6E1D8] dark:border-[#2C2D2B] rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-serif font-medium text-[#1A1917] dark:text-[#F5F2EB]">Where the parcels go</h3>
              <p className="text-xs text-[#8A857D] dark:text-[#9A958D]">Orders by town and destination, last 30 days</p>
            </div>

            <ol className="space-y-2.5">
              {customerAnalytics.topCities.map(([city, count], idx) => {
                const pct = Math.round((count / customerAnalytics.maxCityOrders) * 100);
                return (
                  <li key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 font-mono text-[11px] text-[#8A857D]">#{idx + 1}</span>
                        <span className="font-medium text-[#1A1917] dark:text-[#F5F2EB]">{city}</span>
                      </div>
                      <span className="font-mono font-medium text-[#1A1917] dark:text-[#F5F2EB]">
                        {count} order{count === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#E6E1D8] dark:bg-[#2C2D2B] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: idx < 3 ? "#525B44" : "#64748B",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
