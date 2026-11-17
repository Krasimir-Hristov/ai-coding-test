import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  createTask,
  listTasks,
  TaskStorageError,
  ValidationError,
} from '../src/features/tasks/dal/task-store.ts';
import type { CreateTaskInput } from '../src/features/tasks/types.ts';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_8601_UTC_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

const asInvalidCreateInput = (value: unknown): CreateTaskInput =>
  value as CreateTaskInput;

describe('task-store DAL', () => {
  let originalCwd = '';
  let tempDir = '';

  before(async () => {
    originalCwd = process.cwd();
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'taskflow-store-test-'));
    process.chdir(tempDir);
  });

  beforeEach(async () => {
    await rm(path.join(tempDir, 'data'), { recursive: true, force: true });
  });

  after(async () => {
    // Restore cwd before removing tempDir so Windows does not throw EBUSY.
    process.chdir(originalCwd);
    await rm(tempDir, { recursive: true, force: true });
  });

  it('auto-creates data/tasks.json and returns an empty array when storage does not exist', async () => {
    const tasks = await listTasks();
    assert.deepEqual(tasks, []);

    const rawFile = await readFile(
      path.join(tempDir, 'data', 'tasks.json'),
      'utf-8',
    );
    assert.deepEqual(JSON.parse(rawFile), []);
  });

  it('creates a task with trimmed title, default todo status, UUID v4 id, and ISO timestamp', async () => {
    const created = await createTask({ title: '  Write Phase 1 unit tests  ' });

    assert.equal(created.title, 'Write Phase 1 unit tests');
    assert.equal(created.status, 'todo');
    assert.match(created.id, UUID_V4_REGEX);
    assert.match(created.createdAt, ISO_8601_UTC_REGEX);
    assert.equal(Number.isNaN(Date.parse(created.createdAt)), false);

    const listed = await listTasks();
    assert.equal(listed.length, 1);
    assert.deepEqual(listed[0], created);
  });

  it('accepts boundary title lengths (1 char and 120 chars after trimming)', async () => {
    const minTask = await createTask({ title: 'A' });
    const maxTitle = 'x'.repeat(120);
    const maxTask = await createTask({ title: `  ${maxTitle}  ` });

    assert.equal(minTask.title, 'A');
    assert.equal(maxTask.title, maxTitle);
    assert.equal(maxTask.title.length, 120);

    const listed = await listTasks();
    assert.equal(listed.length, 2);
    assert.deepEqual(
      listed.map((task) => task.title),
      ['A', maxTitle],
    );
  });

  it('returns defensive copies from listTasks without exposing internal records', async () => {
    await createTask({ title: 'Immutable read check' });

    const firstRead = await listTasks();
    firstRead[0].title = 'Mutated in memory';
    firstRead.push({
      id: 'fake-id',
      title: 'Injected task',
      status: 'done',
      createdAt: new Date().toISOString(),
    });

    const secondRead = await listTasks();
    assert.equal(secondRead.length, 1);
    assert.equal(secondRead[0].title, 'Immutable read check');
  });

  it('serializes concurrent createTask calls without losing tasks', async () => {
    const inputs: readonly CreateTaskInput[] = [
      { title: 'Concurrent Task 1' },
      { title: 'Concurrent Task 2' },
      { title: 'Concurrent Task 3' },
    ];

    const created = await Promise.all(inputs.map((input) => createTask(input)));
    const listed = await listTasks();

    assert.equal(created.length, 3);
    assert.equal(listed.length, 3);
    assert.deepEqual(
      listed.map((task) => task.title),
      ['Concurrent Task 1', 'Concurrent Task 2', 'Concurrent Task 3'],
    );
  });

  it('throws ValidationError for empty, whitespace-only, >120 char, or non-string titles', async () => {
    await createTask({ title: 'Existing valid task' });

    const invalidInputs: readonly CreateTaskInput[] = [
      { title: '' },
      { title: '    \t\n  ' },
      { title: 'a'.repeat(121) },
      asInvalidCreateInput({ title: 42 }),
      asInvalidCreateInput({ title: null }),
      asInvalidCreateInput({}),
      asInvalidCreateInput(null),
      asInvalidCreateInput('raw string payload'),
    ];

    for (const invalid of invalidInputs) {
      await assert.rejects(
        () => createTask(invalid),
        (error: unknown) => {
          assert.ok(error instanceof ValidationError);
          assert.equal(
            error.message,
            'Title must be between 1 and 120 characters.',
          );
          return true;
        },
      );
    }

    const listed = await listTasks();
    assert.equal(listed.length, 1);
    assert.equal(listed[0].title, 'Existing valid task');
  });

  it('throws safe TaskStorageError when tasks.json contains invalid JSON or malformed records', async () => {
    const dataDir = path.join(tempDir, 'data');
    const tasksFile = path.join(dataDir, 'tasks.json');
    await mkdir(dataDir, { recursive: true });

    await writeFile(tasksFile, '{invalid json', 'utf-8');
    await assert.rejects(
      () => listTasks(),
      (error: unknown) => {
        assert.ok(error instanceof TaskStorageError);
        assert.equal(error.message.includes(tempDir), false);
        return true;
      },
    );

    await writeFile(
      tasksFile,
      JSON.stringify([{ id: '', title: 'Broken', status: 'todo', createdAt: 'now' }]),
      'utf-8',
    );
    await assert.rejects(
      () => listTasks(),
      (error: unknown) => {
        assert.ok(error instanceof TaskStorageError);
        assert.equal(error.message.includes(tempDir), false);
        return true;
      },
    );
  });
});
