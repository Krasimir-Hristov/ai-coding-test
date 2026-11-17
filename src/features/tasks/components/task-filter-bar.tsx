'use client';

import type React from 'react';
import type { TaskStatus } from '../types';

export type TaskFilterValue = 'all' | TaskStatus;

export interface TaskFilterBarProps {
  activeFilter: TaskFilterValue;
  onFilterChange: (filter: TaskFilterValue) => void;
  counts: Record<TaskFilterValue, number>;
}

interface FilterOption {
  value: TaskFilterValue;
  label: string;
  activeClass: string;
  countClass: string;
}

const FILTER_OPTIONS: readonly FilterOption[] = [
  {
    value: 'all',
    label: 'All',
    activeClass: 'border-indigo-400/50 bg-linear-to-r from-indigo-500/25 to-sky-500/20 text-white shadow-sm shadow-indigo-500/20',
    countClass: 'bg-indigo-400/20 text-indigo-200',
  },
  {
    value: 'todo',
    label: 'To Do',
    activeClass: 'border-slate-400/50 bg-linear-to-r from-slate-700/60 to-slate-800/80 text-white shadow-sm shadow-slate-900/40',
    countClass: 'bg-slate-600/40 text-slate-200',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    activeClass: 'border-amber-400/50 bg-linear-to-r from-amber-500/20 to-orange-500/15 text-amber-100 shadow-sm shadow-amber-500/15',
    countClass: 'bg-amber-400/20 text-amber-200',
  },
  {
    value: 'done',
    label: 'Done',
    activeClass: 'border-emerald-400/50 bg-linear-to-r from-emerald-500/20 to-teal-500/15 text-emerald-100 shadow-sm shadow-emerald-500/15',
    countClass: 'bg-emerald-400/20 text-emerald-200',
  },
];

export const TaskFilterBar: React.FC<TaskFilterBarProps> = ({
  activeFilter,
  onFilterChange,
  counts,
}) => {
  return (
    <section
      aria-label="Filter tasks by status"
      className="flex flex-wrap items-center gap-2"
    >
      <div role="group" aria-label="Task status filters" className="flex flex-wrap items-center gap-2">
        {FILTER_OPTIONS.map((option) => {
          const isActive = activeFilter === option.value;
          const count = counts[option.value];

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onFilterChange(option.value)}
              aria-pressed={isActive}
              aria-label={`Filter by ${option.label} tasks (${count})`}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-400/50 focus:outline-none active:scale-[0.98] ${
                isActive
                  ? option.activeClass
                  : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <span>{option.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                  isActive ? option.countClass : 'bg-slate-800 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
