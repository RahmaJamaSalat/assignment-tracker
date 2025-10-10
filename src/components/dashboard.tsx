"use client"

import AssignmentCard from "@/components/assignment-card"
import AssignmentForm from "@/components/assignment-form"
import AssignmentStats from "@/components/assignment-stats"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { Assignment, AssignmentFormData } from "@/types/assignment"
import { Bell, Filter, GraduationCap, Plus, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

const Dashboard = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("dueDate")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [notifications, setNotifications] = useState<
    Array<{
      id: string
      message: string
      time: string
      read: boolean
    }>
  >([])
  const { toast } = useToast()

  // Load assignments from localStorage on component mount
  useEffect(() => {
    const savedAssignments = localStorage.getItem("assignments")
    if (savedAssignments) {
      const parsed = JSON.parse(savedAssignments)
      setAssignments(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parsed.map((a: any) => ({
          ...a,
          dueDate: new Date(a.dueDate),
          createdAt: new Date(a.createdAt),
        }))
      )
    }
  }, [])

  // Save assignments to localStorage whenever assignments change
  useEffect(() => {
    localStorage.setItem("assignments", JSON.stringify(assignments))
  }, [assignments])

  // Generate notifications for assignments due soon
  useEffect(() => {
    const generateNotifications = () => {
      const now = new Date()
      const upcomingAssignments = assignments.filter((assignment) => {
        const dueDate = new Date(assignment.dueDate)
        const timeDiff = dueDate.getTime() - now.getTime()
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))
        return (
          daysDiff <= 3 && daysDiff >= 0 && assignment.status !== "completed"
        )
      })

      const newNotifications = upcomingAssignments.map((assignment) => {
        const dueDate = new Date(assignment.dueDate)
        const timeDiff = dueDate.getTime() - now.getTime()
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))
        let timeMessage = ""

        if (daysDiff === 0) {
          timeMessage = "Due today!"
        } else if (daysDiff === 1) {
          timeMessage = "Due tomorrow"
        } else {
          timeMessage = `Due in ${daysDiff} days`
        }

        return {
          id: `${assignment.id}-due`,
          message: `${assignment.title} - ${timeMessage}`,
          time: new Date().toLocaleTimeString(),
          read: false,
        }
      })

      setNotifications(newNotifications)
    }

    generateNotifications()
  }, [assignments])

  const addAssignment = (formData: AssignmentFormData) => {
    const newAssignment: Assignment = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      subject: formData.subject,
      dueDate: new Date(formData.dueDate),
      status: "not-started",
      createdAt: new Date(),
      priority: formData.priority,
    }

    setAssignments((prev) => [...prev, newAssignment])
    setIsAddDialogOpen(false)
    toast({
      title: "Assignment Added",
      description: `"${formData.title}" has been added to your assignments.`,
    })
  }

  const updateAssignmentStatus = (id: string, status: Assignment["status"]) => {
    setAssignments((prev) =>
      prev.map((assignment) =>
        assignment.id === id ? { ...assignment, status } : assignment
      )
    )

    const assignment = assignments.find((a) => a.id === id)
    if (assignment) {
      toast({
        title: "Status Updated",
        description: `"${assignment.title}" marked as ${status.replace(
          "-",
          " "
        )}.`,
      })
    }
  }

  const filteredAndSortedAssignments = assignments
    .filter((assignment) => {
      const matchesSearch =
        assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.subject.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter =
        filterStatus === "all" || assignment.status === filterStatus
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "dueDate":
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        case "status":
          return a.status.localeCompare(b.status)
        default:
          return 0
      }
    })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-4">
              <div className="p-3 bg-blue-600 rounded-full">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900">
                Assignment Tracker
              </h1>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl">
              Stay organized, track progress, and never miss a deadline. Your
              academic success starts here.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="hidden sm:flex">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Assignment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Assignment</DialogTitle>
                </DialogHeader>
                <AssignmentForm onSubmit={addAssignment} />
              </DialogContent>
            </Dialog>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-8 w-8" />
                  {notifications.filter((n) => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications.filter((n) => !n.read).length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex flex-col items-start p-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setNotifications((prev) =>
                          prev.map((n) =>
                            n.id === notification.id ? { ...n, read: true } : n
                          )
                        )
                      }}
                    >
                      <div
                        className={`font-medium ${
                          !notification.read ? "text-blue-600" : "text-gray-900"
                        }`}
                      >
                        {notification.message}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {notification.time}
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
                {notifications.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-center justify-center"
                      onClick={() => {
                        setNotifications((prev) =>
                          prev.map((n) => ({ ...n, read: true }))
                        )
                      }}
                    >
                      Mark all as read
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="/placeholder-user.jpg" alt="Student" />
                    <AvatarFallback>ST</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex flex-col items-start p-3">
                  <div className="font-medium">John Doe</div>
                  <div className="text-sm text-gray-500">
                    john.doe@email.com
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Add Button */}
        <div className="sm:hidden mb-6">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Add Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Assignment</DialogTitle>
              </DialogHeader>
              <AssignmentForm onSubmit={addAssignment} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview */}
        <AssignmentStats assignments={assignments} />

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dueDate">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Assignments Grid */}
        {filteredAndSortedAssignments.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {assignments.length === 0
                ? "No assignments yet"
                : "No assignments match your filters"}
            </h3>
            <p className="text-gray-500 mb-4">
              {assignments.length === 0
                ? "Add your first assignment to get started!"
                : "Try adjusting your search or filters."}
            </p>
            {assignments.length === 0 && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Assignment
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedAssignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onStatusChange={updateAssignmentStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
