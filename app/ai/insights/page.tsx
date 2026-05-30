import Link from 'next/link';

export default function AIInsightsPage() {
  return (
    <main className="min-h-screen bg-surface px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">AI Insights</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Manager intelligence</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Action-oriented team summary, risk signals, and workload recommendations powered by AI.</p>
          </div>
          <Link href="/" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
            Return home
          </Link>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Executive operations briefing</h2>
            <div className="mt-6 space-y-5 text-slate-700">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Critical slippage</p>
                <p className="mt-2 text-sm text-slate-600">Task “Update team capacity dashboard” is overdue and should be escalated to John Doe for immediate review.</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Bluff alert</p>
                <p className="mt-2 text-sm text-slate-600">One employee work log was flagged as vague. Ask for more detail or request a quick pair review session.</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Top performer</p>
                <p className="mt-2 text-sm text-slate-600">Ellen Ripley has achieved a high AI confidence score on recent updates and should be acknowledged in the next standup.</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold uppercase tracking-[0.18em] text-slate-500">Summary quick actions</h3>
            <div className="mt-5 space-y-4 text-slate-700">
              <button className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-blue-600">Generate fresh summary</button>
              <button className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:border-slate-300">Review flagged logs</button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
