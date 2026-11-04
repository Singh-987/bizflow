export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-72 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="space-y-4 pt-4">
        <div className="h-44 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900" />
        <div className="h-44 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900" />
      </div>
    </div>
  );
}