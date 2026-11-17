import { NextRequest, NextResponse } from 'next/server';

import {
  createTask,
  listTasks,
  ValidationError,
} from '@/features/tasks/dal/task-store';
import type { ApiResponse, CreateTaskInput, Task } from '@/features/tasks/types';
import { scrubIncomingHeaders } from '@/proxy';

export const dynamic = 'force-dynamic';

const INVALID_TITLE_MESSAGE = 'Title must be between 1 and 120 characters.';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseCreateTaskInput = (body: unknown): CreateTaskInput => {
  if (!isRecord(body) || typeof body.title !== 'string') {
    throw new ValidationError(INVALID_TITLE_MESSAGE);
  }

  return { title: body.title };
};

/**
 * Handles GET /api/tasks to list all persisted tasks.
 */
export const GET = async (
  request: NextRequest,
): Promise<NextResponse<ApiResponse<Task[]>>> => {
  try {
    scrubIncomingHeaders(request.headers);
    const tasks = await listTasks();

    return NextResponse.json<ApiResponse<Task[]>>(
      { ok: true, data: tasks },
      { status: 200 },
    );
  } catch {
    return NextResponse.json<ApiResponse<Task[]>>(
      { ok: false, error: 'Failed to load tasks. Please try again later.' },
      { status: 500 },
    );
  }
};

/**
 * Handles POST /api/tasks to validate and create a new task.
 */
export const POST = async (
  request: NextRequest,
): Promise<NextResponse<ApiResponse<Task>>> => {
  try {
    scrubIncomingHeaders(request.headers);

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json<ApiResponse<Task>>(
        { ok: false, error: 'Invalid JSON request body.' },
        { status: 400 },
      );
    }

    const input = parseCreateTaskInput(rawBody);
    const task = await createTask(input);

    return NextResponse.json<ApiResponse<Task>>(
      { ok: true, data: task },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<Task>>(
        { ok: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<Task>>(
      { ok: false, error: 'Failed to create task. Please try again later.' },
      { status: 500 },
    );
  }
};
