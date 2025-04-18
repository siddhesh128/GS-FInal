"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlusCircle, Pencil, Trash, Building, DoorOpen } from "lucide-react"

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Building {
  id: string
  name: string
  number: string
  address?: string
}

interface Room {
  id: string
  roomNumber: string
  buildingId: string
  floor: string
  capacity: string
  building?: {
    name: string
    number: string
  }
}

interface BuildingsManagementProps {
  buildings: Building[]
  rooms: Room[]
}

export function BuildingsManagement({ buildings: initialBuildings, rooms: initialRooms }: BuildingsManagementProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [buildings, setBuildings] = useState<Building[]>(initialBuildings)
  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [buildingDialogOpen, setBuildingDialogOpen] = useState(false)
  const [roomDialogOpen, setRoomDialogOpen] = useState(false)
  const [isCreatingBuilding, setIsCreatingBuilding] = useState(false)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isEditingBuilding, setIsEditingBuilding] = useState(false)
  const [isEditingRoom, setIsEditingRoom] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [newBuilding, setNewBuilding] = useState({
    name: "",
    number: "",
    address: "",
  })
  const [newRoom, setNewRoom] = useState({
    roomNumber: "",
    buildingId: "",
    floor: "",
    capacity: "",
  })

  const handleBuildingInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (isEditingBuilding && selectedBuilding) {
      setSelectedBuilding({ ...selectedBuilding, [name]: value })
    } else {
      setNewBuilding((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleRoomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (isEditingRoom && selectedRoom) {
      setSelectedRoom({ ...selectedRoom, [name]: value })
    } else {
      setNewRoom((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleBuildingSelectChange = (value: string) => {
    if (isEditingRoom && selectedRoom) {
      setSelectedRoom({ ...selectedRoom, buildingId: value })
    } else {
      setNewRoom((prev) => ({ ...prev, buildingId: value }))
    }
  }

  const handleCreateBuilding = async () => {
    if (!newBuilding.name || !newBuilding.number) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Building name and number are required",
      })
      return
    }

    setIsCreatingBuilding(true)

    try {
      const response = await fetch("/api/buildings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newBuilding),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to create building")
      }

      const newBuildingData = await response.json()

      toast({
        title: "Building created",
        description: "The building has been created successfully",
      })

      setBuildingDialogOpen(false)
      setNewBuilding({
        name: "",
        number: "",
        address: "",
      })
      setBuildings([...buildings, newBuildingData])
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to create building",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsCreatingBuilding(false)
    }
  }

  const handleCreateRoom = async () => {
    if (!newRoom.roomNumber || !newRoom.buildingId || !newRoom.floor || !newRoom.capacity) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "All fields are required",
      })
      return
    }

    setIsCreatingRoom(true)

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newRoom),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to create room")
      }

      const newRoomData = await response.json()

      toast({
        title: "Room created",
        description: "The room has been created successfully",
      })

      setRoomDialogOpen(false)
      setNewRoom({
        roomNumber: "",
        buildingId: "",
        floor: "",
        capacity: "",
      })

      // Fetch the building details for the new room
      const building = buildings.find((b) => b.id === newRoom.buildingId)
      newRoomData.building = building ? { name: building.name, number: building.number } : undefined

      setRooms([...rooms, newRoomData])
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to create room",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsCreatingRoom(false)
    }
  }

  const handleUpdateBuilding = async () => {
    if (!selectedBuilding || !selectedBuilding.name || !selectedBuilding.number) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Building name and number are required",
      })
      return
    }

    setIsEditingBuilding(true)

    try {
      const response = await fetch(`/api/buildings/${selectedBuilding.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: selectedBuilding.name,
          number: selectedBuilding.number,
          address: selectedBuilding.address,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to update building")
      }

      const updatedBuildingData = await response.json()

      toast({
        title: "Building updated",
        description: "The building has been updated successfully",
      })

      setBuildingDialogOpen(false)
      setSelectedBuilding(null)
      setBuildings(buildings.map((b) => (b.id === updatedBuildingData.id ? updatedBuildingData : b)))
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to update building",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsEditingBuilding(false)
    }
  }

  const handleUpdateRoom = async () => {
    if (
      !selectedRoom ||
      !selectedRoom.roomNumber ||
      !selectedRoom.buildingId ||
      !selectedRoom.floor ||
      !selectedRoom.capacity
    ) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "All fields are required",
      })
      return
    }

    setIsEditingRoom(true)

    try {
      const response = await fetch(`/api/rooms/${selectedRoom.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomNumber: selectedRoom.roomNumber,
          buildingId: selectedRoom.buildingId,
          floor: selectedRoom.floor,
          capacity: selectedRoom.capacity,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to update room")
      }

      const updatedRoomData = await response.json()

      toast({
        title: "Room updated",
        description: "The room has been updated successfully",
      })

      setRoomDialogOpen(false)
      setSelectedRoom(null)

      // Fetch the building details for the updated room
      const building = buildings.find((b) => b.id === selectedRoom.buildingId)
      updatedRoomData.building = building ? { name: building.name, number: building.number } : undefined

      setRooms(rooms.map((r) => (r.id === updatedRoomData.id ? updatedRoomData : r)))
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to update room",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsEditingRoom(false)
    }
  }

  const handleDeleteBuilding = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this building? All associated rooms will also be deleted.")) {
      try {
        const response = await fetch(`/api/buildings/${id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.message || "Failed to delete building")
        }

        toast({
          title: "Building deleted",
          description: "The building has been deleted successfully",
        })

        setBuildings(buildings.filter((b) => b.id !== id))
        setRooms(rooms.filter((r) => r.buildingId !== id))
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Failed to delete building",
          description: error instanceof Error ? error.message : "Something went wrong",
        })
      }
    }
  }

  const handleDeleteRoom = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this room?")) {
      try {
        const response = await fetch(`/api/rooms/${id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.message || "Failed to delete room")
        }

        toast({
          title: "Room deleted",
          description: "The room has been deleted successfully",
        })

        setRooms(rooms.filter((r) => r.id !== id))
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Failed to delete room",
          description: error instanceof Error ? error.message : "Something went wrong",
        })
      }
    }
  }

  const openEditBuildingDialog = (building: Building) => {
    setSelectedBuilding(building)
    setIsEditingBuilding(true)
    setBuildingDialogOpen(true)
  }

  const openEditRoomDialog = (room: Room) => {
    setSelectedRoom(room)
    setIsEditingRoom(true)
    setRoomDialogOpen(true)
  }

  return (
    <Tabs defaultValue="buildings" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="buildings">Buildings</TabsTrigger>
        <TabsTrigger value="rooms">Rooms</TabsTrigger>
      </TabsList>

      <TabsContent value="buildings" className="space-y-4">
        <div className="flex justify-end">
          <Dialog
            open={buildingDialogOpen}
            onOpenChange={(open) => {
              setBuildingDialogOpen(open)
              if (!open) {
                setSelectedBuilding(null)
                setIsEditingBuilding(false)
                setNewBuilding({
                  name: "",
                  number: "",
                  address: "",
                })
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setIsEditingBuilding(false)
                  setSelectedBuilding(null)
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Building
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isEditingBuilding ? "Edit Building" : "Create New Building"}</DialogTitle>
                <DialogDescription>
                  {isEditingBuilding ? "Update building information" : "Add a new building to the system"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={isEditingBuilding && selectedBuilding ? selectedBuilding.name : newBuilding.name}
                    onChange={handleBuildingInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="number" className="text-right">
                    Number
                  </Label>
                  <Input
                    id="number"
                    name="number"
                    value={isEditingBuilding && selectedBuilding ? selectedBuilding.number : newBuilding.number}
                    onChange={handleBuildingInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="address" className="text-right pt-2">
                    Address
                  </Label>
                  <Textarea
                    id="address"
                    name="address"
                    value={isEditingBuilding && selectedBuilding ? selectedBuilding.address || "" : newBuilding.address}
                    onChange={handleBuildingInputChange}
                    className="col-span-3"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  onClick={isEditingBuilding ? handleUpdateBuilding : handleCreateBuilding}
                  disabled={isCreatingBuilding || isEditingBuilding}
                >
                  {isEditingBuilding
                    ? isEditingBuilding
                      ? "Updating..."
                      : "Update Building"
                    : isCreatingBuilding
                      ? "Creating..."
                      : "Create Building"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {buildings.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center">
            <Building className="mx-auto h-10 w-10 text-muted-foreground/80" />
            <h3 className="mt-4 text-lg font-medium">No buildings found</h3>
            <p className="text-sm text-muted-foreground">
              Create your first building by clicking the 'Add Building' button above.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings.map((building) => (
                <TableRow key={building.id}>
                  <TableCell className="font-medium">{building.name}</TableCell>
                  <TableCell>{building.number}</TableCell>
                  <TableCell>{building.address || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEditBuildingDialog(building)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteBuilding(building.id)}>
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
      </TabsContent>

      <TabsContent value="rooms" className="space-y-4">
        <div className="flex justify-end">
          <Dialog
            open={roomDialogOpen}
            onOpenChange={(open) => {
              setRoomDialogOpen(open)
              if (!open) {
                setSelectedRoom(null)
                setIsEditingRoom(false)
                setNewRoom({
                  roomNumber: "",
                  buildingId: "",
                  floor: "",
                  capacity: "",
                })
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setIsEditingRoom(false)
                  setSelectedRoom(null)
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isEditingRoom ? "Edit Room" : "Create New Room"}</DialogTitle>
                <DialogDescription>
                  {isEditingRoom ? "Update room information" : "Add a new room to the system"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="buildingId" className="text-right">
                    Building
                  </Label>
                  <Select
                    onValueChange={handleBuildingSelectChange}
                    value={isEditingRoom && selectedRoom ? selectedRoom.buildingId : newRoom.buildingId}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select building" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map((building) => (
                        <SelectItem key={building.id} value={building.id}>
                          {building.name} ({building.number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="roomNumber" className="text-right">
                    Room Number
                  </Label>
                  <Input
                    id="roomNumber"
                    name="roomNumber"
                    value={isEditingRoom && selectedRoom ? selectedRoom.roomNumber : newRoom.roomNumber}
                    onChange={handleRoomInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="floor" className="text-right">
                    Floor
                  </Label>
                  <Input
                    id="floor"
                    name="floor"
                    value={isEditingRoom && selectedRoom ? selectedRoom.floor : newRoom.floor}
                    onChange={handleRoomInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="capacity" className="text-right">
                    Capacity
                  </Label>
                  <Input
                    id="capacity"
                    name="capacity"
                    type="number"
                    value={isEditingRoom && selectedRoom ? selectedRoom.capacity : newRoom.capacity}
                    onChange={handleRoomInputChange}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  onClick={isEditingRoom ? handleUpdateRoom : handleCreateRoom}
                  disabled={isCreatingRoom || isEditingRoom}
                >
                  {isEditingRoom
                    ? isEditingRoom
                      ? "Updating..."
                      : "Update Room"
                    : isCreatingRoom
                      ? "Creating..."
                      : "Create Room"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {rooms.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center">
            <DoorOpen className="mx-auto h-10 w-10 text-muted-foreground/80" />
            <h3 className="mt-4 text-lg font-medium">No rooms found</h3>
            <p className="text-sm text-muted-foreground">
              Create your first room by clicking the 'Add Room' button above.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Building</TableHead>
                <TableHead>Room Number</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell>
                    {room.building ? `${room.building.name} (${room.building.number})` : "Unknown Building"}
                  </TableCell>
                  <TableCell className="font-medium">{room.roomNumber}</TableCell>
                  <TableCell>{room.floor}</TableCell>
                  <TableCell>{room.capacity}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEditRoomDialog(room)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteRoom(room.id)}>
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
      </TabsContent>
    </Tabs>
  )
}
