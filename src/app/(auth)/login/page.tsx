"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"input" | "success">("input");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setStep("success");
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      <div className="absolute top-0 left-0 w-full h-[45%] bg-primary" />
      <div
        className="absolute top-[44%] left-0 w-full h-8 bg-primary"
        style={{ clipPath: "ellipse(55% 100% at 50% 0%)" }}
      />

      <div className="relative w-full max-w-[400px] z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-1 mb-3">
            <span className="text-4xl font-extrabold text-white tracking-tight">
              MeuMoney
            </span>
            <span className="text-4xl">🤑</span>
          </div>
          <p className="text-white/80 text-sm font-medium">
            Gestao financeira pelo WhatsApp
          </p>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-6">
            {step === "input" && (
              <form onSubmit={handleSendLink} className="space-y-4">
                <div className="text-center mb-2">
                  <p className="font-bold text-foreground text-lg">Entrar na sua conta</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enviaremos um link magico para seu e-mail
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold">
                    E-mail
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="pl-10"
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-expense font-medium">{error}</p>
                )}

                <Button type="submit" className="w-full font-bold" size="lg" disabled={loading || !email.trim()}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Enviar Magic Link
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {step === "success" && (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 bg-income/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-income" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Link enviado!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Verifique sua caixa de entrada em <strong>{email}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Nao recebeu? Cheque a pasta de spam.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setStep("input"); setError(""); }}
                  className="font-semibold"
                >
                  Tentar novamente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Ao continuar, você concorda com nossos{" "}
          <Link href="/termos" className="underline underline-offset-2 hover:text-foreground transition-colors">Termos de Uso</Link> e{" "}
          <Link href="/privacidade" className="underline underline-offset-2 hover:text-foreground transition-colors">Política de Privacidade</Link>
        </p>
      </div>
    </div>
  );
}
