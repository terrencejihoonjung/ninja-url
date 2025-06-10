export default function DashboardLoading() {
  return (
    <div className="flex-1 bg-white/5 backdrop-blur rounded-xl border border-white/10">
      <div className="p-8">
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-8 bg-white/10 rounded w-1/3" />
          <div className="h-4 bg-white/10 rounded w-1/2" />
          <div className="h-4 bg-white/10 rounded w-2/3" />
          <div className="h-4 bg-white/10 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}
