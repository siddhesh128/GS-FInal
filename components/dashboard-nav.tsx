"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Book,
  Building,
  Calendar,
  CheckSquare,
  FileText,
  Home,
  type LucideIcon,
  MapPin,
  Users,
  UserCheck,
  UserPlus,
} from "lucide-react"

import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  roles: string[]
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
    roles: ["ADMIN", "FACULTY", "STUDENT"],
  },
  {
    title: "Exams",
    href: "/dashboard/exams",
    icon: Calendar,
    roles: ["ADMIN", "FACULTY", "STUDENT"],
  },
  {
    title: "Subjects",
    href: "/dashboard/subjects",
    icon: Book,
    roles: ["ADMIN"],
  },
  {
    title: "Buildings & Rooms",
    href: "/dashboard/buildings",
    icon: Building,
    roles: ["ADMIN"],
  },
  {
    title: "Enrollments",
    href: "/dashboard/enrollments",
    icon: UserCheck,
    roles: ["ADMIN"],
  },
  {
    title: "Seating Arrangements",
    href: "/dashboard/seating",
    icon: MapPin,
    roles: ["ADMIN", "STUDENT"],
  },
  {
    title: "Seating Overview",
    href: "/dashboard/seating-view",
    icon: MapPin,
    roles: ["ADMIN"],
  },
  {
    title: "Attendance",
    href: "/dashboard/attendance",
    icon: CheckSquare,
    roles: ["ADMIN", "FACULTY"],
  },
  {
    title: "Hall Tickets",
    href: "/dashboard/hall-tickets",
    icon: FileText,
    roles: ["STUDENT"],
  },
  {
    title: "User Management",
    href: "/dashboard/users",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    title: "Registrations",
    href: "/dashboard/registrations",
    icon: UserPlus,
    roles: ["ADMIN"],
  },
  {
    title: "Results",
    href: "/dashboard/results",
    icon: FileText,
    roles: ["ADMIN", "STUDENT"],
  },
]

interface DashboardNavProps {
  role: string
}

export function DashboardNav({ role }: DashboardNavProps) {
  const pathname = usePathname()

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter((item) => item.roles.includes(role))

  return (
    <nav className="grid items-start gap-2 p-4">
      {filteredNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
            pathname === item.href ? "bg-accent text-accent-foreground" : "transparent",
          )}
        >
          <item.icon className="mr-2 h-4 w-4" />
          <span>{item.title}</span>
        </Link>
      ))}
    </nav>
  )
}
