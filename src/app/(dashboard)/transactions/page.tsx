import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TransactionsList } from "@/components/dashboard/transactions-list";

export default async function TransactionsPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, categories(name, icon, type)")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(100);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
          Transações
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium">
          Histórico completo de receitas e despesas
        </p>
      </div>

      <TransactionsList initialTransactions={transactions ?? []} />
    </div>
  );
}
