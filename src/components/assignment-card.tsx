import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { Assignment } from "@/types/assignment"
import { BookOpen, Calendar, ChevronRight, Clock, Flag } from "lucide-react"
import { useState } from "react"

interface AssignmentCardProps {
  assignment: Assignment
  onStatusChange: (id: string, status: Assignment["status"]) => Promise<void>
}

const AssignmentCard = ({
  assignment,
  onStatusChange,
}: AssignmentCardProps) => {
  const [isUpdating, setIsUpdating] = useState(false)
  const { id, title, description, subject, dueDate, status, priority } =
    assignment

  const getStatusColor = (status: Assignment["status"]) => {
    switch (status) {
      case "not-started":
        return "bg-gray-100 text-gray-800"
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
    }
  }

  const getPriorityColor = (priority: Assignment["priority"]) => {
    switch (priority) {
      case "low":
        return "text-green-600"
      case "medium":
        return "text-yellow-600"
      case "high":
        return "text-red-600"
    }
  }

  const getProgress = (status: Assignment["status"]) => {
    switch (status) {
      case "not-started":
        return 0
      case "in-progress":
        return 50
      case "completed":
        return 100
    }
  }

  const getTimeUntilDue = () => {
    const now = new Date()
    const due = new Date(dueDate)
    const diffInHours = Math.ceil(
      (due.getTime() - now.getTime()) / (1000 * 60 * 60)
    )

    if (diffInHours < 0) return "Overdue"
    if (diffInHours < 24) return `${diffInHours}h left`
    if (diffInHours < 168) return `${Math.ceil(diffInHours / 24)}d left`
    return `${Math.ceil(diffInHours / 168)}w left`
  }

  const isOverdue = new Date() > new Date(dueDate) && status !== "completed"

  const nextStatus = () => {
    switch (status) {
      case "not-started":
        return "in-progress"
      case "in-progress":
        return "completed"
      case "completed":
        return "not-started"
    }
  }

  const getNextStatusLabel = () => {
    if (isUpdating) return "Updating..."
    switch (status) {
      case "not-started":
        return "Start"
      case "in-progress":
        return "Complete"
      case "completed":
        return "Reset"
    }
  }

  const handleStatusChange = async () => {
    setIsUpdating(true)
    try {
      await onStatusChange(id, nextStatus())
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card
      className={`w-full transition-all duration-200 hover:shadow-lg ${
        isOverdue ? "border-red-200 bg-red-50" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            {subject && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <BookOpen className="w-4 h-4" />
                {subject}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Flag className={`w-4 h-4 ${getPriorityColor(priority)}`} />
            <Badge className={getStatusColor(status)}>
              {status
                .replace("-", " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {description && <p className="text-sm text-gray-600">{description}</p>}

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span>Progress</span>
            <span>{getProgress(status)}%</span>
          </div>
          <Progress value={getProgress(status)} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Due: {new Date(dueDate).toLocaleDateString()}
          </div>
          <div
            className={`flex items-center gap-1 ${
              isOverdue ? "text-red-600 font-medium" : ""
            }`}
          >
            <Clock className="w-4 h-4" />
            {getTimeUntilDue()}
          </div>
        </div>

        <Button
          onClick={handleStatusChange}
          className="w-full"
          variant={status === "completed" ? "outline" : "default"}
          disabled={isUpdating}
        >
          {isUpdating && (
            <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
          )}
          {getNextStatusLabel()}
          {!isUpdating && <ChevronRight className="w-4 h-4 ml-2" />}
        </Button>
      </CardContent>
    </Card>
  )
}

export default AssignmentCard
