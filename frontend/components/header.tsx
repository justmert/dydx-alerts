"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, LogOut, Bell, AlertCircle, Users, TrendingUp, BellRing, Settings, Github, BookOpen } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { cn } from "@/lib/utils"

interface HeaderProps {
  user?: {
    email: string
    name?: string | null
  } | null
  onLogout?: () => void
}

const routes = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/subaccounts", label: "Subaccounts", icon: Users },
  { href: "/markets", label: "Markets", icon: TrendingUp },
  { href: "/channels", label: "Channels", icon: Bell },
  { href: "/alert-rules", label: "Alert Rules", icon: BellRing },
  { href: "/alerts", label: "Alerts", icon: AlertCircle },
]

export function Header({ user, onLogout }: HeaderProps) {
  const pathname = usePathname()
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U"

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="flex h-12 items-center px-4 md:px-6 justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold hidden sm:inline">dYdX Alert</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  pathname === route.href
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <route.icon className="h-3.5 w-3.5" />
                {route.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            asChild
          >
            <a
              href="https://docs.alertsdydx.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Documentation"
            >
              <BookOpen className="h-4 w-4" />
            </a>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            asChild
          >
            <a
              href="https://github.com/justmert/dydx-alerts"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository"
            >
              <Github className="h-4 w-4" />
            </a>
          </Button>

          <ThemeToggle />

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-0.5">
                    {user.name && <p className="text-xs font-medium">{user.name}</p>}
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="md:hidden">
                  {routes.map((route) => (
                    <DropdownMenuItem key={route.href} asChild>
                      <Link href={route.href} className="flex items-center">
                        <route.icon className="mr-2 h-3.5 w-3.5" />
                        <span className="text-xs">{route.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center">
                    <Settings className="mr-2 h-3.5 w-3.5" />
                    <span className="text-xs">Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  <span className="text-xs">Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
