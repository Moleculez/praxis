"use client";

import { useState } from "react";
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

  const toggle = () => {
    setDark((prev) => {
      document.documentElement.classList.toggle("dark", !prev);
      return !prev;
    });
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
      <span>{dark ? "Light" : "Dark"}</span>
    </button>
  );
}

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-4 w-56 border-r min-h-screen">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold">Praxis</h2>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          v0.1.0
        </span>
      </div>

      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}

      <div className="mt-auto pt-4 border-t">
        <DarkModeToggle />
      </div>
    </nav>
  );
}
