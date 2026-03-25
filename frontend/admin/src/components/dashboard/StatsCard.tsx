interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export function StatsCard({ title, value, change, changeLabel, icon, trend = 'neutral' }: StatsCardProps) {
  const trendColors = {
    up: 'text-emerald-600 bg-emerald-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-neutral-600 bg-rb-page',
  };

  const trendIcons = {
    up: 'M5 10l7-7m0 0l7 7m-7-7v18',
    down: 'M19 14l-7 7m0 0l-7-7m7 7V3',
    neutral: 'M5 12h14',
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-neutral-200 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-rb-black">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-2 mt-3">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trendColors[trend]}`}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trendIcons[trend]} />
                </svg>
                {Math.abs(change)}%
              </span>
              <span className="text-xs text-neutral-500">{changeLabel}</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-rb-yellow-muted flex items-center justify-center text-rb-yellow-dark">
          {icon}
        </div>
      </div>
    </div>
  );
}
