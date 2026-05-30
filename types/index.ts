export type Role = 'EMPLOYEE' | 'MANAGER' | 'ADMIN';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string;
  assignedToId?: string;
  createdById: string;
  createdAt: string;
}

export interface WorkLog {
  id: string;
  taskId: string;
  userId: string;
  entryText: string;
  rawNotes?: string;
  createdAt: string;
}

export type VerificationStatus = 'GENUINE' | 'WARNING' | 'FLAGGED';

export interface AIVerification {
  status: VerificationStatus;
  confidenceScore: number;
  reasoning: string;
}

export interface WorkLogSubmission {
  taskId: string;
  userId: string;
  logText: string;
  rawNotes?: string;
}
