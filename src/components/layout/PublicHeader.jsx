import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Brand } from "./Brand";
import { Button } from "@/components/ui/button";

const sectionLinks = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#roles", label: "Workspaces" },
  { href: "#safety", label: "Safety" },
];

export function PublicHeader() {
  const [scrolled, setScrolled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.scrollY > 8;
  });

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 8);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-white/85 backdrop-blur-md transition-shadow duration-200 ${
        scrolled
          ? "border-slate-200 shadow-md shadow-slate-900/5"
          : "border-slate-200/70"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Brand />
        <div className="flex min-w-0 items-center gap-2">
          <nav
            className="mr-2 hidden items-center gap-1 lg:flex"
            aria-label="Landing page sections"
          >
            {sectionLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link to="/login">Log in</Link>
          </Button>
          <Button asChild className="shrink-0 px-3 sm:px-4">
            <Link to="/register">
              <span className="sm:hidden">Join</span>
              <span className="hidden sm:inline">Create account</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
