"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
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
  TrendingUp,
  Tag,
  Package,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  user_id: string | null;
  name: string;
  type: string;
  icon: string | null;
  keywords: string[] | null;
  is_default: boolean;
  created_at: string;
};

function normalizeCategory(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const iconMap: Record<string, typeof ShoppingCart> = {
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

const colorMap: Record<string, string> = {
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

export function CategoriesList({ initialCategories, userId }: { initialCategories: Category[]; userId: string }) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"expense" | "income">("expense");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories")
      .insert({ name: newName.trim(), type: newType, user_id: userId, is_default: false })
      .select()
      .single();

    if (!error && data) {
      setCategories((prev) => [...prev, data as Category]);
      setNewName("");
    }
    setAdding(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta categoria? Transacoes vinculadas ficarao sem categoria.")) return;
    setDeleting(id);
    const supabase = createClient();
    await supabase.from("categories").delete().eq("id", id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setDeleting(null);
    router.refresh();
  }

  function renderCategoryGroup(title: string, cats: Category[], typeIcon: typeof ArrowDownRight) {
    const TypeIcon = typeIcon;
    return (
      <Card className="shadow-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
            <TypeIcon className="w-4 h-4" />
            {title} ({cats.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {cats.map((cat, i) => {
              const catKey = normalizeCategory(cat.name);
              const Icon = iconMap[catKey] ?? Package;
              const color = colorMap[catKey] ?? "#6b7280";
              return (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-all duration-200 group opacity-0 animate-fade-in"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}12` }}
                  >
                    <Icon className="w-[18px] h-[18px]" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {cat.is_default && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold">
                          Padrao
                        </Badge>
                      )}
                      {cat.keywords && cat.keywords.length > 0 && (
                        <p className="text-xs text-muted-foreground font-medium truncate">
                          {cat.keywords.slice(0, 3).join(", ")}
                          {cat.keywords.length > 3 && ` +${cat.keywords.length - 3}`}
                        </p>
                      )}
                    </div>
                  </div>
                  {!cat.is_default && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-expense"
                      onClick={() => handleDelete(cat.id)}
                      disabled={deleting === cat.id}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Add category */}
      <Card className="shadow-card border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Nome da nova categoria..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <div className="flex gap-2">
              <Button
                variant={newType === "expense" ? "default" : "outline"}
                size="sm"
                onClick={() => setNewType("expense")}
                className="font-semibold"
              >
                Despesa
              </Button>
              <Button
                variant={newType === "income" ? "default" : "outline"}
                size="sm"
                onClick={() => setNewType("income")}
                className="font-semibold"
              >
                Receita
              </Button>
              <Button onClick={handleAdd} disabled={adding || !newName.trim()} size="sm" className="font-semibold">
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderCategoryGroup("Despesas", expenseCategories, ArrowDownRight)}
        {renderCategoryGroup("Receitas", incomeCategories, ArrowUpRight)}
      </div>
    </>
  );
}
