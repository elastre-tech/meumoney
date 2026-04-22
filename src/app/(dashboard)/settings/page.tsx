import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/dashboard/settings-view";

export default async function SettingsPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const { count: transactionCount } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium">
          Perfil, preferências e dados da conta
        </p>
      </div>

      <SettingsView
        profile={profile}
        email={user.email ?? null}
        phone={user.phone ?? null}
        transactionCount={transactionCount ?? 0}
      />
    </div>
  );
}
