"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  CalendarDays,
  Camera,
  Car,
  DollarSign,
  Gamepad2,
  GraduationCap,
  Heart,
  Home,
  Laptop,
  MessageSquare,
  Mic,
  Package,
  PawPrint,
  ShoppingBag,
  ShoppingCart,
  Tag,
  TrendingDown,
  TrendingUp,
  Utensils,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string | null;
  source: string;
  date: string;
  category_id: string | null;
  categories: { name: string; icon: string | null; type: string } | null;
};

type Period = {
  month: number;
  year: number;
};

type MetricTone = "positive" | "negative" | "neutral" | "blue";

type Metric = {
  label: string;
  value: number;
  previousValue: number | null;
  icon: typeof Wallet;
  tone: MetricTone;
  positiveWhen: "increase" | "decrease";
};

type CashflowPoint = {
  label: string;
  tooltipLabel: string;
  income: number;
  expense: number;
};

type CategoryBreakdownItem = {
  category: string;
  total: number;
  percentage: number;
};

const categoryIconMap: Record<string, typeof ShoppingCart> = {
  alimentacao: Utensils,
  transporte: Car,
  moradia: Home,
  saude: Heart,
  educacao: GraduationCap,
  lazer: Gamepad2,
  compras: ShoppingBag,
  pets: PawPrint,
  vestuario: ShoppingCart,
  servicos: Tag,
  salario: Briefcase,
  freelance: Laptop,
  investimentos: TrendingUp,
  vendas: Tag,
  comissao: DollarSign,
  outros: Package,
};

const categoryColorMap: Record<string, string> = {
  alimentacao: "#2070e0",
  transporte: "#0fa388",
  moradia: "#fcb900",
  saude: "#ed315d",
  educacao: "#6366f1",
  lazer: "#8b5cf6",
  compras: "#f97316",
  pets: "#ec4899",
  vestuario: "#a855f7",
  servicos: "#64748b",
  salario: "#0fa388",
  freelance: "#2070e0",
  investimentos: "#14b8a6",
  vendas: "#f59e0b",
  comissao: "#f59e0b",
};

const sourceIcons: Record<string, typeof MessageSquare> = {
  text: MessageSquare,
  image: Camera,
  audio: Mic,
  manual: DollarSign,
};

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });

const monthNames = Array.from({ length: 12 }, (_, index) => {
  const monthName = monthFormatter.format(new Date(2026, index, 1));
  return monthName.charAt(0).toUpperCase() + monthName.slice(1);
});

function normalizeCategory(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)}%`;
}

function formatPeriodLabel(period: Period | null): string {
  if (!period) return "Todo o período";
  return `${monthNames[period.month - 1]} ${period.year}`;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${date}T12:00:00`));
}

