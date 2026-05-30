import Link from 'next/link';

const tasks = [
  { id: 't-1', title: 'Update team capacity dashboard', assignee: 'John Doe', status: 'Overdue', deadline: 'May 31' },
  { id: 't-2', title: 'Verify daily work-log AI pipeline', assignee: 'Ellen Ripley', status: 'In progress', deadline: 'Jun 3' },
  { id: 't-3', title: 'Design manager summary flow', assignee: 'Marcus Wright', status: 'Pending', deadline: 'Jun 7' }
];

export default function TaskListPage() {
  return (
    <main className="min-h-screen bg-surface px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Tasks</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Team task board</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Manage priorities, deadlines, and AI-verified updates across the team.</p>
          </div>
          <Link href="/" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
            Back to dashboard
          </Link>
        </header>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 text-sm font-semibold text-slate-500 sm:grid-cols-[2fr_1fr_1fr_1.2fr] px-6 py-4">
            <span>Task</span>
            <span>Assignee</span>
            <span>Status</span>
            <span>Deadline</span>
          </div>
          <div className="divide-y divide-slate-200">
            {tasks.map(task => (
              <div key={task.id} className="grid gap-0 text-sm text-slate-700 sm:grid-cols-[2fr_1fr_1fr_1.2fr] px-6 py-5 hover:bg-slate-50">
                <div>
                  <p className="font-semibold text-slate-950">{task.title}</p>
                  <p className="mt-1 text-sm text-slate-500">Task #{task.id}</p>
                </div>
                <div>{task.assignee}</div>
                <div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${task.status === 'Overdue' ? 'bg-rose-100 text-rose-700' : task.status === 'In progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                    {task.status}
                  </span>
                </div>
                <div>{task.deadline}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
