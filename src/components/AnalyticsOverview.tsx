import { useState, useMemo } from "react";
import { FileText, Printer, TrendingUp, TrendingDown } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  TooltipProps,
} from "recharts";
import { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { TooltipContentProps } from 'recharts';

/* ─── Types ───────────────────────────────────────────────────────────────── */
export interface Booking {
  date?: string;
  createdAt?: string;
  bookingDate?: string;
  checkIn?: string;
  startDate?: string;
  totalAmount?: number | string;
  total?: number | string;
  amount?: number | string;
  price?: number | string;
  cost?: number | string;
  [key: string]: unknown;
}

export interface AnalyticsOverviewProps {
  bookings?: Booking[];
  totalRevenue?: number;
  pendingRevenue?: number;
  cancelledRevenue?: number;
  totalAdultsServed?: number;
  totalChildrenServed?: number;
  activityCounts?: Record<string, number>;
  cottageCounts?: Record<string, number>;
  handleExportReservationsCSV?: () => void;
}

interface MonthData {
  month: string;
  sales: number;
  bookingCount: number;
  trend: number;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getAmount(b: Booking): number {
  const v = b.totalAmount ?? b.total ?? b.amount ?? b.price ?? b.cost ?? 0;
  return parseFloat(String(v)) || 0;
}

function getDate(b: Booking): Date {
  const d = b.date ?? b.createdAt ?? b.bookingDate ?? b.checkIn ?? b.startDate ?? "";
  return new Date(d as string);
}

function fmt(n: number, short = false): string {
  if (short) {
    if (n >= 1_000_000) return "₱" + (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000)     return "₱" + (n / 1_000).toFixed(0) + "k";
    return "₱" + Math.round(n);
  }
  return "₱" + Math.round(n).toLocaleString();
}

/* ─── Custom Tooltip ──────────────────────────────────────────────────────── */
function ChartTooltip({
    active,
    payload,
    label,
  }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-stone-200 rounded shadow-md px-3 py-2 text-xs">
      <p className="font-bold text-[#1B3022] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name as string} style={{ color: p.color }} className="font-mono">
          {p.name === "trend" ? "Trend" : "Sales"}: {fmt(Number(p.value))}
        </p>
      ))}
    </div>
  );
}

/* ─── Metric Card ─────────────────────────────────────────────────────────── */
interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  labelColor?: string;
  valueColor?: string;
}

function MetricCard({ label, value, sub, labelColor = "text-[#A67C52]", valueColor = "text-[#1B3022]" }: MetricCardProps) {
  return (
    <div className="bg-white border border-stone-200 p-6 rounded shadow-sm flex flex-col justify-between">
      <div>
        <span className={`text-[10px] font-bold ${labelColor} uppercase tracking-wider block`}>{label}</span>
        <h3 className={`text-3xl font-serif ${valueColor} font-black mt-1`}>{value}</h3>
      </div>
      <span className="text-[10px] text-gray-400 mt-4 block">{sub}</span>
    </div>
  );
}

