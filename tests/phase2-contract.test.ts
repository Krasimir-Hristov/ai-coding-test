import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type {
  ApiResponse,
  Task,
  TaskStatus,
  UpdateTaskInput,
} from '../src/features/tasks/types.ts';

const VALID_TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'done'];
const TASK_NOT_FOUND_ERROR = 'Task not found.';
const ISO_8601_TIMESTAMP_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isTaskStatus = (value: unknown): value is TaskStatus =>
  typeof value === 'string' &&
  VALID_TASK_STATUSES.some((status) => status === value);

const isValidTrimmedLength = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmedLength = value.trim().length;
  return trimmedLength >= 1 && trimmedLength <= 120;
};

const isUpdateTaskInput = (value: unknown): value is UpdateTaskInput => {
  if (!isRecord(value)) {
    return false;
  }

  const hasTitle = value.title !== undefined;
  const hasStatus = value.status !== undefined;

  if (!hasTitle && !hasStatus) {
    return false;
  }

  if (hasTitle && !isValidTrimmedLength(value.title)) {
    return false;
  }

  if (hasStatus && !isTaskStatus(value.status)) {
    return false;
  }

  return true;
};

const isTaskPayload = (value: unknown): value is Task => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.id) &&
    typeof value.title === 'string' &&
    value.title.trim() === value.title &&
    value.title.length >= 1 &&
    value.title.length <= 120 &&
    isTaskStatus(value.status) &&
    typeof value.createdAt === 'string' &&
    ISO_8601_TIMESTAMP_REGEX.test(value.createdAt) &&
    !Number.isNaN(Date.parse(value.createdAt))
  );
};

const isDeletedTaskData = (value: unknown): value is { id: string } =>
  isRecord(value) && isNonEmptyString(value.id);

const isSafeErrorMessage = (value: unknown): value is string => {
  if (!isNonEmptyString(value)) {
    return false;
  }

  const unsafePatterns: readonly RegExp[] = [
    /\n\s+at\s+/,
    /[A-Za-z]:\\/,
    /\/(?:Users|home|var|src|app)\//,
    /\b(?:TypeError|ReferenceError|SyntaxError|ENOENT):/,
  ];

  return !unsafePatterns.some((pattern) => pattern.test(value));
};

const isApiResponse = <T>(
  value: unknown,
  dataGuard: (data: unknown) => data is T,
): value is ApiResponse<T> => {
  if (!isRecord(value) || typeof value.ok !== 'boolean') {
    return false;
  }

  if (value.ok) {
    return value.error === undefined && dataGuard(value.data);
  }

  return value.data === undefined && isSafeErrorMessage(value.error);
};

const isNotFoundResponse = (value: unknown): value is ApiResponse<never> =>
  isRecord(value) &&
  value.ok === false &&
  value.data === undefined &&
  value.error === TASK_NOT_FOUND_ERROR;

describe('Phase 2 UpdateTaskInput contract validation', () => {
  it('accepts valid title-only, status-only, and combined updates', () => {
    const validPayloads: readonly unknown[] = [
      { title: 'A' },
      { title: '  Updated task title  ' },
      { title: `  ${'x'.repeat(120)}  ` },
      { status: 'todo' },
      { status: 'in_progress' },
      { status: 'done' },
      { title: 'Move to done', status: 'done' },
    ];

    for (const payload of validPayloads) {
      assert.equal(
        isUpdateTaskInput(payload),
        true,
        `Expected valid UpdateTaskInput: ${JSON.stringify(payload)}`,
      );
    }
  });

  it('rejects empty objects, blank/oversized titles, and invalid statuses', () => {
    const invalidPayloads: readonly unknown[] = [
      null,
      undefined,
      [],
      'done',
      {},
      { title: undefined, status: undefined },
      { title: '' },
      { title: '   \t\n  ' },
      { title: 'x'.repeat(121) },
      { title: 123 },
      { title: null },
      { status: '' },
      { status: 'archived' },
      { status: 'IN_PROGRESS' },
      { status: 'in-progress' },
      { status: null },
      { title: 'Valid title', status: 'invalid' },
      { title: '   ', status: 'done' },
    ];

    for (const payload of invalidPayloads) {
      assert.equal(
        isUpdateTaskInput(payload),
        false,
        `Expected invalid UpdateTaskInput: ${JSON.stringify(payload)}`,
      );
    }
  });

  it('validates non-empty task id route parameter contract', () => {
    assert.equal(isNonEmptyString('550e8400-e29b-41d4-a716-446655440000'), true);
    for (const invalidId of ['', '   ', null, undefined, 42]) {
      assert.equal(isNonEmptyString(invalidId), false);
    }
  });
});

describe('Phase 2 PATCH and DELETE response envelopes', () => {
  const updatedTask: Task = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Complete Phase 2 status updates',
    status: 'in_progress',
    createdAt: '2026-11-17T20:30:00.000Z',
  };

  it('validates PATCH /api/tasks/[id] 200 success envelope', () => {
    assert.equal(
      isApiResponse({ ok: true, data: updatedTask }, isTaskPayload),
      true,
    );
    assert.equal(
      isApiResponse({ ok: true, data: { ...updatedTask, status: 'bad' } }, isTaskPayload),
      false,
    );
  });

  it('validates DELETE /api/tasks/[id] 200 { ok: true, data: { id } } envelope', () => {
    assert.equal(
      isApiResponse(
        { ok: true, data: { id: updatedTask.id } },
        isDeletedTaskData,
      ),
      true,
    );

    const invalidDeleteEnvelopes: readonly unknown[] = [
      { ok: true },
      { ok: true, data: {} },
      { ok: true, data: { id: '' } },
      { ok: true, data: { id: '   ' } },
      { ok: true, data: { id: 123 } },
      { ok: true, data: null },
      { ok: true, data: { id: updatedTask.id }, error: 'extra' },
      { ok: false, data: { id: updatedTask.id }, error: 'Task not found.' },
    ];

    for (const candidate of invalidDeleteEnvelopes) {
      assert.equal(
        isApiResponse(candidate, isDeletedTaskData),
        false,
        `Expected invalid DELETE envelope: ${JSON.stringify(candidate)}`,
      );
    }
  });

  it('validates 404 Task not found. contract shape for PATCH and DELETE', () => {
    const validNotFound: ApiResponse<never> = {
      ok: false,
      error: 'Task not found.',
    };

    assert.equal(isNotFoundResponse(validNotFound), true);
    assert.equal(isApiResponse(validNotFound, isDeletedTaskData), true);
    assert.equal(isApiResponse(validNotFound, isTaskPayload), true);

    const invalidNotFoundPayloads: readonly unknown[] = [
      { ok: true, error: 'Task not found.' },
      { ok: false, error: 'Not found' },
      { ok: false, error: '' },
      { ok: false, error: 'Task not found.', data: { id: '123' } },
      { ok: false, error: 'ENOENT: C:\\repo\\data\\tasks.json' },
    ];

    for (const candidate of invalidNotFoundPayloads) {
      assert.equal(isNotFoundResponse(candidate), false);
    }
  });
});
