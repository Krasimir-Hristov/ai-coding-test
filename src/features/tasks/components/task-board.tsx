'use client';

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { CreateTaskInput, Task, TaskStatus } from '../types';
import { CreateTaskForm } from './create-task-form';
import { createNewTask, fetchTaskList } from './task-api';
import { TaskCard } from './task-card';

interface StatItem {
  key: TaskStatus;
  label: string;
  boxClass: string;
  labelClass: string;
  valueClass: string;
}

const SUMMARY_STATS: readonly StatItem[] = [
  {
    key: 'todo',
    label: 'To Do',
    boxClass: 'border-slate-800/80',
    labelClass: 'text-slate-400',
    valueClass: 'text-slate-100',
  },
  {
    key: 'in_progress',
    label: 'Active',
    boxClass: 'border-amber-500/20',
    labelClass: 'text-amber-300/80',
    valueClass: 'text-amber-200',
  },
  {
    key: 'done',
    label: 'Done',
    boxClass: 'border-emerald-500/20',
    labelClass: 'text-emerald-300/80',
    valueClass: 'text-emerald-200',
  },
];

export const TaskBoard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTasks = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await fetchTaskList();
      if (result.error !== null || result.data === null) {
        setErrorMessage(
          result.error ?? 'Unable to load your tasks right now. Please try refreshing.',
        );
        return;
      }

      setTasks(result.data);
    } catch {
      setErrorMessage(
        'Could not connect to the task service. Please check your connection and try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const handleCreateTask = async (input: CreateTaskInput): Promise<boolean> => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await createNewTask(input);
      if (result.error !== null || result.data === null) {
        setErrorMessage(
          result.error ?? 'Unable to create your task right now. Please try again.',
        );
        return false;
      }

      const createdTask = result.data;
      setTasks((previous) => [createdTask, ...previous]);
      return true;
    } catch {
      setErrorMessage(
        'Could not save your task due to a network or server error. Please try again.',
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshClick = (): void => {
    void loadTasks();
  };

  const handleDismissError = (): void => {
    setErrorMessage(null);
  };

  const statusCounts: Record<TaskStatus, number> = {
    todo: tasks.filter((task) => task.status === 'todo').length,
    in_progress: tasks.filter((task) => task.status === 'in_progress').length,
    done: tasks.filter((task) => task.status === 'done').length,
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-6 rounded-3xl border border-slate-800/90 bg-linear-to-br from-slate-900/95 via-slate-900/80 to-indigo-950/40 p-6 shadow-2xl shadow-slate-950/60 backdrop-blur-md sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
            TaskFlow Workspace
          </div>
          <h1 className="bg-linear-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
            Project Task Board
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-slate-400">
            Stay organized with a crisp overview of upcoming work, active items, and completed milestones.
          </p>
        </div>

        <dl aria-label="Task summary statistics" className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {SUMMARY_STATS.map((stat) => (
            <div
              key={stat.key}
              className={`rounded-xl border bg-slate-950/70 px-3.5 py-2.5 text-center ${stat.boxClass}`}
            >
              <dt className={`text-[11px] font-medium tracking-wider uppercase ${stat.labelClass}`}>
                {stat.label}
              </dt>
              <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${stat.valueClass}`}>
                {statusCounts[stat.key]}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      {errorMessage !== null && (
        <section
          role="alert"
          aria-live="polite"
          aria-label="Error notification"
          className="flex flex-col justify-between gap-3 rounded-2xl border border-rose-500/40 bg-linear-to-r from-rose-950/70 via-rose-950/50 to-slate-950/80 px-5 py-4 text-rose-100 shadow-lg shadow-rose-950/30 sm:flex-row sm:items-center"
        >
          <div className="flex items-start gap-3">
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-5 w-5 shrink-0 text-rose-400">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-semibold text-rose-200">Something went wrong</p>
              <p className="mt-0.5 text-sm text-rose-200/90">{errorMessage}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshClick}
              aria-label="Retry loading tasks"
              className="cursor-pointer rounded-lg border border-rose-400/40 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-100 transition-colors hover:bg-rose-500/30 focus:ring-2 focus:ring-rose-400/50 focus:outline-none"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={handleDismissError}
              aria-label="Dismiss error banner"
              className="cursor-pointer rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 focus:ring-2 focus:ring-slate-500/50 focus:outline-none"
            >
              Dismiss
            </button>
          </div>
        </section>
      )}

      <CreateTaskForm onCreateTask={handleCreateTask} isSubmitting={isSubmitting} />

      <section aria-label="Task list" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-slate-100">All Tasks</h2>
            <span className="rounded-full border border-slate-800 bg-slate-900 px-2.5 py-0.5 text-xs font-medium tabular-nums text-slate-300">
              {tasks.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleRefreshClick}
            disabled={isLoading}
            aria-label="Refresh task list"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-300 transition-all duration-200 hover:border-slate-700 hover:bg-slate-800 hover:text-white focus:ring-2 focus:ring-indigo-500/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}>
              <path
                fillRule="evenodd"
                d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z"
                clipRule="evenodd"
              />
            </svg>
            <span>{isLoading ? 'Loading...' : 'Refresh'}</span>
          </button>
        </div>

        {isLoading ? (
          <div aria-busy="true" aria-label="Loading tasks" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((skeletonId) => (
              <div key={skeletonId} className="h-36 animate-pulse rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5">
                <div className="h-4 w-20 rounded-full bg-slate-800" />
                <div className="mt-4 h-4 w-4/5 rounded bg-slate-800" />
                <div className="mt-2 h-4 w-2/3 rounded bg-slate-800/80" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-linear-to-b from-slate-900/50 to-slate-950/70 px-6 py-14 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-200">No tasks yet</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              Use the form above to add your first task and kick off your workflow.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
