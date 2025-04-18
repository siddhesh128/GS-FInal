"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Database } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export function SeedDatabase() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSeeding, setIsSeeding] = useState(false)

  const handleSeed = async () => {
    setIsSeeding(true)

    try {
      const response = await fetch("/api/seed", {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to seed database")
      }

      toast({
        title: "Database seeded successfully",
        description: "Sample data has been added to the database",
      })

      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Seeding failed",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleSeed} disabled={isSeeding} className="flex items-center gap-2">
      <Database className="h-4 w-4" />
      {isSeeding ? "Seeding Database..." : "Seed Database"}
    </Button>
  )
}
