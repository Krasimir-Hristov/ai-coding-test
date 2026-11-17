import type { Metadata } from 'next';
import type React from 'react';
import { TaskBoard } from '@/features/tasks';

export const metadata: Metadata = {
  title: 'TaskFlow Board — Create & Track Tasks',
  description:
    'Interactive TaskFlow board for creating and monitoring tasks across your workflow.',
};

const HomePage: React.FC = () => {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-linear-to-b from-indigo-950/35 via-slate-950/0 to-transparent"
      />
      <div className="relative z-10">
        <TaskBoard />
      </div>
    </main>
  );
};

export default HomePage;
