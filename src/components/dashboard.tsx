"use client"

import AssignmentCard from "@/components/assignment-card"
import AssignmentForm from "@/components/assignment-form"
import AssignmentStats from "@/components/assignment-stats"
import { AIChat, ChatButton } from "@/components/ai-chat"
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
import type { Notification } from "@/types/notification"
import { Bell, Calendar, Filter, GraduationCap, Plus, Search } from "lucide-react"
import { useEffect, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { CalendarSettings } from "./calendar-settings"

const Dashboard = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("dueDate")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isChatOpen, setIsChatOpen] = useState(false)
  const { toast } = useToast()

  // Fetch assignments from API on component mount
  useEffect(() => {
    fetchAssignments()
  }, [toast])

  const fetchAssignments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/assignments")
      if (response.ok) {
        const data: Array<{
          id: string;
          title: string;
          description: string;
          subject: string;
          dueDate: string;
          status: "not-started" | "in-progress" | "completed";
          priority: "low" | "medium" | "high";
          createdAt: string;
          userId: number;
        }> = await response.json()
        setAssignments(
          data.map((a) => ({
            ...a,
            dueDate: new Date(a.dueDate),
            createdAt: new Date(a.createdAt),
          }))
        )
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch assignments",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching assignments:", error)
      toast({
        title: "Error",
        description: "Failed to fetch assignments",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch notifications from API
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch("/api/notifications")
        if (response.ok) {
          const data: Array<{
            id: string;
            message: string;
            type: string;
            read: boolean;
            createdAt: string;
            userId: number;
            assignmentId: string | null;
            assignment: {
              id: string;
              title: string;
              dueDate: string;
            } | null;
          }> = await response.json()
          setNotifications(
            data.map((n) => ({
              ...n,
              createdAt: new Date(n.createdAt),
              assignment: n.assignment
                ? {
                    ...n.assignment,
                    dueDate: new Date(n.assignment.dueDate),
                  }
                : null,
            }))
          )
        }
      } catch (error) {
        console.error("Error fetching notifications:", error)
      }
    }

    fetchNotifications()
  }, [])

  // Generate notifications for upcoming assignments
  useEffect(() => {
    const generateNotifications = async () => {
      try {
        await fetch("/api/notifications", {
          method: "POST",
        })
        // Fetch updated notifications
        const response = await fetch("/api/notifications")
        if (response.ok) {
          const data: Array<{
            id: string;
            message: string;
            type: string;
            read: boolean;
            createdAt: string;
            userId: number;
            assignmentId: string | null;
            assignment: {
              id: string;
              title: string;
              dueDate: string;
            } | null;
          }> = await response.json()
          setNotifications(
            data.map((n) => ({
              ...n,
              createdAt: new Date(n.createdAt),
              assignment: n.assignment
                ? {
                    ...n.assignment,
                    dueDate: new Date(n.assignment.dueDate),
                  }
                : null,
            }))
          )
        }
      } catch (error) {
        console.error("Error generating notifications:", error)
      }
    }

    if (assignments.length > 0) {
      generateNotifications()
    }
  }, [assignments])

  // Helper function to refetch notifications
  const refetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications")
      if (response.ok) {
        const data: Array<{
          id: string;
          message: string;
          type: string;
          read: boolean;
          createdAt: string;
          userId: number;
          assignmentId: string | null;
          assignment: {
            id: string;
            title: string;
            dueDate: string;
          } | null;
        }> = await response.json()
        setNotifications(
          data.map((n) => ({
            ...n,
            createdAt: new Date(n.createdAt),
            assignment: n.assignment
              ? {
                  ...n.assignment,
                  dueDate: new Date(n.assignment.dueDate),
                }
              : null,
          }))
        )
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  // Handler for when AI makes changes to data
  const handleDataRefresh = async () => {
    await fetchAssignments()
    await refetchNotifications()
  }

  const addAssignment = async (formData: AssignmentFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const newAssignment = await response.json()
        setAssignments((prev) => [
          ...prev,
          {
            ...newAssignment,
            dueDate: new Date(newAssignment.dueDate),
            createdAt: new Date(newAssignment.createdAt),
          },
        ])
        // Refetch notifications after adding assignment
        await refetchNotifications()
        setIsAddDialogOpen(false)
        toast({
          title: "Assignment Added",
          description: `"${formData.title}" has been added to your assignments.`,
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to add assignment",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding assignment:", error)
      toast({
        title: "Error",
        description: "Failed to add assignment",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateAssignmentStatus = async (
    id: string,
    status: Assignment["status"]
  ) => {
    const assignment = assignments.find((a) => a.id === id)
    
    // Optimistic update - update UI immediately
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status } : a
      )
    )

    try {
      const response = await fetch(`/api/assignments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        const updatedAssignment = await response.json()
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...updatedAssignment,
                  dueDate: new Date(updatedAssignment.dueDate),
                  createdAt: new Date(updatedAssignment.createdAt),
                }
              : a
          )
        )

        // Refetch notifications after updating assignment
        await refetchNotifications()

        if (assignment) {
          toast({
            title: "Status Updated",
            description: `"${assignment.title}" marked as ${status.replace(
              "-",
              " "
            )}.`,
          })
        }
      } else {
        // Revert optimistic update on error
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === id && assignment ? { ...assignment } : a
          )
        )
        toast({
          title: "Error",
          description: "Failed to update assignment",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating assignment:", error)
      // Revert optimistic update on error
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === id && assignment ? { ...assignment } : a
        )
      )
      toast({
        title: "Error",
        description: "Failed to update assignment",
        variant: "destructive",
      })
    }
  }

  const deleteAssignment = async (id: string) => {
    const assignment = assignments.find((a) => a.id === id)
    
    if (!assignment) return

    // Optimistic update - remove from UI immediately
    setAssignments((prev) => prev.filter((a) => a.id !== id))

    try {
      const response = await fetch(`/api/assignments/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Refetch notifications after deleting assignment
        await refetchNotifications()

        toast({
          title: "Assignment Deleted",
          description: `"${assignment.title}" has been deleted.`,
        })
      } else {
        // Revert optimistic update on error
        setAssignments((prev) => [...prev, assignment].sort((a, b) => {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        }))
        toast({
          title: "Error",
          description: "Failed to delete assignment",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting assignment:", error)
      // Revert optimistic update on error
      setAssignments((prev) => [...prev, assignment].sort((a, b) => {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }))
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive",
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
                <AssignmentForm onSubmit={addAssignment} isLoading={isSubmitting} />
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
                      onClick={async () => {
                        // Mark as read in the API
                        try {
                          await fetch(`/api/notifications/${notification.id}`, {
                            method: "PATCH",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ read: true }),
                          })
                          // Update local state
                          setNotifications((prev) =>
                            prev.map((n) =>
                              n.id === notification.id ? { ...n, read: true } : n
                            )
                          )
                        } catch (error) {
                          console.error("Error marking notification as read:", error)
                        }
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
                        {new Date(notification.createdAt).toLocaleString()}
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
                {notifications.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-center justify-center"
                      onClick={async () => {
                        try {
                          await fetch("/api/notifications/mark-all-read", {
                            method: "POST",
                          })
                          // Update local state
                          setNotifications((prev) =>
                            prev.map((n) => ({ ...n, read: true }))
                          )
                        } catch (error) {
                          console.error("Error marking all as read:", error)
                        }
                      }}
                    >
                      Mark all as read
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Calendar Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Calendar className="h-8 w-8" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[550px]">
                <CalendarSettings />
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
              <AssignmentForm onSubmit={addAssignment} isLoading={isSubmitting} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview */}
        <AssignmentStats assignments={assignments} />

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg shadow-sm">
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
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading assignments...</p>
          </div>
        ) : filteredAndSortedAssignments.length === 0 ? (
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
                onDelete={deleteAssignment}
              />
            ))}
          </div>
        )}
      </div>

      {/* AI Chat Interface */}
      <AIChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)}
        onDataChange={handleDataRefresh}
      />
      
      {/* Floating Chat Button */}
      {!isChatOpen && (
        <ChatButton
          onClick={() => setIsChatOpen(true)}
          hasUnread={false}
        />
      )}
    </div>
  )
}

export default Dashboard