/* ─── Sales Chart ─────────────────────────────────────────────────────────── */
function SalesChart({ bookings }: { bookings: Booking[] }) {
  const years = useMemo<number[]>(() => {
    const ys = [...new Set(bookings.map((b) => getDate(b).getFullYear()).filter((y) => !isNaN(y)))];
    return ys.sort((a, b) => b - a);
  }, [bookings]);

  const [selectedYear, setSelectedYear] = useState<number>(years[0] ?? new Date().getFullYear());

  const chartData = useMemo<MonthData[]>(() => {
    const monthly: MonthData[] = MONTHS.map((m) => ({ month: m, sales: 0, bookingCount: 0, trend: 0 }));
    bookings.forEach((b) => {
      const d = getDate(b);
      if (d.getFullYear() === selectedYear) {
        const m = d.getMonth();
        if (m >= 0 && m < 12) {
          monthly[m].sales += getAmount(b);
          monthly[m].bookingCount++;
        }
      }
    });
    monthly.forEach((m) => { m.sales = Math.round(m.sales); m.trend = m.sales; });
    return monthly;
  }, [bookings, selectedYear]);

  const totalRevenue  = chartData.reduce((a, m) => a + m.sales, 0);
  const bestMonth     = chartData.reduce((best, m) => m.sales > best.sales ? m : best, chartData[0]);
  const activeMths    = chartData.filter((m) => m.sales > 0).length || 1;
  const avgMonthly    = totalRevenue / activeMths;
  const totalBookings = chartData.reduce((a, m) => a + m.bookingCount, 0);

  const prevYearIdx = years.indexOf(selectedYear) + 1;
  const prevYear    = years[prevYearIdx];
  const prevRevenue = prevYear
    ? bookings.filter((b) => getDate(b).getFullYear() === prevYear).reduce((a, b) => a + getAmount(b), 0)
    : null;
  const delta  = prevRevenue ? ((totalRevenue - prevRevenue) / prevRevenue * 100).toFixed(1) : null;
  const deltaUp = delta !== null && parseFloat(delta) >= 0;

  const miniMetrics = [
    { label: "Total revenue", value: fmt(totalRevenue, true),          sub: `in ${selectedYear}` },
    { label: "Best month",    value: fmt(bestMonth?.sales ?? 0, true), sub: bestMonth?.month ?? "—" },
    { label: "Avg / month",   value: fmt(avgMonthly, true),            sub: "active months" },
    { label: "Bookings",      value: totalBookings.toLocaleString(),   sub: `in ${selectedYear}` },
  ];

  return (
    <div className="bg-white border border-stone-200 p-6 rounded shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <h4 className="font-serif text-base font-bold">Total Sales</h4>
          <p className="text-[11px] text-gray-400">Monthly revenue from confirmed bookings</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {delta !== null && (
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
              deltaUp ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}>
              {deltaUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {deltaUp ? "+" : ""}{delta}% vs {prevYear}
            </span>
          )}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-xs px-3 py-1.5 rounded border border-stone-200 bg-stone-50 text-stone-700 cursor-pointer"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Mini metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {miniMetrics.map(({ label, value, sub }) => (
          <div key={label} className="bg-stone-50 rounded p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5">{label}</p>
            <p className="text-lg font-serif font-black text-[#1B3022]">{value}</p>
            <p className="text-[10px] text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#1B3022] inline-block" />
          Monthly sales
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-[#A67C52] inline-block rounded" />
          Trend line
        </span>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => fmt(v, true)}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(27,48,34,0.04)" }} />
          <Bar dataKey="sales" name="sales" fill="#1B3022" radius={[3, 3, 0, 0]} maxBarSize={36} />
          <Line
            type="monotone"
            dataKey="trend"
            name="trend"
            stroke="#A67C52"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "#A67C52", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 1 — ANALYTICS OVERVIEW
═══════════════════════════════════════════════════════════════════════════ */
export default function AnalyticsOverview({
  bookings = [],
  totalRevenue = 0,
  pendingRevenue = 0,
  cancelledRevenue = 0,
  totalAdultsServed = 0,
  totalChildrenServed = 0,
  activityCounts = {},
  cottageCounts = {},
  handleExportReservationsCSV = () => {},
}: AnalyticsOverviewProps) {
  return (
    <div className="space-y-8">

      {/* Financial Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="Total Revenue"
          value={`₱${totalRevenue.toLocaleString()}`}
          sub="Total revenue from all bookings"
          labelColor="text-[#A67C52]"
          valueColor="text-[#1B3022]"
        />
        <MetricCard
          label="Pending Payments"
          value={`₱${pendingRevenue.toLocaleString()}`}
          sub="Total pending payments"
          labelColor="text-amber-700"
          valueColor="text-amber-700"
        />
        <MetricCard
          label="Refunded Payments"
          value={`₱${cancelledRevenue.toLocaleString()}`}
          sub="Total refunded payments"
          labelColor="text-red-700"
          valueColor="text-red-800"
        />
        <MetricCard
          label="Total Bookings"
          value={(totalAdultsServed + totalChildrenServed).toLocaleString()}
          sub="Total bookings made"
          labelColor="text-emerald-800"
          valueColor="text-[#1B3022]"
        />
      </div>

      {/* Export Deck */}
      <div className="bg-stone-50 border border-dashed border-[#1B3022]/15 p-6 rounded flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h4 className="font-serif text-lg font-bold">Bookings Export Deck</h4>
          <p className="text-xs text-gray-500 mt-0.5">Export bookings data to Excel or CSV format.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExportReservationsCSV}
            className="px-4 py-2.5 bg-[#1B3022] hover:bg-[#A67C52] text-white text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <FileText className="h-4 w-4" />
            <span>Export Excel / CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-white border border-[#1B3022]/15 hover:bg-stone-50 text-stone-700 text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print (PDF)</span>
          </button>
        </div>
      </div>

      {/* Sales Chart */}
      <SalesChart bookings={bookings} />

      {/* Allocation Diagrams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">


      </div>
    </div>
  );
}