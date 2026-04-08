"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  FlaskConical,
  Brain,
  Shield,
  Settings,
  StopCircle,
  Sun,
  Moon,
  Menu,
  X,
  Eye,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAutoTradeStatus, useStopAutoTrade } from "@/hooks/use-live";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/trading", label: "Trading", icon: TrendingUp },
  { href: "/research", label: "Research", icon: FlaskConical },
  { href: "/intelligence", label: "Intelligence", icon: Brain },
  { href: "/audit", label: "Audit", icon: Shield },
  { href: "/settings", label: "Settings", icon: Settings },
];

function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const isDark = stored === "dark" || (!stored && prefersDark);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 transition-colors w-full"
    >
      <span
        className={`inline-flex transition-transform duration-300 ${dark ? "rotate-180" : ""}`}
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </span>
      <span>{dark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}

function TradingStatusIndicator() {
  const autoTradeStatus = useAutoTradeStatus();
  const isRunning = autoTradeStatus.data?.running === true;

  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          isRunning ? "bg-green-500 animate-pulse" : "bg-gray-400"
        }`}
      />
      <span className="text-xs text-muted-foreground">
        {isRunning ? "AI Trading Active" : "Trading Idle"}
      </span>
    </div>
  );
}

function KillSwitch() {
  const autoTradeStatus = useAutoTradeStatus();
  const stopAutoTrade = useStopAutoTrade();
  const isRunning = autoTradeStatus.data?.running === true;

  if (!isRunning) return null;

  return (
    <div className="px-3">
      <button
        onClick={() => stopAutoTrade.mutate()}
        disabled={stopAutoTrade.isPending}
        className="bg-red-600 hover:bg-red-700 text-white rounded-md px-3 py-2 text-sm font-medium w-full flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        <StopCircle size={16} />
        {stopAutoTrade.isPending ? "Stopping..." : "KILL SWITCH"}
      </button>
      <p className="text-[10px] text-muted-foreground text-center mt-1">
        Stop all trading?
      </p>
    </div>
  );
}

export function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-background border md:hidden"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`fixed top-0 left-0 z-40 flex flex-col gap-1 p-4 w-56 h-screen overflow-y-auto border-r bg-sidebar text-sidebar-foreground transition-transform md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold tracking-tight">Praxis</h2>
            <span className="text-[9px] text-muted-foreground/70 bg-muted px-1 py-0.5 rounded font-mono">
              v0.1
            </span>
          </div>
          <TradingStatusIndicator />
        </div>

        <div className="border-t border-sidebar-border mb-2" />

        {/* Nav items */}
        <div className="flex flex-col gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(href + "/");

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Kill switch */}
        <div className="mt-auto pt-4 border-t border-sidebar-border flex flex-col gap-3">
          <KillSwitch />
          <DarkModeToggle />
        </div>
      </nav>
    </>
  );
}
