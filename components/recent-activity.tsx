"use client"

import { formatDistanceToNow } from "date-fns"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Activity {
  id: string
  type: string
  title: string
  description: string
  createdAt: string
}

interface RecentActivityProps {
  activities: Activity[]
  userRole: string
}

export function RecentActivity({ activities, userRole }: RecentActivityProps) {
  // If no activities, show placeholder
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your recent activity in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your recent activity in the system</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="space-y-0">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 px-6 py-4 border-b last:border-0 hover:bg-muted/50 transition-colors"
            >
              <div className={`mt-0.5 h-2 w-2 rounded-full ${getActivityTypeColor(activity.type)}`} />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function getActivityTypeColor(type: string): string {
  switch (type) {
    case "enrollment":
      return "bg-green-500"
    case "exam":
      return "bg-blue-500"
    case "result":
      return "bg-purple-500"
    case "registration":
      return "bg-amber-500"
    default:
      return "bg-gray-500"
  }
}
