'use client';

import type React from 'react';
import type { Task, TaskStatus } from '../types';

export interface TaskCardProps {
  task: Task;
  onStatusChange?: (id: string, status: TaskStatus) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  isMutating?: boolean;
  pendingAction?: 'updating' | 'deleting' | null;
}

interface StatusPresentation {
  label: string;
  badgeClass: string;
  dotClass: string;
  accentBarClass: string;
  activeButtonClass: string;
}

const STATUS_OPTIONS: readonly TaskStatus[] = ['todo', 'in_progress', 'done'];

const STATUS_PRESENTATION: Record<TaskStatus, StatusPresentation> = {
  todo: {
    label: 'To Do',
    badgeClass: 'border-slate-700/80 bg-slate-800/80 text-slate-200',
    dotClass: 'bg-slate-400',
    accentBarClass: 'bg-linear-to-r from-slate-500 to-slate-400',
    activeButtonClass: 'border-slate-500/70 bg-slate-700/70 text-white shadow-xs',
  },
  in_progress: {
    label: 'In Progress',
    badgeClass: 'border-amber-500/35 bg-amber-500/10 text-amber-200',
    dotClass: 'bg-amber-400',
    accentBarClass: 'bg-linear-to-r from-amber-500 to-orange-400',
    activeButtonClass: 'border-amber-500/50 bg-amber-500/20 text-amber-100 shadow-xs',
  },
  done: {
    label: 'Done',
    badgeClass: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200',
    dotClass: 'bg-emerald-400',
    accentBarClass: 'bg-linear-to-r from-emerald-500 to-teal-400',
    activeButtonClass: 'border-emerald-500/50 bg-emerald-500/20 text-emerald-100 shadow-xs',
  },
};

const formatCreatedAt = (isoDate: string): string => {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return 'Just now';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onStatusChange,
  onDelete,
  isMutating = false,
  pendingAction = null,
}) => {
  const statusMeta = STATUS_PRESENTATION[task.status];
  const formattedDate = formatCreatedAt(task.createdAt);
  const shortId = task.id.slice(0, 8);
  const isUpdating = isMutating && pendingAction === 'updating';
  const isDeleting = isMutating && pendingAction === 'deleting';

  return (
    <article
      aria-label={`Task: ${task.title}`}
      aria-busy={isMutating}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800/90 bg-linear-to-br from-slate-900/90 via-slate-900/75 to-slate-950/95 p-5 shadow-lg shadow-slate-950/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/40 hover:shadow-indigo-950/30 ${
        isDeleting ? 'scale-[0.99] opacity-60' : ''
      }`}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-0.5 opacity-80 transition-opacity duration-200 group-hover:opacity-100 ${
          isUpdating ? 'animate-pulse' : ''
        } ${statusMeta.accentBarClass}`}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusMeta.badgeClass}`}>
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
            {isUpdating ? 'Updating...' : statusMeta.label}
          </span>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-slate-500">#{shortId}</span>
            <button
              type="button"
              onClick={() => void onDelete?.(task.id)}
              disabled={isMutating || !onDelete}
              aria-label={`Delete task ${task.title}`}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-[11px] font-medium text-slate-400 transition-all duration-150 hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-rose-200 focus:ring-2 focus:ring-rose-400/50 focus:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path
                  fillRule="evenodd"
                  d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        </div>

        <h3 className="text-base leading-snug font-medium wrap-break-word text-slate-100">
          {task.title}
        </h3>
      </div>

      <div className="mt-4 space-y-3 border-t border-slate-800/70 pt-3">
        <div role="group" aria-label={`Status actions for ${task.title}`} className="grid grid-cols-3 gap-1.5">
          {STATUS_OPTIONS.map((option) => {
            const optionMeta = STATUS_PRESENTATION[option];
            const isCurrent = task.status === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => void onStatusChange?.(task.id, option)}
                disabled={isMutating || isCurrent || !onStatusChange}
                aria-pressed={isCurrent}
                aria-label={`Set status of ${task.title} to ${optionMeta.label}`}
                className={`cursor-pointer rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all duration-150 focus:ring-2 focus:ring-indigo-400/50 focus:outline-none active:scale-[0.97] disabled:cursor-not-allowed ${
                  isCurrent
                    ? optionMeta.activeButtonClass
                    : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:bg-slate-800/80 hover:text-slate-100 disabled:opacity-50'
                }`}
              >
                {optionMeta.label}
              </button>
            );
          })}
        </div>

        <footer className="flex items-center justify-between text-xs text-slate-400">
          <span>Created</span>
          <time dateTime={task.createdAt} className="tabular-nums text-slate-300">
            {formattedDate}
          </time>
        </footer>
      </div>
    </article>
  );
};
