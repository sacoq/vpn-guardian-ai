import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-glow">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-tight">
              xn<span className="gradient-text">Check</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              vpn audit
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "rounded-md px-3 py-1.5 text-foreground bg-secondary" }}
          >
            Проверка
          </Link>
          <Link
            to="/history"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "rounded-md px-3 py-1.5 text-foreground bg-secondary" }}
          >
            История
          </Link>
          <Link
            to="/about"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "rounded-md px-3 py-1.5 text-foreground bg-secondary" }}
          >
            О сервисе
          </Link>
        </nav>
      </div>
    </header>
  );
}
