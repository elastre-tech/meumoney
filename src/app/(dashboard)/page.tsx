import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardHome } from "@/components/dashboard/dashboard-home";

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, categories(name, icon, type)")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <DashboardHome
        transactions={transactions ?? []}
      />
    </div>
  );
}
