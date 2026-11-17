import type React from 'react';
import type { Task, TaskStatus } from '../types';

export interface TaskCardProps {
  task: Task;
}

interface StatusPresentation {
  label: string;
  badgeClass: string;
  dotClass: string;
  accentBarClass: string;
}

const STATUS_PRESENTATION: Record<TaskStatus, StatusPresentation> = {
  todo: {
    label: 'To Do',
    badgeClass: 'border-slate-700/80 bg-slate-800/80 text-slate-200',
    dotClass: 'bg-slate-400',
    accentBarClass: 'bg-linear-to-r from-slate-500 to-slate-400',
  },
  in_progress: {
    label: 'In Progress',
    badgeClass: 'border-amber-500/35 bg-amber-500/10 text-amber-200',
    dotClass: 'bg-amber-400',
    accentBarClass: 'bg-linear-to-r from-amber-500 to-orange-400',
  },
  done: {
    label: 'Done',
    badgeClass: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200',
    dotClass: 'bg-emerald-400',
    accentBarClass: 'bg-linear-to-r from-emerald-500 to-teal-400',
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

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const statusMeta = STATUS_PRESENTATION[task.status];
  const formattedDate = formatCreatedAt(task.createdAt);
  const shortId = task.id.slice(0, 8);

  return (
    <article
      aria-label={`Task: ${task.title}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800/90 bg-linear-to-br from-slate-900/90 via-slate-900/75 to-slate-950/95 p-5 shadow-lg shadow-slate-950/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/40 hover:shadow-indigo-950/30"
    >
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-0.5 opacity-80 transition-opacity duration-200 group-hover:opacity-100 ${statusMeta.accentBarClass}`}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusMeta.badgeClass}`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`}
            />
            {statusMeta.label}
          </span>
          <span className="font-mono text-[11px] text-slate-500">
            #{shortId}
          </span>
        </div>

        <h3 className="text-base leading-snug font-medium wrap-break-word text-slate-100">
          {task.title}
        </h3>
      </div>

      <footer className="mt-5 flex items-center justify-between border-t border-slate-800/70 pt-3 text-xs text-slate-400">
        <span>Created</span>
        <time dateTime={task.createdAt} className="tabular-nums text-slate-300">
          {formattedDate}
        </time>
      </footer>
    </article>
  );
};
