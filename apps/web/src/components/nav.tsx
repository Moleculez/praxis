import Link from "next/link";

const navItems = [
  { href: "/research", label: "Research" },
  { href: "/experiments", label: "Experiments" },
  { href: "/portfolios", label: "Portfolios" },
  { href: "/live", label: "Live" },
  { href: "/intelligence", label: "Intelligence" },
  { href: "/agents", label: "Agents" },
  { href: "/audit", label: "Audit" },
];

export function Nav() {
  return (
    <nav className="flex flex-col gap-1 p-4 w-56 border-r min-h-screen">
      <h2 className="text-lg font-semibold mb-4">Praxis</h2>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
