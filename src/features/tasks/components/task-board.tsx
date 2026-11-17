'use client';

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { CreateTaskInput, Task, TaskStatus } from '../types';
import { CreateTaskForm } from './create-task-form';
import {
  type ApiResult,
  createNewTask,
  deleteTaskById,
  fetchTaskList,
  updateTaskStatusOrTitle,
} from './task-api';
import { TaskBoardHeader } from './task-board-header';
import { TaskCard } from './task-card';
import { TaskFilterBar, type TaskFilterValue } from './task-filter-bar';

type MutationKind = 'updating' | 'deleting';

const countByStatus = (items: readonly Task[]): Record<TaskStatus, number> => {
  const counts: Record<TaskStatus, number> = { todo: 0, in_progress: 0, done: 0 };
  for (const item of items) {
    counts[item.status] += 1;
  }
  return counts;
};

export const TaskBoard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeFilter, setActiveFilter] = useState<TaskFilterValue>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pendingMutations, setPendingMutations] = useState<Record<string, MutationKind>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTasks = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await fetchTaskList();
      if (result.error !== null || result.data === null) {
        setErrorMessage(result.error ?? 'Unable to load your tasks right now. Please try refreshing.');
        return;
      }
      setTasks(result.data);
    } catch {
      setErrorMessage('Could not connect to the task service. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const setTaskMutation = (id: string, kind: MutationKind | null): void => {
    setPendingMutations((prev) => {
      if (kind === null) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: kind };
    });
  };

  const runTaskMutation = async <T,>(
    id: string,
    kind: MutationKind,
    action: () => Promise<ApiResult<T>>,
    fallbackError: string,
    onSuccess: (data: T) => void,
  ): Promise<void> => {
    setErrorMessage(null);
    setTaskMutation(id, kind);
    try {
      const result = await action();
      if (result.error !== null || result.data === null) {
        setErrorMessage(result.error ?? fallbackError);
        return;
      }
      onSuccess(result.data);
    } catch {
      setErrorMessage(fallbackError);
    } finally {
      setTaskMutation(id, null);
    }
  };

  const handleCreateTask = async (input: CreateTaskInput): Promise<boolean> => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await createNewTask(input);
      if (result.error !== null || result.data === null) {
        setErrorMessage(result.error ?? 'Unable to create your task right now. Please try again.');
        return false;
      }
      const createdTask = result.data;
      setTasks((previous) => [createdTask, ...previous]);
      return true;
    } catch {
      setErrorMessage('Could not save your task due to a network or server error. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = (id: string, status: TaskStatus): Promise<void> =>
    runTaskMutation(
      id,
      'updating',
      () => updateTaskStatusOrTitle(id, { status }),
      'Unable to update task status right now. Please try again.',
      (updated) => setTasks((prev) => prev.map((item) => (item.id === updated.id ? updated : item))),
    );

  const handleDeleteTask = (id: string): Promise<void> =>
    runTaskMutation(
      id,
      'deleting',
      () => deleteTaskById(id),
      'Unable to delete this task right now. Please try again.',
      ({ id: deletedId }) => setTasks((prev) => prev.filter((item) => item.id !== deletedId)),
    );

  const statusCounts = countByStatus(tasks);
  const filterCounts: Record<TaskFilterValue, number> = { all: tasks.length, ...statusCounts };
  const filteredTasks = activeFilter === 'all' ? tasks : tasks.filter((task) => task.status === activeFilter);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <TaskBoardHeader statusCounts={statusCounts} />

      {errorMessage !== null && (
        <section
          role="alert"
          aria-live="polite"
          aria-label="Error notification"
          className="flex flex-col justify-between gap-3 rounded-2xl border border-rose-500/40 bg-linear-to-r from-rose-950/70 via-rose-950/50 to-slate-950/80 px-5 py-4 text-rose-100 shadow-lg shadow-rose-950/30 sm:flex-row sm:items-center"
        >
          <div className="flex items-start gap-3">
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-5 w-5 shrink-0 text-rose-400">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-rose-200">Something went wrong</p>
              <p className="mt-0.5 text-sm text-rose-200/90">{errorMessage}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => void loadTasks()} aria-label="Retry loading tasks" className="cursor-pointer rounded-lg border border-rose-400/40 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-100 transition-colors hover:bg-rose-500/30 focus:ring-2 focus:ring-rose-400/50 focus:outline-none">
              Retry
            </button>
            <button type="button" onClick={() => setErrorMessage(null)} aria-label="Dismiss error banner" className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 focus:ring-2 focus:ring-slate-500/50 focus:outline-none">
              Dismiss
            </button>
          </div>
        </section>
      )}

      <CreateTaskForm onCreateTask={handleCreateTask} isSubmitting={isSubmitting} />

      <section aria-label="Task list" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-slate-100">Tasks</h2>
            <span className="rounded-full border border-slate-800 bg-slate-900 px-2.5 py-0.5 text-xs font-medium tabular-nums text-slate-300">
              {filteredTasks.length}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TaskFilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} counts={filterCounts} />
            <button
              type="button"
              onClick={() => void loadTasks()}
              disabled={isLoading}
              aria-label="Refresh task list"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-300 transition-all duration-200 hover:border-slate-700 hover:bg-slate-800 hover:text-white focus:ring-2 focus:ring-indigo-500/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}>
                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
              </svg>
              <span>{isLoading ? 'Loading...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div aria-busy="true" aria-label="Loading tasks" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((skeletonId) => (
              <div key={skeletonId} className="h-44 animate-pulse rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-linear-to-b from-slate-900/50 to-slate-950/70 px-6 py-14 text-center">
            <h3 className="text-base font-semibold text-slate-200">
              {tasks.length === 0 ? 'No tasks yet' : 'No tasks match this filter'}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              {tasks.length === 0
                ? 'Use the form above to add your first task and kick off your workflow.'
                : 'Switch filter tabs or clear the active filter to view all tasks.'}
            </p>
            {tasks.length > 0 && activeFilter !== 'all' && (
              <button type="button" onClick={() => setActiveFilter('all')} aria-label="Show all tasks" className="mt-4 cursor-pointer rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-2 text-xs font-semibold text-indigo-200 transition-colors hover:bg-indigo-500/25 focus:ring-2 focus:ring-indigo-400/50 focus:outline-none">
                Show all tasks
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={handleUpdateStatus}
                onDelete={handleDeleteTask}
                isMutating={pendingMutations[task.id] !== undefined}
                pendingAction={pendingMutations[task.id] ?? null}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
