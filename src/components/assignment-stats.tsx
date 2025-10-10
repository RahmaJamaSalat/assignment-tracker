import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { Assignment } from "@/types/assignment"
import { AlertCircle, BookOpen, CheckCircle, Clock } from "lucide-react"

interface AssignmentStatsProps {
  assignments: Assignment[]
}

const AssignmentStats = ({ assignments }: AssignmentStatsProps) => {
  const completed = assignments.filter((a) => a.status === "completed").length
  const inProgress = assignments.filter(
    (a) => a.status === "in-progress"
  ).length
  const overdue = assignments.filter(
    (a) => new Date() > new Date(a.dueDate) && a.status !== "completed"
  ).length

  const total = assignments.length
  const completionRate = total > 0 ? (completed / total) * 100 : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Assignments
          </CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{completed}</div>
          <div className="space-y-2 mt-2">
            <Progress value={completionRate} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {completionRate.toFixed(1)}% complete
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          <Clock className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{inProgress}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{overdue}</div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AssignmentStats
