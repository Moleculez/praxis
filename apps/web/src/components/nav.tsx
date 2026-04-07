"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FlaskConical,
  TestTubes,
  Briefcase,
  Radio,
  Brain,
  Bot,
  Shield,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: "/research", label: "Research", icon: FlaskConical },
  { href: "/experiments", label: "Experiments", icon: TestTubes },
  { href: "/portfolios", label: "Portfolios", icon: Briefcase },
  { href: "/live", label: "Live", icon: Radio },
  { href: "/intelligence", label: "Intelligence", icon: Brain },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/audit", label: "Audit", icon: Shield },
];

function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
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
      {dark ? <Sun size={16} /> : <Moon size={16} />}
      <span>{dark ? "Light mode" : "Dark mode"}</span>
    </button>
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
        className={`fixed md:sticky top-0 left-0 z-40 flex flex-col gap-1 p-4 w-56 border-r min-h-screen bg-sidebar text-sidebar-foreground transition-transform md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-lg font-semibold tracking-tight">Praxis</h2>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
            v0.1.0
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto pt-4 border-t border-sidebar-border">
          <DarkModeToggle />
        </div>
      </nav>
    </>
  );
}
