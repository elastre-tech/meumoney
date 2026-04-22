"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  Camera,
  Mic,
  Filter,
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
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date + "T12:00:00"));
}

export function TransactionsList({ initialTransactions }: { initialTransactions: Transaction[] }) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = transactions.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (search && !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta transacao?")) return;
    setDeleting(id);
    const supabase = createClient();
    await supabase.from("transactions").delete().eq("id", id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setDeleting(null);
    router.refresh();
  }

  return (
    <>
      {/* Filters */}
      <Card className="shadow-card border-border/50">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transacao..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "income", "expense"] as const).map((t) => (
              <Button
                key={t}
                variant={typeFilter === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(t)}
                className="font-semibold"
              >
                {t === "all" ? "Todos" : t === "income" ? "Receitas" : "Despesas"}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="shadow-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
            <Filter className="w-4 h-4" />
            {filtered.length} transacao{filtered.length !== 1 ? "es" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium">
                Nenhuma transacao encontrada
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((t, i) => {
                const catName = t.categories?.name ?? "Outros";
                const catKey = normalizeCategory(catName);
                const CatIcon = categoryIconMap[catKey] ?? Package;
                const color = categoryColorMap[catKey] ?? "#6b7280";
                const SourceIcon = sourceIcons[t.source] ?? MessageSquare;

                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-all duration-200 group opacity-0 animate-fade-in"
                    style={{ animationDelay: `${i * 30}ms` }}
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
                          {t.description ?? "Sem descricao"}
                        </p>
                        <div className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center bg-muted">
                          <SourceIcon className="w-2.5 h-2.5 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground font-medium">
                          {formatDate(t.date)}
                        </p>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold">
                          {catName}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        {t.type === "income" ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-income" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5 text-expense" />
                        )}
                        <p className={cn("text-sm font-bold font-mono", t.type === "income" ? "text-income" : "text-expense")}>
                          {formatCurrency(t.amount)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-expense"
                        onClick={() => handleDelete(t.id)}
                        disabled={deleting === t.id}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
