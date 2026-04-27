import { BarChart3, CalendarDays, CircleDollarSign, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string | null;
  date: string;
  categories: { name: string; icon: string | null; type: string } | null;
};

type MonthSummary = {
  key: string;
  label: string;
  income: number;
  expense: number;
  balance: number;
  date: Date;
  variation: number | null;
};

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function formatMonthLabel(date: Date): string {
  const monthName = monthFormatter.format(date);
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${date.getFullYear()}`;
}

function getTransactionDate(transaction: Transaction): Date | null {
  const date = new Date(`${transaction.date}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildMonthlySummaries(transactions: Transaction[]): MonthSummary[] {
  const summaries = new Map<string, Omit<MonthSummary, "variation">>();

  for (const transaction of transactions) {
    const date = getTransactionDate(transaction);
    if (!date) continue;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const summary = summaries.get(key) ?? {
      key,
      label: formatMonthLabel(date),
      income: 0,
      expense: 0,
      balance: 0,
      date: new Date(date.getFullYear(), date.getMonth(), 1),
    };

    if (transaction.type === "income") {
      summary.income += Number(transaction.amount);
    } else {
      summary.expense += Number(transaction.amount);
    }

    summary.balance = summary.income - summary.expense;
    summaries.set(key, summary);
  }

  const ascending = Array.from(summaries.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

  return ascending
    .map((summary, index) => {
      const previous = ascending[index - 1];
      const variation = previous && previous.balance !== 0
        ? ((summary.balance - previous.balance) / Math.abs(previous.balance)) * 100
        : null;

      return { ...summary, variation };
    })
    .reverse();
}

function SummaryCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof TrendingUp;
  tone: "income" | "expense" | "balance" | "neutral";
}) {
  const toneClasses = {
    income: { icon: "bg-income/10 text-income", value: "text-income" },
    expense: { icon: "bg-expense/10 text-expense", value: "text-expense" },
    balance: { icon: "bg-primary/10 text-primary", value: "text-foreground" },
    neutral: { icon: "bg-muted text-muted-foreground", value: "text-foreground" },
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
        <p className={cn("whitespace-nowrap text-2xl font-extrabold font-mono tracking-tight", toneClasses.value)}>{value}</p>
        <p className="mt-2 text-xs font-medium text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center">
      <BarChart3 className="mb-3 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function Variation({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-sm font-semibold text-muted-foreground">--</span>;
  }

  const positive = value >= 0;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-bold", positive ? "bg-income/10 text-income" : "bg-expense/10 text-expense")}>
      {positive ? "+" : ""}
      {value.toFixed(0)}%
    </span>
  );
}

export default async function ReportsPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("transactions")
    .select("id, type, amount, description, date, categories(name, icon, type)")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  const transactions = (data ?? []) as Transaction[];
  const totalIncome = transactions.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const totalExpense = transactions.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const balance = totalIncome - totalExpense;
  const monthlySummaries = buildMonthlySummaries(transactions);
  const bestMonth = monthlySummaries.reduce<MonthSummary | null>((best, summary) => {
    if (!best || summary.balance > best.balance) return summary;
    return best;
  }, null);
  const topExpenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5);
  const evolution = monthlySummaries.slice().reverse();
  const maxBalance = Math.max(...evolution.map((summary) => Math.abs(summary.balance)), 1);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
          Relatórios
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium">
          Evolução financeira, comparação mensal e maiores gastos em um só lugar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Receita total" value={formatCurrency(totalIncome)} helper="Somatório de todas as entradas" icon={TrendingUp} tone="income" />
        <SummaryCard label="Despesa total" value={formatCurrency(totalExpense)} helper="Somatório de todos os gastos" icon={TrendingDown} tone="expense" />
        <SummaryCard label="Saldo" value={formatCurrency(balance)} helper="Receitas menos despesas" icon={CircleDollarSign} tone={balance >= 0 ? "income" : "expense"} />
        <SummaryCard
          label="Melhor mês"
          value={bestMonth ? formatCurrency(bestMonth.balance) : "--"}
          helper={bestMonth ? bestMonth.label : "Sem meses com dados ainda"}
          icon={Trophy}
          tone="balance"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border/50 shadow-card lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wide">
              Comparação mês a mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlySummaries.length === 0 ? (
              <EmptyState title="Sem dados mensais" description="Quando você registrar transações, a comparação mensal aparece aqui." />
            ) : (
              <>
                <div className="hidden md:block">
                  <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-3 border-b border-border pb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <span>Mês</span>
                    <span className="text-right">Receita</span>
                    <span className="text-right">Despesa</span>
                    <span className="text-right">Saldo</span>
                    <span className="text-right">Variação</span>
                  </div>
                  <div className="divide-y divide-border">
                    {monthlySummaries.map((summary) => (
                      <div key={summary.key} className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] items-center gap-3 py-3 text-sm">
                        <span className="font-semibold text-foreground">{summary.label}</span>
                        <span className="text-right font-mono font-bold text-income">{formatCurrency(summary.income)}</span>
                        <span className="text-right font-mono font-bold text-expense">{formatCurrency(summary.expense)}</span>
                        <span className={cn("text-right font-mono font-bold", summary.balance >= 0 ? "text-income" : "text-expense")}>{formatCurrency(summary.balance)}</span>
                        <span className="text-right"><Variation value={summary.variation} /></span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 md:hidden">
                  {monthlySummaries.map((summary) => (
                    <div key={summary.key} className="rounded-xl border border-border/60 bg-background p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="font-bold text-foreground">{summary.label}</p>
                        <Variation value={summary.variation} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="font-semibold text-muted-foreground">Receita</p>
                          <p className="mt-1 font-mono font-bold text-income">{formatCurrency(summary.income)}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-muted-foreground">Despesa</p>
                          <p className="mt-1 font-mono font-bold text-expense">{formatCurrency(summary.expense)}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-muted-foreground">Saldo</p>
                          <p className={cn("mt-1 font-mono font-bold", summary.balance >= 0 ? "text-income" : "text-expense")}>{formatCurrency(summary.balance)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wide">
              Evolução do saldo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {evolution.length === 0 ? (
              <EmptyState title="Sem evolução ainda" description="O saldo mensal será exibido quando houver transações." />
            ) : (
              evolution.map((summary) => {
                const width = Math.max(6, (Math.abs(summary.balance) / maxBalance) * 100);
                const positive = summary.balance >= 0;
                return (
                  <div key={summary.key}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">{summary.label}</span>
                      <span className={cn("whitespace-nowrap text-sm font-bold font-mono", positive ? "text-income" : "text-expense")}>{formatCurrency(summary.balance)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-2.5 rounded-full", positive ? "bg-income" : "bg-expense")} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wide">
            Top 5 maiores despesas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topExpenses.length === 0 ? (
            <EmptyState title="Nenhuma despesa encontrada" description="Seus maiores gastos serão listados aqui quando houver despesas registradas." />
          ) : (
            <div className="space-y-2">
              {topExpenses.map((transaction, index) => (
                <div key={transaction.id} className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/50">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-expense/10 text-sm font-extrabold text-expense">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{transaction.description ?? "Sem descrição"}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <span>{transaction.categories?.name ?? "Outros"}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {formatDate(transaction.date)}</span>
                    </div>
                  </div>
                  <p className="shrink-0 whitespace-nowrap text-sm font-bold font-mono text-expense">{formatCurrency(Number(transaction.amount))}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
