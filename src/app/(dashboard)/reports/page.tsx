import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReportsView } from "@/components/dashboard/reports-view";

export default async function ReportsPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Current month transactions
  const startOfMonth = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endOfMonth = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;

  const { data: currentTransactions } = await supabase
    .from("transactions")
    .select("*, categories(name, icon, type)")
    .eq("user_id", user.id)
    .gte("date", startOfMonth)
    .lte("date", endOfMonth)
    .order("date", { ascending: false });

  // Previous month transactions for comparison
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const startOfPrev = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-01`;
  const endOfPrev = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${new Date(prevYear, prevMonth + 1, 0).getDate()}`;

  const { data: prevTransactions } = await supabase
    .from("transactions")
    .select("*, categories(name, icon, type)")
    .eq("user_id", user.id)
    .gte("date", startOfPrev)
    .lte("date", endOfPrev);

  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(now);
  const monthLabel = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

  const prevDate = new Date(prevYear, prevMonth, 1);
  const prevMonthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(prevDate);
  const prevMonthLabel = `${prevMonthName.charAt(0).toUpperCase() + prevMonthName.slice(1)} ${prevYear}`;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
          Relatórios
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium">
          Análise mensal das suas finanças
        </p>
      </div>

      <ReportsView
        currentTransactions={currentTransactions ?? []}
        prevTransactions={prevTransactions ?? []}
        monthLabel={monthLabel}
        prevMonthLabel={prevMonthLabel}
      />
    </div>
  );
}
