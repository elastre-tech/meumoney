"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Phone,
  Mail,
  Download,
  Trash2,
  Shield,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  phone: string;
  wa_id: string | null;
  name: string | null;
  plan: string | null;
  created_at: string;
} | null;

export function SettingsView({
  profile,
  email,
  phone,
  transactionCount,
}: {
  profile: Profile;
  email: string | null;
  phone: string | null;
  transactionCount: number;
}) {
  const router = useRouter();
  const [name, setName] = useState(profile?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleSaveName() {
    if (!name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("users").update({ name: name.trim() }).eq("id", profile?.id ?? "");
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  async function handleExport() {
    setExporting(true);
    const supabase = createClient();
    const { data: transactions } = await supabase
      .from("transactions")
      .select("*, categories(name)")
      .order("date", { ascending: false });

    if (transactions && transactions.length > 0) {
      const header = "Data,Tipo,Valor,Descricao,Categoria,Fonte\n";
      const rows = transactions.map((t) => {
        const cat = t.categories as { name: string } | null;
        return `${t.date},${t.type},${t.amount},"${(t.description ?? "").replace(/"/g, '""')}",${cat?.name ?? ""},${t.source}`;
      });
      const csv = header + rows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meumoney-transacoes-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  }

  async function handleDeleteAccount() {
    const confirmed = confirm(
      "ATENCAO: Esta acao e irreversivel!\n\nTodos os seus dados serao excluidos permanentemente, incluindo transacoes, categorias e mensagens.\n\nDeseja continuar?"
    );
    if (!confirmed) return;

    const doubleConfirm = confirm("Tem certeza absoluta? Digite OK para confirmar.");
    if (!doubleConfirm) return;

    const res = await fetch("/api/account/delete", { method: "DELETE" });
    if (!res.ok) {
      alert("Não consegui excluir sua conta completamente. Nossa equipe foi notificada.");
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const createdAt = profile?.created_at
    ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(profile.created_at))
    : "—";

  return (
    <>
      {/* Profile */}
      <Card className="shadow-card border-border/50 opacity-0 animate-fade-in">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
            <User className="w-4 h-4" />
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-semibold">Nome</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="flex-1"
              />
              <Button onClick={handleSaveName} disabled={saving || !name.trim()} size="sm" className="font-semibold">
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved ? (
                  <CheckCircle2 className="w-4 h-4 text-income" />
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                <Phone className="w-3 h-3" />
                Telefone
              </Label>
              <p className="text-sm font-semibold text-foreground font-mono">
                {phone ?? profile?.phone ?? "—"}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                <Mail className="w-3 h-3" />
                E-mail
              </Label>
              <p className="text-sm font-semibold text-foreground">
                {email ?? "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-semibold">Membro desde</Label>
              <p className="text-sm font-semibold text-foreground">{createdAt}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-semibold">Transacoes registradas</Label>
              <p className="text-sm font-extrabold text-foreground font-mono">{transactionCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data */}
      <Card className="shadow-card border-border/50 opacity-0 animate-fade-in" style={{ animationDelay: "60ms" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
            <Download className="w-4 h-4" />
            Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Exportar transacoes</p>
              <p className="text-xs text-muted-foreground font-medium">Baixe todas as suas transacoes em CSV</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="font-semibold">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4 mr-1" /> CSV</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="shadow-card border-expense/20 opacity-0 animate-fade-in" style={{ animationDelay: "120ms" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-expense uppercase tracking-wide flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Zona de Perigo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Excluir conta</p>
              <p className="text-xs text-muted-foreground font-medium">
                Remove permanentemente todos os seus dados (LGPD)
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDeleteAccount} className="font-semibold text-expense border-expense/30 hover:bg-expense/10 hover:text-expense">
              <Trash2 className="w-4 h-4 mr-1" />
              Excluir
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
