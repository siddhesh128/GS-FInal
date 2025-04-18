"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlusCircle, Pencil, Trash } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

interface Subject {
  id: string
  name: string
  code: string
  description?: string
}

interface SubjectsManagementProps {
  subjects: Subject[]
}

export function SubjectsManagement({ subjects }: SubjectsManagementProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [newSubject, setNewSubject] = useState({
    name: "",
    code: "",
    description: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (editOpen && selectedSubject) {
      setSelectedSubject({ ...selectedSubject, [name]: value })
    } else {
      setNewSubject((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleCreateSubject = async () => {
    if (!newSubject.name || !newSubject.code) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Subject name and code are required",
      })
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch("/api/subjects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSubject),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to create subject")
      }

      toast({
        title: "Subject created",
        description: "The subject has been created successfully",
      })

      setOpen(false)
      setNewSubject({
        name: "",
        code: "",
        description: "",
      })
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to create subject",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditSubject = async () => {
    if (!selectedSubject || !selectedSubject.name || !selectedSubject.code) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Subject name and code are required",
      })
      return
    }

    setIsEditing(true)

    try {
      const response = await fetch(`/api/subjects/${selectedSubject.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: selectedSubject.name,
          code: selectedSubject.code,
          description: selectedSubject.description,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to update subject")
      }

      toast({
        title: "Subject updated",
        description: "The subject has been updated successfully",
      })

      setEditOpen(false)
      setSelectedSubject(null)
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to update subject",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsEditing(false)
    }
  }

  const handleDeleteSubject = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this subject?")) {
      setIsDeleting(true)

      try {
        const response = await fetch(`/api/subjects/${id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.message || "Failed to delete subject")
        }

        toast({
          title: "Subject deleted",
          description: "The subject has been deleted successfully",
        })

        router.refresh()
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Failed to delete subject",
          description: error instanceof Error ? error.message : "Something went wrong",
        })
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const openEditDialog = (subject: Subject) => {
    setSelectedSubject(subject)
    setEditOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Subject</DialogTitle>
              <DialogDescription>Add a new subject to the system</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={newSubject.name}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">
                  Code
                </Label>
                <Input
                  id="code"
                  name="code"
                  value={newSubject.code}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={newSubject.description}
                  onChange={handleInputChange}
                  className="col-span-3"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateSubject} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Subject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Subject</DialogTitle>
              <DialogDescription>Update subject information</DialogDescription>
            </DialogHeader>
            {selectedSubject && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="edit-name"
                    name="name"
                    value={selectedSubject.name}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-code" className="text-right">
                    Code
                  </Label>
                  <Input
                    id="edit-code"
                    name="code"
                    value={selectedSubject.code}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="edit-description" className="text-right pt-2">
                    Description
                  </Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    value={selectedSubject.description || ""}
                    onChange={handleInputChange}
                    className="col-span-3"
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" onClick={handleEditSubject} disabled={isEditing}>
                {isEditing ? "Updating..." : "Update Subject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {subjects.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <h3 className="text-lg font-medium">No subjects found</h3>
          <p className="text-sm text-muted-foreground">
            Create your first subject by clicking the 'Add Subject' button above.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((subject) => (
              <TableRow key={subject.id}>
                <TableCell className="font-medium">{subject.name}</TableCell>
                <TableCell>{subject.code}</TableCell>
                <TableCell>{subject.description || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(subject)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSubject(subject.id)}
                      disabled={isDeleting}
                    >
                      <Trash className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
