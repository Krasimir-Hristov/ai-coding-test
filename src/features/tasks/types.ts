export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: string;
}

export interface CreateTaskInput {
  title: string;
}

export interface UpdateTaskInput {
  title?: string;
  status?: TaskStatus;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
