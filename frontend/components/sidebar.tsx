"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, Bell, Layout, MessageSquare, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const routes = [
  {
    label: "Dashboard",
    icon: Layout,
    href: "/",
    color: "text-sky-500",
  },
  {
    label: "Subaccounts",
    icon: Activity,
    href: "/subaccounts",
    color: "text-violet-500",
  },
  {
    label: "Channels",
    icon: MessageSquare,
    href: "/channels",
    color: "text-pink-700",
  },
  {
    label: "Alerts",
    icon: Bell,
    href: "/alerts",
    color: "text-orange-700",
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full border-r border-border">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-primary">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-lg font-bold text-foreground">
            dYdX Alert
          </h1>
        </Link>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all border",
              pathname === route.href
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            <route.icon className="h-5 w-5" />
            {route.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
