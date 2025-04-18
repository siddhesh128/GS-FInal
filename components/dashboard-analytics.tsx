"use client"
import { useTheme } from "next-themes"

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AnalyticsData {
  totalStudents: number
  totalFaculty: number
  totalExams: number
  totalEnrollments: number
  examsByMonth: {
    month: string
    count: number
  }[]
  enrollmentsByExam: {
    exam: string
    students: number
  }[]
}

interface DashboardAnalyticsProps {
  data: AnalyticsData
}

export function DashboardAnalytics({ data }: DashboardAnalyticsProps) {
  const { theme } = useTheme()
  const barColor = theme === "dark" ? "#4CAF50" : "#1976D2"
  const tickColor = theme === "dark" ? "#ffffff" : "var(--foreground)"
  const tooltipBg = theme === "dark" ? "#1e1e1e" : "var(--background)"
  const tooltipBorder = theme === "dark" ? "#333333" : "var(--border)"
  const tooltipText = theme === "dark" ? "#ffffff" : "var(--foreground)"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exam Analytics</CardTitle>
        <CardDescription>Overview of exams and enrollments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.examsByMonth}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: tickColor }}
                tickLine={{ stroke: "var(--border)" }}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: tickColor }}
                tickLine={{ stroke: "var(--border)" }}
                axisLine={{ stroke: "var(--border)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  color: tooltipText,
                  borderRadius: "0.5rem",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.2)",
                }}
                labelStyle={{ color: tooltipText }}
                itemStyle={{ color: tooltipText }}
              />
              <Legend
                wrapperStyle={{
                  color: tooltipText,
                }}
              />
              <Bar dataKey="count" name="Exams" fill={barColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
