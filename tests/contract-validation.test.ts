import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type {
  ApiResponse,
  CreateTaskInput,
  Task,
  TaskStatus,
  UpdateTaskInput,
} from '../src/features/tasks/types.ts';

const VALID_TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'done'];
const ISO_8601_TIMESTAMP_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isTaskStatus = (value: unknown): value is TaskStatus =>
  typeof value === 'string' &&
  VALID_TASK_STATUSES.some((status) => status === value);

const isValidTrimmedTitle = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.trim() === value &&
  value.length >= 1 &&
  value.length <= 120;

const isValidTitleInput = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmedLength = value.trim().length;
  return trimmedLength >= 1 && trimmedLength <= 120;
};

const isIso8601Timestamp = (value: unknown): value is string => {
  if (typeof value !== 'string' || !ISO_8601_TIMESTAMP_REGEX.test(value)) {
    return false;
  }
  return !Number.isNaN(Date.parse(value));
};

const isTask = (value: unknown): value is Task => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    isValidTrimmedTitle(value.title) &&
    isTaskStatus(value.status) &&
    isIso8601Timestamp(value.createdAt)
  );
};

const isTaskArray = (value: unknown): value is Task[] =>
  Array.isArray(value) && value.every(isTask);

const isCreateTaskInput = (value: unknown): value is CreateTaskInput =>
  isRecord(value) && isValidTitleInput(value.title);

const isUpdateTaskInput = (value: unknown): value is UpdateTaskInput => {
  if (!isRecord(value)) {
    return false;
  }

  const hasTitle = value.title !== undefined;
  const hasStatus = value.status !== undefined;

  if (!hasTitle && !hasStatus) {
    return false;
  }

  if (hasTitle && !isValidTitleInput(value.title)) {
    return false;
  }

  if (hasStatus && !isTaskStatus(value.status)) {
    return false;
  }

  return true;
};

const isDeletedTaskPayload = (value: unknown): value is { id: string } =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id.trim().length > 0;

const isSafeErrorText = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }

  const forbiddenPatterns: readonly RegExp[] = [
    /\n\s+at\s+/,
    /[A-Za-z]:\\/,
    /\/(?:Users|home|var|src|app)\//,
    /\b(?:TypeError|ReferenceError|SyntaxError|ENOENT):/,
  ];

  return !forbiddenPatterns.some((pattern) => pattern.test(value));
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

  return value.data === undefined && isSafeErrorText(value.error);
};

describe('TaskStatus contract validation', () => {
  it('accepts all defined TaskStatus union members', () => {
    for (const status of VALID_TASK_STATUSES) {
      assert.equal(isTaskStatus(status), true);
    }
  });

  it('rejects invalid or incorrectly cased TaskStatus values', () => {
    const invalidStatuses: readonly unknown[] = [
      'TODO',
      'In_Progress',
      'in-progress',
      'completed',
      'archived',
      '',
      null,
      undefined,
      1,
      {},
      ['todo'],
    ];

    for (const invalid of invalidStatuses) {
      assert.equal(isTaskStatus(invalid), false);
    }
  });
});

describe('Task and input payload guards', () => {
  const sampleTask: Task = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Implement TaskFlow API contract tests',
    status: 'todo',
    createdAt: '2026-11-17T20:00:00.000Z',
  };

  it('validates well-formed Task objects including boundary title lengths', () => {
    assert.equal(isTask(sampleTask), true);
    assert.equal(
      isTask({
        ...sampleTask,
        title: 'A',
        status: 'in_progress',
        createdAt: '2026-11-17T20:00:00+01:00',
      }),
      true,
    );
    assert.equal(
      isTask({
        ...sampleTask,
        title: 'x'.repeat(120),
        status: 'done',
      }),
      true,
    );
  });

  it('rejects malformed Task objects', () => {
    const invalidTasks: readonly unknown[] = [
      null,
      [],
      { ...sampleTask, id: '' },
      { ...sampleTask, id: '   ' },
      { ...sampleTask, title: '' },
      { ...sampleTask, title: '  untrimmed  ' },
      { ...sampleTask, title: 'x'.repeat(121) },
      { ...sampleTask, status: 'blocked' },
      { ...sampleTask, createdAt: '2026-11-17' },
      { ...sampleTask, createdAt: 'not-an-iso-date' },
    ];

    for (const candidate of invalidTasks) {
      assert.equal(isTask(candidate), false);
    }
  });

  it('validates CreateTaskInput and rejects blank or oversized titles', () => {
    assert.equal(isCreateTaskInput({ title: 'Buy textbooks' }), true);
    assert.equal(isCreateTaskInput({ title: '  Trimmed by backend  ' }), true);
    assert.equal(isCreateTaskInput({ title: 'a'.repeat(120) }), true);

    const invalidInputs: readonly unknown[] = [
      null,
      {},
      { title: '' },
      { title: '    ' },
      { title: 'a'.repeat(121) },
      { title: 123 },
    ];

    for (const candidate of invalidInputs) {
      assert.equal(isCreateTaskInput(candidate), false);
    }
  });

  it('validates UpdateTaskInput for partial title and status updates', () => {
    assert.equal(isUpdateTaskInput({ title: 'Updated task title' }), true);
    assert.equal(isUpdateTaskInput({ status: 'in_progress' }), true);
    assert.equal(
      isUpdateTaskInput({ title: 'Ship Phase 1', status: 'done' }),
      true,
    );

    const invalidUpdates: readonly unknown[] = [
      null,
      {},
      { title: '   ' },
      { title: 'a'.repeat(121) },
      { status: 'cancelled' },
      { title: 'Valid', status: 'invalid' },
    ];

    for (const candidate of invalidUpdates) {
      assert.equal(isUpdateTaskInput(candidate), false);
    }
  });
});

describe('ApiResponse<T> envelope guards', () => {
  const sampleTask: Task = {
    id: 'a2f3c8c2-3b7e-4c68-9f90-4a8e42db9001',
    title: 'Review contract',
    status: 'todo',
    createdAt: '2026-11-17T20:10:00.000Z',
  };

  it('validates successful GET, POST, PATCH, and DELETE response shapes', () => {
    assert.equal(
      isApiResponse({ ok: true, data: [sampleTask] }, isTaskArray),
      true,
    );
    assert.equal(isApiResponse({ ok: true, data: sampleTask }, isTask), true);
    assert.equal(
      isApiResponse({ ok: true, data: { id: sampleTask.id } }, isDeletedTaskPayload),
      true,
    );
  });

  it('validates safe error responses and rejects stack traces or file path leaks', () => {
    assert.equal(
      isApiResponse(
        { ok: false, error: 'Title must be between 1 and 120 characters.' },
        isTask,
      ),
      true,
    );
    assert.equal(
      isApiResponse({ ok: false, error: 'Task not found.' }, isTask),
      true,
    );

    const unsafeOrMalformedResponses: readonly unknown[] = [
      { ok: true },
      { ok: true, data: sampleTask, error: 'unexpected' },
      { ok: false },
      { ok: false, error: '' },
      { ok: false, error: 'Failed', data: sampleTask },
      { ok: false, error: 'ENOENT: no such file' },
      { ok: false, error: 'Error reading D:\\myProjects\\ai-codint-test\\data\\tasks.json' },
      { ok: false, error: 'Failed\n    at Object.<anonymous> (/src/app/api/tasks/route.ts:12:5)' },
      { ok: 'yes', data: sampleTask },
    ];

    for (const candidate of unsafeOrMalformedResponses) {
      assert.equal(isApiResponse(candidate, isTask), false);
    }
  });
});
