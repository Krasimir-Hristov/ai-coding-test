import type React from 'react';
import type { TaskStatus } from '../types';

export interface TaskBoardHeaderProps {
  statusCounts: Record<TaskStatus, number>;
}

interface StatItem {
  key: TaskStatus;
  label: string;
  boxClass: string;
  labelClass: string;
  valueClass: string;
}

const SUMMARY_STATS: readonly StatItem[] = [
  { key: 'todo', label: 'To Do', boxClass: 'border-slate-800/80', labelClass: 'text-slate-400', valueClass: 'text-slate-100' },
  { key: 'in_progress', label: 'Active', boxClass: 'border-amber-500/20', labelClass: 'text-amber-300/80', valueClass: 'text-amber-200' },
  { key: 'done', label: 'Done', boxClass: 'border-emerald-500/20', labelClass: 'text-emerald-300/80', valueClass: 'text-emerald-200' },
];

export const TaskBoardHeader: React.FC<TaskBoardHeaderProps> = ({ statusCounts }) => {
  return (
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
          <div key={stat.key} className={`rounded-xl border bg-slate-950/70 px-3.5 py-2.5 text-center ${stat.boxClass}`}>
            <dt className={`text-[11px] font-medium tracking-wider uppercase ${stat.labelClass}`}>{stat.label}</dt>
            <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${stat.valueClass}`}>{statusCounts[stat.key]}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
};
