import type { Assignment, AssignmentFormData } from "@/types/assignment";

interface AssignmentResponse {
  id: string;
  title: string;
  description: string;
  subject: string;
  dueDate: string;
  status: "not-started" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  createdAt: string;
  userId: number;
}

export async function fetchAssignments(): Promise<Assignment[]> {
  const response = await fetch("/api/assignments");
  if (!response.ok) {
    throw new Error("Failed to fetch assignments");
  }
  const data: AssignmentResponse[] = await response.json();
  return data.map((a) => ({
    ...a,
    dueDate: new Date(a.dueDate),
    createdAt: new Date(a.createdAt),
  }));
}

export async function createAssignment(
  formData: AssignmentFormData
): Promise<Assignment> {
  const response = await fetch("/api/assignments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  });

  if (!response.ok) {
    throw new Error("Failed to create assignment");
  }

  const data = await response.json();
  return {
    ...data,
    dueDate: new Date(data.dueDate),
    createdAt: new Date(data.createdAt),
  };
}

export async function updateAssignment(
  id: string,
  updates: Partial<Assignment>
): Promise<Assignment> {
  const response = await fetch(`/api/assignments/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error("Failed to update assignment");
  }

  const data = await response.json();
  return {
    ...data,
    dueDate: new Date(data.dueDate),
    createdAt: new Date(data.createdAt),
  };
}

export async function deleteAssignment(id: string): Promise<void> {
  const response = await fetch(`/api/assignments/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete assignment");
  }
}
