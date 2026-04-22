"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Utensils,
  Car,
  Home,
  Heart,
  Gamepad2,
  ShoppingBag,
  ShoppingCart,
  GraduationCap,
  PawPrint,
  Briefcase,
  Laptop,
  Tag,
  Package,
  BarChart3,
  Minus,
} from "lucide-react";
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

function normalizeCategory(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

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
  comissao: Package,
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function calcChange(current: number, previous: number): { value: number; label: string } {
  if (previous === 0) return { value: 0, label: "—" };
  const change = ((current - previous) / previous) * 100;
  return { value: change, label: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%` };
}

export function ReportsView({
  currentTransactions,
  prevTransactions,
  monthLabel,
  prevMonthLabel,
}: {
  currentTransactions: Transaction[];
  prevTransactions: Transaction[];
  monthLabel: string;
  prevMonthLabel: string;
}) {
  const currIncome = currentTransactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const currExpense = currentTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const currBalance = currIncome - currExpense;

  const prevIncome = prevTransactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const prevExpense = prevTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const prevBalance = prevIncome - prevExpense;

  const incomeChange = calcChange(currIncome, prevIncome);
  const expenseChange = calcChange(currExpense, prevExpense);
  const balanceChange = calcChange(currBalance, prevBalance);

  // Category breakdown for current month
  const categoryBreakdown = (() => {
    const expenses = currentTransactions.filter((t) => t.type === "expense");
    const total = expenses.reduce((s, t) => s + Number(t.amount), 0);
    const map = new Map<string, number>();
    for (const t of expenses) {
      const cat = t.categories?.name ?? "Outros";
      map.set(cat, (map.get(cat) ?? 0) + Number(t.amount));
    }
    return Array.from(map.entries())
      .map(([category, catTotal]) => ({
        category,
        total: catTotal,
        percentage: total > 0 ? (catTotal / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  })();

  // Daily spending for current month
  const dailySpending = (() => {
    const expenses = currentTransactions.filter((t) => t.type === "expense");
    const map = new Map<string, number>();
    for (const t of expenses) {
      map.set(t.date, (map.get(t.date) ?? 0) + Number(t.amount));
    }
    return Array.from(map.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));
  })();

  const maxDaily = Math.max(...dailySpending.map((d) => d.total), 1);

  return (
    <>
      {/* Month comparison summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-card border-border/50 opacity-0 animate-fade-in">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-muted-foreground mb-1">Receitas</p>
            <p className="text-xl font-extrabold text-foreground font-mono">{formatCurrency(currIncome)}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className={cn("flex items-center gap-0.5 text-xs font-semibold", incomeChange.value >= 0 ? "text-income" : "text-expense")}>
                {incomeChange.value >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {incomeChange.label}
              </div>
              <span className="text-xs text-muted-foreground">vs. {prevMonthLabel}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50 opacity-0 animate-fade-in" style={{ animationDelay: "60ms" }}>
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-muted-foreground mb-1">Despesas</p>
            <p className="text-xl font-extrabold text-foreground font-mono">{formatCurrency(currExpense)}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className={cn("flex items-center gap-0.5 text-xs font-semibold", expenseChange.value <= 0 ? "text-income" : "text-expense")}>
                {expenseChange.value <= 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                {expenseChange.label}
              </div>
              <span className="text-xs text-muted-foreground">vs. {prevMonthLabel}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50 opacity-0 animate-fade-in" style={{ animationDelay: "120ms" }}>
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-muted-foreground mb-1">Saldo</p>
            <p className={cn("text-xl font-extrabold font-mono", currBalance >= 0 ? "text-income" : "text-expense")}>
              {formatCurrency(currBalance)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className={cn("flex items-center gap-0.5 text-xs font-semibold", balanceChange.value >= 0 ? "text-income" : "text-expense")}>
                {balanceChange.value === 0 ? <Minus className="w-3 h-3" /> : balanceChange.value >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {balanceChange.label}
              </div>
              <span className="text-xs text-muted-foreground">vs. {prevMonthLabel}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Previous month comparison */}
      <Card className="shadow-card border-border/50 opacity-0 animate-fade-in" style={{ animationDelay: "180ms" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Comparativo: {monthLabel} vs {prevMonthLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Receitas</p>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{monthLabel}</span>
                    <span className="font-bold font-mono">{formatCurrency(currIncome)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div className="h-2.5 rounded-full bg-income transition-all duration-500" style={{ width: `${Math.max(currIncome, prevIncome) > 0 ? (currIncome / Math.max(currIncome, prevIncome)) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-muted-foreground">{prevMonthLabel}</span>
                    <span className="font-bold font-mono text-muted-foreground">{formatCurrency(prevIncome)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div className="h-2.5 rounded-full bg-income/40 transition-all duration-500" style={{ width: `${Math.max(currIncome, prevIncome) > 0 ? (prevIncome / Math.max(currIncome, prevIncome)) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Despesas</p>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{monthLabel}</span>
                    <span className="font-bold font-mono">{formatCurrency(currExpense)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div className="h-2.5 rounded-full bg-expense transition-all duration-500" style={{ width: `${Math.max(currExpense, prevExpense) > 0 ? (currExpense / Math.max(currExpense, prevExpense)) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-muted-foreground">{prevMonthLabel}</span>
                    <span className="font-bold font-mono text-muted-foreground">{formatCurrency(prevExpense)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div className="h-2.5 rounded-full bg-expense/40 transition-all duration-500" style={{ width: `${Math.max(currExpense, prevExpense) > 0 ? (prevExpense / Math.max(currExpense, prevExpense)) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Saldo</p>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{monthLabel}</span>
                    <span className={cn("font-bold font-mono", currBalance >= 0 ? "text-income" : "text-expense")}>{formatCurrency(currBalance)}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-muted-foreground">{prevMonthLabel}</span>
                    <span className={cn("font-bold font-mono", prevBalance >= 0 ? "text-income/60" : "text-expense/60")}>{formatCurrency(prevBalance)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <Card className="shadow-card border-border/50 opacity-0 animate-fade-in" style={{ animationDelay: "240ms" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wide">
              Despesas por Categoria — {monthLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryBreakdown.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-medium">Nenhuma despesa neste periodo</p>
              </div>
            ) : (
              categoryBreakdown.map((cat, i) => {
                const catKey = normalizeCategory(cat.category);
                const Icon = categoryIconMap[catKey] ?? Package;
                const color = categoryColorMap[catKey] ?? "#6b7280";
                return (
                  <div key={cat.category} className="opacity-0 animate-fade-in" style={{ animationDelay: `${(i + 4) * 40}ms` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                          <Icon className="w-3.5 h-3.5" style={{ color }} />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{cat.category}</span>
                      </span>
                      <div className="text-right">
                        <span className="text-sm font-bold font-mono">{formatCurrency(cat.total)}</span>
                        <span className="text-[10px] text-muted-foreground ml-1 font-semibold">{cat.percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${cat.percentage}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Daily spending chart */}
        <Card className="shadow-card border-border/50 opacity-0 animate-fade-in" style={{ animationDelay: "300ms" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wide">
              Gastos Diarios — {monthLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailySpending.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-medium">Nenhum gasto neste periodo</p>
              </div>
            ) : (
              <div className="flex items-end gap-1 h-48">
                {dailySpending.map((day) => {
                  const height = (day.total / maxDaily) * 100;
                  const dayNum = new Date(day.date + "T12:00:00").getDate();
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group cursor-default" title={`${dayNum}: ${formatCurrency(day.total)}`}>
                      <div className="w-full flex-1 flex items-end">
                        <div
                          className="w-full rounded-t-sm bg-primary/80 hover:bg-primary transition-colors duration-200 min-h-[2px]"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      {dailySpending.length <= 15 && (
                        <span className="text-[9px] text-muted-foreground font-medium">{dayNum}</span>
                      )}
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
