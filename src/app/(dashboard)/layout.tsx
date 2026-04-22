"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tags,
  BarChart3,
  Settings,
  Menu,
  LogOut,
  Bell,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/transactions", label: "Transações", icon: ArrowLeftRight },
  { href: "/categories", label: "Categorias", icon: Tags },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/settings", label: "Configurações", icon: Settings },
];

function SidebarNav({ pathname, onNavigate, onLogout, userName, userPhone }: { pathname: string; onNavigate?: () => void; onLogout?: () => void; userName: string; userPhone: string }) {
  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'
  return (
    <div className="flex flex-col h-full sidebar-gradient">
      {/* Logo */}
      <div className="px-6 pt-7 pb-6">
        <Link href="/" className="flex items-center gap-1" onClick={onNavigate}>
          <span className="text-2xl font-extrabold text-white tracking-tight">
            Meu
          </span>
          <span className="text-2xl font-extrabold text-white tracking-tight">
            Money
          </span>
          <span className="text-2xl ml-0.5">🤑</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200",
                isActive
                  ? "bg-white/20 text-white shadow-sm backdrop-blur-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              <item.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-5 pt-3 border-t border-white/10 mt-2">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {userName}
            </p>
            <p className="text-[11px] text-white/50 truncate">
              {userPhone}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="w-7 h-7 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('users')
        .select('name, phone')
        .eq('id', user.id)
        .single();
      if (profile) {
        setUserName(profile.name ?? 'Usuário');
        setUserPhone(profile.phone ?? '');
      }
    }
    loadUser();
  }, []);

  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const pageTitle = NAV_ITEMS.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  )?.label ?? "MeuMoney";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[250px] fixed h-full z-30 shadow-sidebar">
        <SidebarNav pathname={pathname} onLogout={handleLogout} userName={userName} userPhone={userPhone} />
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-[250px] flex flex-col min-h-screen">
        {/* Top header */}
        <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border/50">
          <div className="flex items-center justify-between px-4 md:px-6 lg:px-8 h-14">
            {/* Mobile: hamburger + logo */}
            <div className="flex items-center gap-3 lg:hidden">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-9 h-9">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[250px] p-0 border-0 [&>button]:hidden">
                  <SidebarNav pathname={pathname} onNavigate={() => setSheetOpen(false)} onLogout={handleLogout} userName={userName} userPhone={userPhone} />
                </SheetContent>
              </Sheet>
              <span className="text-lg font-extrabold text-foreground tracking-tight">
                Meu<span className="text-primary">Money</span>
                <span className="ml-0.5">🤑</span>
              </span>
            </div>

            {/* Desktop: page title */}
            <h2 className="hidden lg:block text-sm font-semibold text-foreground">
              {pageTitle}
            </h2>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground hover:text-foreground">
                <Bell className="w-[18px] h-[18px]" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold lg:hidden">
                {initials}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 pb-20 lg:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border/50 flex z-30 shadow-[0_-2px_10px_rgb(0_0_0/0.04)]">
          {NAV_ITEMS.slice(0, 4).map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center py-2 text-[10px] font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center mb-0.5 transition-colors",
                  isActive && "bg-primary/10"
                )}>
                  <item.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="truncate max-w-[60px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
