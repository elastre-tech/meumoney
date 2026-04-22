import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CategoriesList } from "@/components/dashboard/categories-list";

export default async function CategoriesPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
          Categorias
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium">
          Gerencie suas categorias de receita e despesa
        </p>
      </div>

      <CategoriesList initialCategories={categories ?? []} userId={user.id} />
    </div>
  );
}
