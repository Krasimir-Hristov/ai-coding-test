import type {
  ApiResponse,
  CreateTaskInput,
  Task,
  TaskStatus,
  UpdateTaskInput,
} from '../types';

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

export interface DeletedTaskPayload {
  id: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isTaskStatus = (value: unknown): value is TaskStatus =>
  value === 'todo' || value === 'in_progress' || value === 'done';

const isTask = (value: unknown): value is Task =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.title === 'string' &&
  isTaskStatus(value.status) &&
  typeof value.createdAt === 'string';

const isTaskArray = (value: unknown): value is Task[] =>
  Array.isArray(value) && value.every(isTask);

const isDeletedTaskPayload = (value: unknown): value is DeletedTaskPayload =>
  isRecord(value) && typeof value.id === 'string' && value.id.length > 0;

const parseApiEnvelope = <T,>(
  payload: unknown,
  validateData: (value: unknown) => value is T,
): ApiResponse<T> | null => {
  if (!isRecord(payload) || typeof payload.ok !== 'boolean') {
    return null;
  }

  const error = typeof payload.error === 'string' ? payload.error : undefined;
  if (payload.ok) {
    return validateData(payload.data)
      ? { ok: true, data: payload.data, error }
      : null;
  }

  return { ok: false, error };
};

const getSafeErrorMessage = (
  candidate: string | undefined,
  fallback: string,
): string => {
  if (
    typeof candidate === 'string' &&
    candidate.trim().length > 0 &&
    candidate.length <= 200 &&
    !candidate.includes('\n')
  ) {
    return candidate.trim();
  }
  return fallback;
};

const requestTasksApi = async <T,>(
  url: string,
  init: RequestInit,
  validateData: (value: unknown) => value is T,
  apiFallbackError: string,
  networkFallbackError: string,
): Promise<ApiResult<T>> => {
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...init.headers,
      },
    });

    const payload: unknown = await response.json();
    const parsed = parseApiEnvelope<T>(payload, validateData);

    if (!response.ok || parsed === null || !parsed.ok || parsed.data === undefined) {
      return {
        data: null,
        error: getSafeErrorMessage(parsed?.error, apiFallbackError),
      };
    }

    return { data: parsed.data, error: null };
  } catch {
    return { data: null, error: networkFallbackError };
  }
};

export const fetchTaskList = async (): Promise<ApiResult<Task[]>> =>
  requestTasksApi<Task[]>(
    '/api/tasks',
    { method: 'GET', cache: 'no-store' },
    isTaskArray,
    'Unable to load your tasks right now. Please try refreshing.',
    'Could not connect to the task service. Please check your connection and try again.',
  );

export const createNewTask = async (
  input: CreateTaskInput,
): Promise<ApiResult<Task>> =>
  requestTasksApi<Task>(
    '/api/tasks',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    isTask,
    'Unable to create your task right now. Please try again.',
    'Could not save your task due to a network or server error. Please try again.',
  );

export const updateTaskStatusOrTitle = async (
  id: string,
  input: UpdateTaskInput,
): Promise<ApiResult<Task>> => {
  try {
    return await requestTasksApi<Task>(
      `/api/tasks/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
      isTask,
      'Unable to update this task right now. Please try again.',
      'Could not connect to the task service while updating this task. Please try again.',
    );
  } catch {
    return {
      data: null,
      error: 'Could not update this task right now. Please try again.',
    };
  }
};

export const deleteTaskById = async (
  id: string,
): Promise<ApiResult<{ id: string }>> => {
  try {
    return await requestTasksApi<DeletedTaskPayload>(
      `/api/tasks/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      isDeletedTaskPayload,
      'Unable to delete this task right now. Please try again.',
      'Could not connect to the task service while deleting this task. Please try again.',
    );
  } catch {
    return {
      data: null,
      error: 'Could not delete this task right now. Please try again.',
    };
  }
};
