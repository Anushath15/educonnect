"use client"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, BookOpen, Calendar, AlertCircle } from "lucide-react"

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => { const res = await fetch("/api/school/stats"); return res.json() }
  })

  const statCards = [
    { title: "Total Teachers", value: stats?.data?.teachers || 0, icon: Users, color: "text-blue-500" },
    { title: "Total Students", value: stats?.data?.students || 0, icon: BookOpen, color: "text-green-500" },
    { title: "Classes", value: stats?.data?.classes || 0, icon: Calendar, color: "text-purple-500" },
    { title: "Pending Substitutions", value: stats?.data?.pendingSubstitutions || 0, icon: AlertCircle, color: "text-orange-500" },
  ]

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Dashboard</h1><p className="text-muted-foreground">Welcome back to EduConnect</p></div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">{card.title}</CardTitle><card.icon className={`h-4 w-4 ${card.color}`} /></CardHeader>
            <CardContent><div className="text-2xl font-bold">{card.value}</div></CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4"><CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Activity feed coming soon...</p></CardContent></Card>
        <Card className="col-span-3"><CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader><CardContent className="space-y-2">
          <button className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Create Substitution</button>
          <button className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent">Send Announcement</button>
          <button className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent">Book Resource</button>
        </CardContent></Card>
      </div>
    </div>
  )
}
