import Link from 'next/link';

const mockStats = [
  { label: 'Total tasks', value: '23' },
  { label: 'Overdue', value: '4' },
  { label: 'Completed this week', value: '12' },
  { label: 'AI Verified', value: '92%' }
];

const mockTasks = [
  {
    id: 't-1',
    title: 'Update team capacity dashboard',
    assignee: 'John Doe',
    priority: 'High',
    deadline: 'May 31'
  },
  {
    id: 't-2',
    title: 'Verify daily work-log AI pipeline',
    assignee: 'Ellen Ripley',
    priority: 'Medium',
    deadline: 'Jun 3'
  },
  {
    id: 't-3',
    title: 'Design manager summary flow',
    assignee: 'Marcus Wright',
    priority: 'Low',
    deadline: 'Jun 7'
  }
];

export default function Home() {
  return (
    <main className="min-h-screen bg-surface px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">WorkFlow</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">AI Accountability Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Keep work visible, validate daily logs, and surface team risk with AI-powered accountability.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/tasks" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-300">
              View tasks
            </Link>
            <Link href="/ai/insights" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600">
              AI insights
            </Link>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <div className="grid gap-4 md:grid-cols-2">
            {mockStats.map(stat => (
              <div key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-4 text-3xl font-semibold text-slate-950">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">AI Recommended Actions</p>
            <div className="mt-5 space-y-4 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Review flagged logs</p>
                <p className="mt-1 text-slate-600">2 entries need more detail before approval.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Reassign overdue task</p>
                <p className="mt-1 text-slate-600">Task “Update team capacity dashboard” is overdue by 1 day.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Recent team tasks</h2>
              <p className="mt-1 text-sm text-slate-600">Quick view of high-priority work and upcoming deadlines.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Priority view</span>
          </div>

          <div className="mt-6 grid gap-4">
            {mockTasks.map(task => (
              <div key={task.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-950">{task.title}</p>
                  <p className="mt-1 text-sm text-slate-600">Assigned to {task.assignee}</p>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-0">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 border border-slate-200">{task.priority}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Due {task.deadline}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