function getTransactionPeriod(transaction: Transaction): Period | null {
  const date = new Date(`${transaction.date}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

function getTransactionDate(transaction: Transaction): Date | null {
  const date = new Date(`${transaction.date}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSamePeriod(a: Period, b: Period): boolean {
  return a.month === b.month && a.year === b.year;
}

function getPreviousPeriod(period: Period): Period {
  if (period.month === 1) {
    return { month: 12, year: period.year - 1 };
  }
  return { month: period.month - 1, year: period.year };
}

function daysInMonth(period: Period): number {
  return new Date(period.year, period.month, 0).getDate();
}

function daysForAverage(period: Period | null, transactions: Transaction[], today: Date): number {
  if (!period) {
    const timestamps = transactions
      .map((transaction) => new Date(`${transaction.date}T12:00:00`).getTime())
      .filter((timestamp) => !Number.isNaN(timestamp));

    if (timestamps.length === 0) return 1;

    const first = Math.min(...timestamps);
    const last = Math.max(...timestamps);
    return Math.max(1, Math.floor((last - first) / 86400000) + 1);
  }

  const currentPeriod = { month: today.getMonth() + 1, year: today.getFullYear() };
  if (isSamePeriod(period, currentPeriod)) {
    return today.getDate();
  }

  return daysInMonth(period);
}

function sumTransactions(transactions: Transaction[], type: "income" | "expense"): number {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
}

function sumSalary(transactions: Transaction[]): number {
  return transactions
    .filter((transaction) => transaction.type === "income" && normalizeCategory(transaction.categories?.name ?? "") === "salario")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
}

function filterByPeriod(transactions: Transaction[], period: Period | null): Transaction[] {
  if (!period) return transactions;

  return transactions.filter((transaction) => {
    const transactionPeriod = getTransactionPeriod(transaction);
    return transactionPeriod ? isSamePeriod(transactionPeriod, period) : false;
  });
}

function buildCashflowData(transactions: Transaction[], period: Period | null): CashflowPoint[] {
  if (period) {
    const days = daysInMonth(period);
    const points = Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      return {
        label: String(day),
        tooltipLabel: `${String(day).padStart(2, "0")}/${String(period.month).padStart(2, "0")}`,
        income: 0,
        expense: 0,
      };
    });
    const relevantDays = new Set<number>();

    for (const transaction of transactions) {
      const date = getTransactionDate(transaction);
      if (!date) continue;

      relevantDays.add(date.getDate());
      const point = points[date.getDate() - 1];
      if (transaction.type === "income") {
        point.income += Number(transaction.amount);
      } else {
        point.expense += Number(transaction.amount);
      }
    }

    if (relevantDays.size > 0 && relevantDays.size <= 14) {
      return points.filter((point) => point.income > 0 || point.expense > 0);
    }

    return points;
  }

  const points = new Map<string, CashflowPoint>();

  for (const transaction of transactions) {
    const date = getTransactionDate(transaction);
    if (!date) continue;

    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const current = points.get(key) ?? {
      label: monthNames[month - 1].slice(0, 3),
      tooltipLabel: `${monthNames[month - 1]} ${year}`,
      income: 0,
      expense: 0,
    };

    if (transaction.type === "income") {
      current.income += Number(transaction.amount);
    } else {
      current.expense += Number(transaction.amount);
    }

    points.set(key, current);
  }

  return Array.from(points.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, point]) => point);
}

function compactCategoryBreakdown(items: CategoryBreakdownItem[]): CategoryBreakdownItem[] {
  if (items.length <= 6) return items;

  const total = items.reduce((sum, item) => sum + item.total, 0);
  const visible = items.slice(0, 5);
  const restTotal = items.slice(5).reduce((sum, item) => sum + item.total, 0);

  if (restTotal <= 0) return visible;

  const otherIndex = visible.findIndex((item) => normalizeCategory(item.category) === "outros");
  if (otherIndex >= 0) {
    return visible.map((item, index) => {
      if (index !== otherIndex) return item;
      const nextTotal = item.total + restTotal;
      return {
        ...item,
        total: nextTotal,
        percentage: total > 0 ? (nextTotal / total) * 100 : 0,
      };
    });
  }

  return [
    ...visible,
    {
      category: "Outros",
      total: restTotal,
      percentage: total > 0 ? (restTotal / total) * 100 : 0,
    },
  ];
}

