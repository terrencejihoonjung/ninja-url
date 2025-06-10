export default function DashboardLoading() {
  return (
    <div className="relative h-screen bg-foreground flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-6"></div>
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-3xl">🥷</span>
          <span className="text-2xl font-bold text-white">ninja-url</span>
        </div>
        <p className="text-white/70 text-lg">Preparing your dashboard...</p>
        <div className="mt-4 flex justify-center space-x-1">
          <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse delay-75"></div>
          <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse delay-150"></div>
        </div>
      </div>
    </div>
  );
}
