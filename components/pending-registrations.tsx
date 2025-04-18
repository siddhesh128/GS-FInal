"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"

interface PendingRegistration {
  id: string
  name: string
  email: string
  createdAt: string
}

interface PendingRegistrationsProps {
  registrations: PendingRegistration[]
}

export function PendingRegistrations({ registrations: initialRegistrations }: PendingRegistrationsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [registrations, setRegistrations] = useState<PendingRegistration[]>(initialRegistrations)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleApprove = async (id: string) => {
    setProcessingId(id)
    try {
      const response = await fetch(`/api/registrations/${id}/approve`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to approve registration")
      }

      toast({
        title: "Registration approved",
        description: "The student account has been created successfully",
      })

      // Remove from the list
      setRegistrations(registrations.filter((reg) => reg.id !== id))
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to approve registration",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: string) => {
    setProcessingId(id)
    try {
      const response = await fetch(`/api/registrations/${id}/reject`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to reject registration")
      }

      toast({
        title: "Registration rejected",
        description: "The registration request has been rejected",
      })

      // Remove from the list
      setRegistrations(registrations.filter((reg) => reg.id !== id))
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to reject registration",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setProcessingId(null)
    }
  }

  if (registrations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Registrations</CardTitle>
          <CardDescription>Approve or reject student registration requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground">No pending registrations</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Registrations</CardTitle>
        <CardDescription>Approve or reject student registration requests</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations.map((registration) => (
              <TableRow key={registration.id}>
                <TableCell className="font-medium">{registration.name}</TableCell>
                <TableCell>{registration.email}</TableCell>
                <TableCell>{new Date(registration.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700"
                      onClick={() => handleApprove(registration.id)}
                      disabled={processingId === registration.id}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700"
                      onClick={() => handleReject(registration.id)}
                      disabled={processingId === registration.id}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
