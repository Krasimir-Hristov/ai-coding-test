'use client';

import type React from 'react';
import { useState } from 'react';
import type { CreateTaskInput } from '../types';

const MAX_TITLE_LENGTH = 120;

export interface CreateTaskFormProps {
  onCreateTask: (input: CreateTaskInput) => Promise<boolean>;
  isSubmitting?: boolean;
}

export const CreateTaskForm: React.FC<CreateTaskFormProps> = ({
  onCreateTask,
  isSubmitting = false,
}) => {
  const [title, setTitle] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const trimmedLength = title.trim().length;

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setTitle(event.target.value);
    if (validationError !== null) {
      setValidationError(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0 || trimmedTitle.length > MAX_TITLE_LENGTH) {
      setValidationError('Please enter a task title between 1 and 120 characters.');
      return;
    }

    setValidationError(null);

    try {
      const created = await onCreateTask({ title: trimmedTitle });
      if (created) {
        setTitle('');
      }
    } catch {
      setValidationError('Unable to submit your task right now. Please try again.');
    }
  };

  return (
    <section
      aria-label="Create a new task"
      className="rounded-2xl border border-slate-800/90 bg-linear-to-br from-slate-900/90 via-slate-900/75 to-slate-950/90 p-5 shadow-xl shadow-slate-950/50 backdrop-blur-sm sm:p-6"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
            New Task
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Capture what needs to get done next (1–120 characters).
          </p>
        </div>
        <span
          aria-live="polite"
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums transition-colors ${
            trimmedLength > MAX_TITLE_LENGTH
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
              : 'border-slate-700/80 bg-slate-800/60 text-slate-400'
          }`}
        >
          {trimmedLength}/{MAX_TITLE_LENGTH}
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        aria-label="Create task form"
        className="flex flex-col gap-3 sm:flex-row sm:items-start"
      >
        <div className="flex-1">
          <label htmlFor="new-task-title" className="sr-only">
            Task title
          </label>
          <input
            id="new-task-title"
            name="title"
            type="text"
            value={title}
            onChange={handleTitleChange}
            maxLength={MAX_TITLE_LENGTH}
            placeholder="e.g., Review Phase 1 API contract and verify responses"
            aria-label="Task title"
            aria-invalid={validationError !== null}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 shadow-inner transition-all duration-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {validationError !== null && (
            <p
              role="alert"
              className="mt-2 text-xs font-medium text-rose-300"
            >
              {validationError}
            </p>
          )}
        </div>

        <button
          type="submit"
          aria-label="Create task"
          disabled={isSubmitting}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 via-indigo-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:from-indigo-400 hover:via-indigo-400 hover:to-sky-400 hover:shadow-indigo-400/30 focus:ring-2 focus:ring-indigo-400/60 focus:outline-none active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          <span>{isSubmitting ? 'Adding...' : 'Add Task'}</span>
        </button>
      </form>
    </section>
  );
};
