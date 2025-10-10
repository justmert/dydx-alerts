"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, Bell, Layout, MessageSquare, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

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

export function MobileNav() {
  const pathname = usePathname()

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <SheetHeader>
          <SheetTitle>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg border-2 border-primary flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                dYdX Alert
              </span>
            </Link>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 mt-8">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-muted",
                pathname === route.href
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <route.icon className={cn("h-5 w-5", route.color)} />
              {route.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
