import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput } from '../types';

const VALID_TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'done'];
const TITLE_MIN_LENGTH = 1;
const TITLE_MAX_LENGTH = 120;
const TITLE_VALIDATION_ERROR = 'Title must be between 1 and 120 characters.';
const STATUS_VALIDATION_ERROR = 'Status must be one of: todo, in_progress, done.';
const TASK_NOT_FOUND_ERROR = 'Task not found.';

/** Error thrown when task input fails domain validation rules. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** Error thrown when a requested task ID does not exist in the store. */
export class TaskNotFoundError extends Error {
  constructor(message: string = TASK_NOT_FOUND_ERROR) {
    super(message);
    this.name = 'TaskNotFoundError';
  }
}

/** Error thrown when reading from or writing to the task store fails. */
export class TaskStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskStorageError';
  }
}

let storageQueue: Promise<void> = Promise.resolve();

const runExclusive = <T>(operation: () => Promise<T>): Promise<T> => {
  const next = storageQueue.then(operation, operation);
  storageQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
};

const getDataDirectory = (): string => path.join(process.cwd(), 'data');

const getTasksFilePath = (): string => path.join(getDataDirectory(), 'tasks.json');

const getErrorCode = (error: unknown): string | null => {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return typeof error.code === 'string' ? error.code : null;
  }
  return null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isTaskStatus = (value: unknown): value is TaskStatus =>
  typeof value === 'string' &&
  VALID_TASK_STATUSES.some((status) => status === value);

const isTask = (value: unknown): value is Task => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.title === 'string' &&
    isTaskStatus(value.status) &&
    typeof value.createdAt === 'string'
  );
};

const validateTaskId = (rawId: unknown): string => {
  if (typeof rawId !== 'string' || rawId.trim().length === 0) {
    throw new ValidationError('Task id is required.');
  }
  return rawId.trim();
};

const validateTitle = (rawTitle: unknown): string => {
  if (typeof rawTitle !== 'string') {
    throw new ValidationError(TITLE_VALIDATION_ERROR);
  }
  const trimmed = rawTitle.trim();
  if (trimmed.length < TITLE_MIN_LENGTH || trimmed.length > TITLE_MAX_LENGTH) {
    throw new ValidationError(TITLE_VALIDATION_ERROR);
  }
  return trimmed;
};

const validateStatus = (rawStatus: unknown): TaskStatus => {
  if (!isTaskStatus(rawStatus)) {
    throw new ValidationError(STATUS_VALIDATION_ERROR);
  }
  return rawStatus;
};

const rethrowKnownOrStorageError = (error: unknown, fallbackMessage: string): never => {
  if (
    error instanceof ValidationError ||
    error instanceof TaskNotFoundError ||
    error instanceof TaskStorageError
  ) {
    throw error;
  }
  throw new TaskStorageError(fallbackMessage);
};

const ensureDataDirectory = async (): Promise<void> => {
  try {
    await mkdir(getDataDirectory(), { recursive: true });
  } catch {
    throw new TaskStorageError('Unable to initialize task storage directory.');
  }
};

const readTasksUnsafe = async (): Promise<Task[]> => {
  await ensureDataDirectory();
  const filePath = getTasksFilePath();

  let rawContent: string;
  try {
    rawContent = await readFile(filePath, 'utf-8');
  } catch (error: unknown) {
    if (getErrorCode(error) === 'ENOENT') {
      try {
        await writeFile(filePath, '[]\n', { encoding: 'utf-8', flag: 'wx' });
      } catch (initError: unknown) {
        if (getErrorCode(initError) !== 'EEXIST') {
          throw new TaskStorageError('Unable to initialize task storage file.');
        }
      }
      return [];
    }
    throw new TaskStorageError('Unable to read tasks from storage.');
  }

  if (rawContent.trim().length === 0) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new TaskStorageError('Task storage file contains invalid JSON.');
  }

  if (!Array.isArray(parsed) || !parsed.every(isTask)) {
    throw new TaskStorageError('Task storage file contains invalid task records.');
  }

  return parsed.map((task) => ({ ...task }));
};

const writeTasksUnsafe = async (tasks: readonly Task[]): Promise<void> => {
  await ensureDataDirectory();
  const filePath = getTasksFilePath();

  try {
    const serialized = `${JSON.stringify(tasks, null, 2)}\n`;
    await writeFile(filePath, serialized, 'utf-8');
  } catch {
    throw new TaskStorageError('Unable to save tasks to storage.');
  }
};

/**
 * Lists all persisted tasks from the JSON store.
 */
export const listTasks = async (): Promise<Task[]> =>
  runExclusive(async () => {
    try {
      return await readTasksUnsafe();
    } catch (error: unknown) {
      return rethrowKnownOrStorageError(error, 'Unable to load tasks.');
    }
  });

/**
 * Validates input, creates a new task with default 'todo' status, and persists it.
 */
export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  const validatedTitle = validateTitle(isRecord(input) ? input.title : undefined);

  return runExclusive(async () => {
    try {
      const existingTasks = await readTasksUnsafe();
      const newTask: Task = {
        id: randomUUID(),
        title: validatedTitle,
        status: 'todo',
        createdAt: new Date().toISOString(),
      };

      await writeTasksUnsafe([...existingTasks, newTask]);
      return { ...newTask };
    } catch (error: unknown) {
      return rethrowKnownOrStorageError(error, 'Unable to create task.');
    }
  });
};

/**
 * Validates input, updates an existing task's title and/or status, and persists it.
 */
export const updateTask = async (id: string, input: UpdateTaskInput): Promise<Task> => {
  const normalizedId = validateTaskId(id);
  if (!isRecord(input)) {
    throw new ValidationError('At least one of title or status must be provided.');
  }

  const hasTitle = input.title !== undefined;
  const hasStatus = input.status !== undefined;
  if (!hasTitle && !hasStatus) {
    throw new ValidationError('At least one of title or status must be provided.');
  }

  const validatedTitle = hasTitle ? validateTitle(input.title) : undefined;
  const validatedStatus = hasStatus ? validateStatus(input.status) : undefined;

  return runExclusive(async () => {
    try {
      const existingTasks = await readTasksUnsafe();
      const taskIndex = existingTasks.findIndex((task) => task.id === normalizedId);
      if (taskIndex === -1) {
        throw new TaskNotFoundError(TASK_NOT_FOUND_ERROR);
      }

      const updatedTask: Task = {
        ...existingTasks[taskIndex],
        ...(validatedTitle !== undefined ? { title: validatedTitle } : {}),
        ...(validatedStatus !== undefined ? { status: validatedStatus } : {}),
      };
      const updatedTasks = existingTasks.map((task, index) =>
        index === taskIndex ? updatedTask : task,
      );
      await writeTasksUnsafe(updatedTasks);
      return { ...updatedTask };
    } catch (error: unknown) {
      return rethrowKnownOrStorageError(error, 'Unable to update task.');
    }
  });
};

/**
 * Removes a task by ID from the persistent store.
 */
export const deleteTask = async (id: string): Promise<{ id: string }> => {
  const normalizedId = validateTaskId(id);

  return runExclusive(async () => {
    try {
      const existingTasks = await readTasksUnsafe();
      if (!existingTasks.some((task) => task.id === normalizedId)) {
        throw new TaskNotFoundError(TASK_NOT_FOUND_ERROR);
      }

      const remainingTasks = existingTasks.filter((task) => task.id !== normalizedId);
      await writeTasksUnsafe(remainingTasks);
      return { id: normalizedId };
    } catch (error: unknown) {
      return rethrowKnownOrStorageError(error, 'Unable to delete task.');
    }
  });
};
