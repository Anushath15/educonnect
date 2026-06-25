"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, BookOpen, Calendar, Repeat, Megaphone, Building2, Settings, LogOut } from "lucide-react"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teachers", label: "Teachers", icon: Users },
  { href: "/students", label: "Students", icon: BookOpen },
  { href: "/timetable", label: "Timetable", icon: Calendar },
  { href: "/substitutions", label: "Substitutions", icon: Repeat },
  { href: "/announcements", label: "Announcements", icon: Megaphone },
  { href: "/resources", label: "Resources", icon: Building2 },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-64 border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center"><span className="text-primary-foreground text-sm font-bold">E</span></div>EduConnect
        </Link>
      </div>
      <nav className="space-y-1 p-4">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", pathname === item.href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
            <item.icon className="h-4 w-4" />{item.label}
          </Link>
        ))}
      </nav>
      <div className="absolute bottom-4 left-4 right-4">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"><LogOut className="h-4 w-4" />Sign Out</button>
      </div>
    </aside>
  )
}
