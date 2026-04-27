"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  CircleDollarSign,
  DollarSign,
  Filter,
  MessageSquare,
  Mic,
  Package,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
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

type TypeFilter = "all" | "income" | "expense";

const sourceLabels: Record<string, string> = {
  text: "Texto",
  image: "Imagem",
  audio: "Áudio",
  manual: "Manual",
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
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone: "income" | "expense" | "neutral";
}) {
  const toneClasses = {
    income: { icon: "bg-income/10 text-income", value: "text-income" },
    expense: { icon: "bg-expense/10 text-expense", value: "text-expense" },
    neutral: { icon: "bg-primary/10 text-primary", value: "text-foreground" },
  }[tone];

  return (
    <Card className="border-border/50 shadow-card">
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-muted-foreground">{label}</p>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", toneClasses.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className={cn("whitespace-nowrap text-2xl font-extrabold font-mono tracking-tight", toneClasses.value)}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center">
      <Package className="mb-3 h-10 w-10 text-muted-foreground" />
      <p className="text-sm font-semibold text-foreground">
        {filtered
          ? "Nenhuma transação encontrada para esses filtros."
          : "Nenhuma transação encontrada. Envie uma mensagem no WhatsApp para registrar seus gastos e receitas."}
      </p>
    </div>
  );
}

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    async function loadTransactions() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("transactions")
        .select("*, categories(name, icon, type)")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(100);

      setTransactions((data ?? []) as Transaction[]);
      setLoading(false);
    }

    loadTransactions();
  }, [router]);

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();
    for (const transaction of transactions) {
      categories.add(transaction.categories?.name ?? "Outros");
    }
    return Array.from(categories).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = normalizeText(search.trim());

    return transactions.filter((transaction) => {
      if (typeFilter !== "all" && transaction.type !== typeFilter) return false;

      const categoryName = transaction.categories?.name ?? "Outros";
      if (categoryFilter !== "all" && categoryName !== categoryFilter) return false;

      if (normalizedSearch) {
        const description = normalizeText(transaction.description ?? "");
        if (!description.includes(normalizedSearch)) return false;
      }

      return true;
    });
  }, [categoryFilter, search, transactions, typeFilter]);

  const totalIncome = transactions.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const totalExpense = transactions.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const balance = totalIncome - totalExpense;
  const filtersActive = search.trim() !== "" || typeFilter !== "all" || categoryFilter !== "all";

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;

    setDeleting(id);
    const supabase = createClient();
    await supabase.from("transactions").delete().eq("id", id);
    setTransactions((current) => current.filter((transaction) => transaction.id !== id));
    setDeleting(null);
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
          Transações
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium">
          Entradas registradas via WhatsApp para acompanhar gastos e receitas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total de receitas" value={formatCurrency(totalIncome)} icon={ArrowUpRight} tone="income" />
        <SummaryCard label="Total de despesas" value={formatCurrency(totalExpense)} icon={ArrowDownRight} tone="expense" />
        <SummaryCard label="Saldo" value={formatCurrency(balance)} icon={Wallet} tone={balance >= 0 ? "income" : "expense"} />
        <SummaryCard label="Total de transações" value={String(transactions.length)} icon={CircleDollarSign} tone="neutral" />
      </div>

      <Card className="border-border/50 shadow-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              {(["all", "income", "expense"] as const).map((type) => (
                <Button
                  key={type}
                  variant={typeFilter === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter(type)}
                  className="shrink-0 font-semibold"
                >
                  {type === "all" ? "Todos" : type === "income" ? "Receitas" : "Despesas"}
                </Button>
              ))}
            </div>

            <select
              aria-label="Filtrar por categoria"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-ring"
            >
              <option value="all">Todas as categorias</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wide">
            <Filter className="h-4 w-4" />
            {filteredTransactions.length} transação{filteredTransactions.length !== 1 ? "ões" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm font-medium text-muted-foreground">Carregando transações...</div>
          ) : filteredTransactions.length === 0 ? (
            <EmptyState filtered={filtersActive} />
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-xl border border-border/60 md:block">
                <div className="grid grid-cols-[120px_1.5fr_1fr_90px_90px_120px_48px] gap-3 bg-muted/35 px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <span>Data</span>
                  <span>Descrição</span>
                  <span>Categoria</span>
                  <span>Tipo</span>
                  <span>Origem</span>
                  <span className="text-right">Valor</span>
                  <span />
                </div>
                <div className="divide-y divide-border">
                  {filteredTransactions.map((transaction) => {
                    const categoryName = transaction.categories?.name ?? "Outros";
                    const SourceIcon = sourceIcons[transaction.source] ?? MessageSquare;
                    const isIncome = transaction.type === "income";

                    return (
                      <div key={transaction.id} className="grid grid-cols-[120px_1.5fr_1fr_90px_90px_120px_48px] items-center gap-3 px-4 py-3 text-sm hover:bg-muted/35">
                        <span className="font-medium text-muted-foreground">{formatDate(transaction.date)}</span>
                        <span className="truncate font-semibold text-foreground">{transaction.description ?? "Sem descrição"}</span>
                        <Badge variant="secondary" className="w-fit max-w-full truncate font-semibold">{categoryName}</Badge>
                        <span className={cn("inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-xs font-bold", isIncome ? "bg-income/10 text-income" : "bg-expense/10 text-expense")}>
                          {isIncome ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {isIncome ? "Receita" : "Despesa"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                          <SourceIcon className="h-3.5 w-3.5" />
                          {sourceLabels[transaction.source] ?? transaction.source}
                        </span>
                        <span className={cn("text-right font-mono font-bold", isIncome ? "text-income" : "text-expense")}>
                          {formatCurrency(Number(transaction.amount))}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-expense"
                          onClick={() => handleDelete(transaction.id)}
                          disabled={deleting === transaction.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredTransactions.map((transaction) => {
                  const categoryName = transaction.categories?.name ?? "Outros";
                  const SourceIcon = sourceIcons[transaction.source] ?? MessageSquare;
                  const isIncome = transaction.type === "income";

                  return (
                    <div key={transaction.id} className="rounded-xl border border-border/60 bg-background p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{transaction.description ?? "Sem descrição"}</p>
                          <p className="mt-1 text-xs font-medium text-muted-foreground">{formatDate(transaction.date)}</p>
                        </div>
                        <p className={cn("shrink-0 whitespace-nowrap font-mono text-sm font-bold", isIncome ? "text-income" : "text-expense")}>
                          {formatCurrency(Number(transaction.amount))}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="font-semibold">{categoryName}</Badge>
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold", isIncome ? "bg-income/10 text-income" : "bg-expense/10 text-expense")}>
                          {isIncome ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {isIncome ? "Receita" : "Despesa"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                          <SourceIcon className="h-3 w-3" />
                          {sourceLabels[transaction.source] ?? transaction.source}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-7 px-2 text-muted-foreground hover:text-expense"
                          onClick={() => handleDelete(transaction.id)}
                          disabled={deleting === transaction.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