function getVariation(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function isPositiveVariation(variation: number, positiveWhen: Metric["positiveWhen"]): boolean {
  return positiveWhen === "increase" ? variation > 0 : variation < 0;
}

function getMetricAccent(tone: MetricTone, value: number) {
  if (tone === "neutral") {
    return value >= 0
      ? { iconBg: "bg-income/10", iconText: "text-income", valueText: "text-income" }
      : { iconBg: "bg-expense/10", iconText: "text-expense", valueText: "text-expense" };
  }

  const toneClasses: Record<Exclude<MetricTone, "neutral">, { iconBg: string; iconText: string; valueText: string }> = {
    positive: { iconBg: "bg-income/10", iconText: "text-income", valueText: "text-income" },
    negative: { iconBg: "bg-expense/10", iconText: "text-expense", valueText: "text-expense" },
    blue: { iconBg: "bg-primary/10", iconText: "text-primary", valueText: "text-foreground" },
  };

  return toneClasses[tone];
}

function MetricCard({ metric, delay }: { metric: Metric; delay: string }) {
  const variation = getVariation(metric.value, metric.previousValue);
  const Icon = metric.icon;
  const accent = getMetricAccent(metric.tone, metric.value);
  const isPositive = variation !== null ? isPositiveVariation(variation, metric.positiveWhen) : false;
  const VariationIcon = variation !== null && variation >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <Card
      className="overflow-hidden border-border/50 shadow-card hover:shadow-card-hover transition-shadow duration-300 group opacity-0 animate-fade-in"
      style={{ animationDelay: delay }}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-muted-foreground">{metric.label}</p>
            <p className={cn("mt-3 whitespace-nowrap text-xl font-extrabold font-mono leading-tight tracking-tight sm:text-2xl lg:text-xl 2xl:text-2xl", accent.valueText)}>
              {formatCurrency(metric.value)}
            </p>
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110", accent.iconBg)}>
            <Icon className={cn("h-5 w-5", accent.iconText)} />
          </div>
        </div>

        {variation !== null && (
          <div
            className={cn(
              "mt-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
              isPositive ? "bg-income/10 text-income" : "bg-expense/10 text-expense"
            )}
          >
            <VariationIcon className="h-3.5 w-3.5" />
            {formatPercent(variation)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CashflowChart({ data }: { data: CashflowPoint[] }) {
  const maxValue = Math.max(...data.map((point) => Math.max(point.income, point.expense)), 0);
  const hasData = data.some((point) => point.income > 0 || point.expense > 0);
  const mobileData = data.filter((point) => point.income > 0 || point.expense > 0);

  if (!hasData) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center">
        <TrendingUp className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Sem dados para o período</p>
        <p className="mt-1 text-xs text-muted-foreground">As receitas e despesas aparecem aqui quando houver lançamentos.</p>
      </div>
    );
  }

  const width = 720;
  const height = 220;
  const paddingLeft = 42;
  const paddingRight = 12;
  const chartTop = 14;
  const chartHeight = 148;
  const baseline = chartTop + chartHeight;
  const chartWidth = width - paddingLeft - paddingRight;
  const groupWidth = chartWidth / data.length;
  const barWidth = Math.max(5, Math.min(18, groupWidth * 0.36));
  const gridLines = [0.25, 0.5, 0.75, 1];

  return (
    <>
      <div className="space-y-3 sm:hidden">
        {mobileData.map((point) => {
          const incomeWidth = maxValue > 0 ? Math.max(4, (point.income / maxValue) * 100) : 0;
          const expenseWidth = maxValue > 0 ? Math.max(4, (point.expense / maxValue) * 100) : 0;

          return (
            <div key={point.tooltipLabel} className="rounded-xl border border-border/60 bg-background p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-foreground">{point.tooltipLabel}</p>
                <div className="text-right text-xs font-semibold text-muted-foreground">
                  <p className="text-income">{formatCurrency(point.income)}</p>
                  <p className="text-expense">{formatCurrency(point.expense)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                    <span>Receitas</span>
                    <span>{formatCurrency(point.income)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-2.5 rounded-full bg-[#0fa388]" style={{ width: `${incomeWidth}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                    <span>Despesas</span>
                    <span>{formatCurrency(point.expense)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-2.5 rounded-full bg-[#ed315d]" style={{ width: `${expenseWidth}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden w-full overflow-hidden sm:block">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de receitas e despesas" className="h-56 w-full">
        {gridLines.map((ratio) => {
          const y = baseline - chartHeight * ratio;
          const value = maxValue * ratio;

          return (
            <g key={ratio}>
              <line x1={paddingLeft} x2={width - paddingRight} y1={y} y2={y} stroke="hsl(var(--border))" strokeDasharray="4 6" />
              <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="fill-muted-foreground text-[10px] font-semibold">
                {formatCompactCurrency(value)}
              </text>
            </g>
          );
        })}

        <line x1={paddingLeft} x2={width - paddingRight} y1={baseline} y2={baseline} stroke="hsl(var(--border))" />

        {data.map((point, index) => {
          const center = paddingLeft + index * groupWidth + groupWidth / 2;
          const incomeHeight = maxValue > 0 ? (point.income / maxValue) * chartHeight : 0;
          const expenseHeight = maxValue > 0 ? (point.expense / maxValue) * chartHeight : 0;
          const showLabel = data.length <= 12 || index === 0 || index === data.length - 1 || (index + 1) % 5 === 0;

          return (
            <g key={`${point.tooltipLabel}-${index}`}>
              <rect
                x={center - barWidth - 2}
                y={baseline - incomeHeight}
                width={barWidth}
                height={incomeHeight}
                rx={3}
                fill="#0fa388"
              >
                <title>{`${point.tooltipLabel} - Receitas: ${formatCurrency(point.income)}`}</title>
              </rect>
              <rect
                x={center + 2}
                y={baseline - expenseHeight}
                width={barWidth}
                height={expenseHeight}
                rx={3}
                fill="#ed315d"
              >
                <title>{`${point.tooltipLabel} - Despesas: ${formatCurrency(point.expense)}`}</title>
              </rect>
              {showLabel && (
                <text x={center} y={baseline + 17} textAnchor="middle" className="fill-muted-foreground text-[10px] font-semibold">
                  {point.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
    </>
  );
}

export function DashboardHome({ transactions }: { transactions: Transaction[] }) {
  const today = useMemo(() => new Date(), []);
  const currentPeriod = useMemo(() => ({ month: today.getMonth() + 1, year: today.getFullYear() }), [today]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(currentPeriod);

  const availablePeriods = useMemo(() => {
    const periods = new Map<string, Period>();

    for (const transaction of transactions) {
      const period = getTransactionPeriod(transaction);
      if (period) periods.set(`${period.year}-${period.month}`, period);
    }

    periods.set(`${currentPeriod.year}-${currentPeriod.month}`, currentPeriod);

    return Array.from(periods.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [currentPeriod, transactions]);

  const yearOptions = useMemo(
    () => Array.from(new Set(availablePeriods.map((period) => period.year))).sort((a, b) => b - a),
    [availablePeriods]
  );

  const selectedControlYear = selectedPeriod?.year ?? currentPeriod.year;
  const selectedControlMonth = selectedPeriod?.month ?? currentPeriod.month;

  const monthOptions = useMemo(() => {
    const months = availablePeriods
      .filter((period) => period.year === selectedControlYear)
      .map((period) => period.month);
    const uniqueMonths = Array.from(new Set(months));

    if (uniqueMonths.length === 0) return [currentPeriod.month];
    return uniqueMonths.sort((a, b) => a - b);
  }, [availablePeriods, currentPeriod.month, selectedControlYear]);

  const filteredTransactions = useMemo(
    () => filterByPeriod(transactions, selectedPeriod),
    [selectedPeriod, transactions]
  );

  const previousPeriod = selectedPeriod ? getPreviousPeriod(selectedPeriod) : null;
  const previousTransactions = useMemo(
    () => filterByPeriod(transactions, previousPeriod),
    [previousPeriod, transactions]
  );

  const totalIncome = sumTransactions(filteredTransactions, "income");
  const totalExpenses = sumTransactions(filteredTransactions, "expense");
  const balance = totalIncome - totalExpenses;
  const salary = sumSalary(filteredTransactions);
  const dailyAverage = totalExpenses / daysForAverage(selectedPeriod, filteredTransactions, today);

  const previousIncome = selectedPeriod ? sumTransactions(previousTransactions, "income") : null;
  const previousExpenses = selectedPeriod ? sumTransactions(previousTransactions, "expense") : null;
  const previousBalance = selectedPeriod && previousTransactions.length > 0 ? (previousIncome ?? 0) - (previousExpenses ?? 0) : null;
  const previousSalary = selectedPeriod ? sumSalary(previousTransactions) : null;
  const previousDailyAverage =
    selectedPeriod && previousExpenses !== null
      ? previousExpenses / daysForAverage(previousPeriod, previousTransactions, today)
      : null;

  const metrics: Metric[] = [
    {
      label: "Saldo",
      value: balance,
      previousValue: previousBalance,
      icon: Wallet,
      tone: "neutral",
      positiveWhen: "increase",
    },
    {
      label: "Salário",
      value: salary,
      previousValue: previousSalary,
      icon: Briefcase,
      tone: "positive",
      positiveWhen: "increase",
    },
    {
      label: "Receita total",
      value: totalIncome,
      previousValue: previousIncome,
      icon: TrendingUp,
      tone: "positive",
      positiveWhen: "increase",
    },
    {
      label: "Despesa total",
      value: totalExpenses,
      previousValue: previousExpenses,
      icon: TrendingDown,
      tone: "negative",
      positiveWhen: "decrease",
    },
    {
      label: "Média diária",
      value: dailyAverage,
      previousValue: previousDailyAverage,
      icon: CalendarDays,
      tone: "blue",
      positiveWhen: "decrease",
    },
  ];

  const categoryBreakdown = useMemo(() => {
    const expenses = filteredTransactions.filter((transaction) => transaction.type === "expense");
    const total = expenses.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const categoryTotals = new Map<string, number>();

    for (const transaction of expenses) {
      const category = transaction.categories?.name ?? "Outros";
      categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + Number(transaction.amount));
    }

    return Array.from(categoryTotals.entries())
      .map(([category, categoryTotal]) => ({
        category,
        total: categoryTotal,
        percentage: total > 0 ? (categoryTotal / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  const cashflowData = useMemo(
    () => buildCashflowData(filteredTransactions, selectedPeriod),
    [filteredTransactions, selectedPeriod]
  );
  const displayCategoryBreakdown = useMemo(
    () => compactCategoryBreakdown(categoryBreakdown),
    [categoryBreakdown]
  );
  const categoryMaxTotal = Math.max(...displayCategoryBreakdown.map((item) => item.total), 0);
  const recentTransactions = filteredTransactions.slice(0, 10);

  function handleYearChange(year: number) {
    const firstMonthForYear = availablePeriods.find((period) => period.year === year)?.month ?? currentPeriod.month;
    const monthForYear = availablePeriods.some((period) => period.year === year && period.month === selectedControlMonth)
      ? selectedControlMonth
      : firstMonthForYear;

    setSelectedPeriod({ month: monthForYear, year });
  }

  return (
    <>
      <div className="flex flex-col gap-4 opacity-0 animate-fade-in md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#0fa388]">Visão geral</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            Dashboard financeiro
          </h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {formatPeriodLabel(selectedPeriod)}
          </p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground/80">
            {selectedPeriod ? "Filtrando pelo mês selecionado." : "Mostrando todos os meses e anos registrados."}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            aria-label="Selecionar mês"
            value={selectedControlMonth}
            onChange={(event) => setSelectedPeriod({ month: Number(event.target.value), year: selectedControlYear })}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition-colors focus:border-[#0fa388] focus:ring-2 focus:ring-[#0fa388]/20"
          >
            {monthOptions.map((month) => (
              <option key={month} value={month}>
                {monthNames[month - 1]}
              </option>
            ))}
          </select>

          <select
            aria-label="Selecionar ano"
            value={selectedControlYear}
            onChange={(event) => handleYearChange(Number(event.target.value))}
            className="h-10 rounded-md border border-border bg-background px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition-colors focus:border-[#0fa388] focus:ring-2 focus:ring-[#0fa388]/20"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant={selectedPeriod === null ? "default" : "outline"}
            className={cn(
              "h-10 shadow-sm",
              selectedPeriod === null
                ? "bg-[#0fa388] text-white hover:bg-[#0b876f]"
                : "border-[#0fa388]/30 text-[#0f7667] hover:bg-[#0fa388]/10 hover:text-[#0f7667]"
            )}
            onClick={() => setSelectedPeriod(null)}
          >
            Visão Geral
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {metrics.map((metric, index) => (
          <MetricCard key={metric.label} metric={metric} delay={`${(index + 1) * 70}ms`} />
        ))}
      </div>

      <Card className="shadow-card border-border/50 opacity-0 animate-fade-in" style={{ animationDelay: "400ms" }}>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wide">
                Receitas x Despesas
              </CardTitle>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {selectedPeriod ? "Agrupado por dia" : "Agrupado por mês"}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#0fa388]" />
                Receitas
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ed315d]" />
                Despesas
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 sm:px-6">
          <CashflowChart data={cashflowData} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-card border-border/50 opacity-0 animate-fade-in" style={{ animationDelay: "420ms" }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wide">
              Despesas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {displayCategoryBreakdown.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-medium">Nenhuma despesa neste período</p>
              </div>
            ) : (
              <>
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Total em despesas</p>
                  <p className="mt-1 text-2xl font-extrabold font-mono text-expense">{formatCurrency(totalExpenses)}</p>
                </div>

                <div className="space-y-4">
                  {displayCategoryBreakdown.map((categoryItem, index) => {
                    const categoryKey = normalizeCategory(categoryItem.category);
                    const Icon = categoryIconMap[categoryKey] ?? Package;
                    const color = categoryColorMap[categoryKey] ?? "#6b7280";
                    const width = categoryMaxTotal > 0 ? (categoryItem.total / categoryMaxTotal) * 100 : 0;

                    return (
                      <div key={`${categoryItem.category}-${index}`} className="group/cat">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2.5">
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover/cat:scale-110"
                              style={{ backgroundColor: `${color}15` }}
                            >
                              <Icon className="h-4 w-4" style={{ color }} />
                            </div>
                            <span className="truncate text-sm font-semibold text-foreground">{categoryItem.category}</span>
                          </span>
                          <div className="shrink-0 text-right">
                            <span className="block text-sm font-bold font-mono text-foreground">{formatCurrency(categoryItem.total)}</span>
                            <span className="text-[10px] font-semibold text-muted-foreground">{categoryItem.percentage.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-2.5 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${width}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50 lg:col-span-2 opacity-0 animate-fade-in" style={{ animationDelay: "480ms" }}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wide">
                Últimas Transações
              </CardTitle>
              <Link href="/transactions" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                Ver todas
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-medium">Nenhuma transação neste período</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {recentTransactions.map((transaction, index) => {
                  const categoryName = transaction.categories?.name ?? "Outros";
                  const categoryKey = normalizeCategory(categoryName);
                  const CategoryIcon = categoryIconMap[categoryKey] ?? Package;
                  const color = categoryColorMap[categoryKey] ?? "#6b7280";
                  const SourceIcon = sourceIcons[transaction.source] ?? MessageSquare;

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-all duration-200 opacity-0 animate-fade-in"
                      style={{ animationDelay: `${(index + 6) * 40}ms` }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${color}12` }}
                      >
                        <CategoryIcon className="w-[18px] h-[18px]" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {transaction.description ?? "Sem descrição"}
                          </p>
                          <div className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center bg-muted">
                            <SourceIcon className="w-2.5 h-2.5 text-muted-foreground" />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                          {formatDate(transaction.date)} &middot; {categoryName}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {transaction.type === "income" ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-income" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5 text-expense" />
                        )}
                        <p className={cn("text-sm font-bold font-mono", transaction.type === "income" ? "text-income" : "text-expense")}>
                          {formatCurrency(Number(transaction.amount))}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
