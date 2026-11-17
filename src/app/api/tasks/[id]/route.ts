import { NextRequest, NextResponse } from 'next/server';

import {
  deleteTask,
  isTaskStatus,
  TaskNotFoundError,
  updateTask,
  ValidationError,
} from '@/features/tasks/dal/task-store';
import type { ApiResponse, Task, UpdateTaskInput } from '@/features/tasks/types';
import { scrubIncomingHeaders } from '@/proxy';

export const dynamic = 'force-dynamic';

interface TaskRouteContext {
  params: Promise<{ id: string }>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseUpdateTaskInput = (body: unknown): UpdateTaskInput => {
  if (!isRecord(body)) {
    throw new ValidationError('Request body must be a JSON object.');
  }

  const hasTitle = body.title !== undefined;
  const hasStatus = body.status !== undefined;

  if (!hasTitle && !hasStatus) {
    throw new ValidationError('At least one of title or status must be provided.');
  }

  const input: UpdateTaskInput = {};

  if (hasTitle) {
    if (typeof body.title !== 'string') {
      throw new ValidationError('Title must be between 1 and 120 characters.');
    }
    input.title = body.title;
  }

  if (hasStatus) {
    if (!isTaskStatus(body.status)) {
      throw new ValidationError('Status must be one of: todo, in_progress, done.');
    }
    input.status = body.status;
  }

  return input;
};

const handleRouteError = <T>(
  error: unknown,
  fallbackMessage: string,
): NextResponse<ApiResponse<T>> => {
  if (error instanceof ValidationError) {
    return NextResponse.json<ApiResponse<T>>(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  if (error instanceof TaskNotFoundError) {
    return NextResponse.json<ApiResponse<T>>(
      { ok: false, error: error.message },
      { status: 404 },
    );
  }

  return NextResponse.json<ApiResponse<T>>(
    { ok: false, error: fallbackMessage },
    { status: 500 },
  );
};

/**
 * Handles PATCH /api/tasks/[id] to update task title and/or status.
 */
export const PATCH = async (
  request: NextRequest,
  context: TaskRouteContext,
): Promise<NextResponse<ApiResponse<Task>>> => {
  try {
    scrubIncomingHeaders(request.headers);
    const { id } = await context.params;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json<ApiResponse<Task>>(
        { ok: false, error: 'Invalid JSON request body.' },
        { status: 400 },
      );
    }

    const input = parseUpdateTaskInput(rawBody);
    const updatedTask = await updateTask(id, input);

    return NextResponse.json<ApiResponse<Task>>(
      { ok: true, data: updatedTask },
      { status: 200 },
    );
  } catch (error: unknown) {
    return handleRouteError<Task>(
      error,
      'Failed to update task. Please try again later.',
    );
  }
};

/**
 * Handles DELETE /api/tasks/[id] to delete a task by ID.
 */
export const DELETE = async (
  request: NextRequest,
  context: TaskRouteContext,
): Promise<NextResponse<ApiResponse<{ id: string }>>> => {
  try {
    scrubIncomingHeaders(request.headers);
    const { id } = await context.params;
    const deleted = await deleteTask(id);

    return NextResponse.json<ApiResponse<{ id: string }>>(
      { ok: true, data: deleted },
      { status: 200 },
    );
  } catch (error: unknown) {
    return handleRouteError<{ id: string }>(
      error,
      'Failed to delete task. Please try again later.',
    );
  }
};
