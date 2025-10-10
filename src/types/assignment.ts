export interface Assignment {
  id: string
  title: string
  description: string
  subject: string
  dueDate: Date
  status: "not-started" | "in-progress" | "completed"
  createdAt: Date
  priority: "low" | "medium" | "high"
}

export interface AssignmentFormData {
  title: string
  description: string
  subject: string
  dueDate: string
  priority: "low" | "medium" | "high"
}
