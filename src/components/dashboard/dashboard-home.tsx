"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  Camera,
  Mic,
  ShoppingCart,
  Car,
  Home,
  Heart,
  Gamepad2,
  ShoppingBag,
  Utensils,
  GraduationCap,
  PawPrint,
  Briefcase,
  Laptop,
  Tag,
  Package,
  DollarSign,
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(date + "T12:00:00"));
}

export function DashboardHome({ transactions, monthLabel }: { transactions: Transaction[]; monthLabel: string }) {
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIncome - totalExpenses;

  const categoryBreakdown = (() => {
    const expenses = transactions.filter((t) => t.type === "expense");
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

  const recentTransactions = transactions.slice(0, 10);

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between opacity-0 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            Visão Geral
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            {monthLabel}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-card hover:shadow-card-hover transition-shadow duration-300 border-border/50 overflow-hidden group opacity-0 animate-fade-in" style={{ animationDelay: "60ms" }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-muted-foreground">Receitas</p>
              <div className="w-10 h-10 rounded-xl bg-income/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-5 h-5 text-income" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-foreground font-mono tracking-tight">
              {formatCurrency(totalIncome)}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-card-hover transition-shadow duration-300 border-border/50 overflow-hidden group opacity-0 animate-fade-in" style={{ animationDelay: "120ms" }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-muted-foreground">Despesas</p>
              <div className="w-10 h-10 rounded-xl bg-expense/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <TrendingDown className="w-5 h-5 text-expense" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-foreground font-mono tracking-tight">
              {formatCurrency(totalExpenses)}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-card-hover transition-shadow duration-300 border-border/50 overflow-hidden group opacity-0 animate-fade-in" style={{ animationDelay: "180ms" }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-muted-foreground">Saldo</p>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className={cn("text-2xl font-extrabold font-mono tracking-tight", balance >= 0 ? "text-income" : "text-expense")}>
              {formatCurrency(balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category breakdown */}
        <Card className="shadow-card border-border/50 opacity-0 animate-fade-in" style={{ animationDelay: "240ms" }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wide">
              Despesas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryBreakdown.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-medium">Nenhuma despesa este mês</p>
              </div>
            ) : (
              categoryBreakdown.map((cat) => {
                const catKey = normalizeCategory(cat.category);
                const Icon = categoryIconMap[catKey] ?? Package;
                const color = categoryColorMap[catKey] ?? "#6b7280";
                return (
                  <div key={cat.category} className="group/cat">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover/cat:scale-110"
                          style={{ backgroundColor: `${color}15` }}
                        >
                          <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{cat.category}</span>
                      </span>
                      <div className="text-right">
                        <span className="text-sm font-bold font-mono text-foreground">{formatCurrency(cat.total)}</span>
                        <span className="text-[10px] text-muted-foreground ml-1.5 font-semibold">{cat.percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${cat.percentage}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card className="shadow-card border-border/50 lg:col-span-2 opacity-0 animate-fade-in" style={{ animationDelay: "300ms" }}>
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
                <p className="text-sm text-muted-foreground font-medium">Nenhuma transação este mês</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {recentTransactions.map((t, i) => {
                  const catName = t.categories?.name ?? "Outros";
                  const catKey = normalizeCategory(catName);
                  const CatIcon = categoryIconMap[catKey] ?? Package;
                  const color = categoryColorMap[catKey] ?? "#6b7280";
                  const SourceIcon = sourceIcons[t.source] ?? MessageSquare;
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-all duration-200 opacity-0 animate-fade-in"
                      style={{ animationDelay: `${(i + 5) * 40}ms` }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${color}12` }}
                      >
                        <CatIcon className="w-[18px] h-[18px]" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {t.description ?? "Sem descrição"}
                          </p>
                          <div className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center bg-muted">
                            <SourceIcon className="w-2.5 h-2.5 text-muted-foreground" />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                          {formatDate(t.date)} &middot; {catName}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {t.type === "income" ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-income" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5 text-expense" />
                        )}
                        <p className={cn("text-sm font-bold font-mono", t.type === "income" ? "text-income" : "text-expense")}>
                          {formatCurrency(Number(t.amount))}
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
