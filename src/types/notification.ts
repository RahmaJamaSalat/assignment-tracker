export interface Notification {
  id: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
  userId: number;
  assignmentId: string | null;
  assignment?: {
    id: string;
    title: string;
    dueDate: Date;
  } | null;
}
