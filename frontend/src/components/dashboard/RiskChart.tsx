interface RiskChartProps {
  data: { date: string; value: number; fraud: number }[];
}

export function RiskChart({ data }: RiskChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-rb-black">Analyse des risques</h3>
          <p className="text-sm text-neutral-500">Tendance sur les 7 derniers jours</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-rb-yellow rounded-full shrink-0" />
            <span className="text-sm text-neutral-600">Transactions</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full shrink-0" />
            <span className="text-sm text-neutral-600">Fraudes</span>
          </div>
        </div>
      </div>

      <div className="relative h-52 sm:h-64">
        <div className="absolute inset-0 flex items-end justify-between gap-2">
          {data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col gap-1">
                <div 
                  className="w-full bg-rb-yellow rounded-t-md transition-all duration-500 hover:bg-rb-yellow-dark"
                  style={{ height: `${(item.value / maxValue) * 200}px` }}
                />
                <div 
                  className="w-full bg-red-500 rounded-t-md transition-all duration-500 hover:bg-red-600"
                  style={{ height: `${(item.fraud / maxValue) * 200}px` }}
                />
              </div>
              <span className="text-xs text-neutral-500">{item.date}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-neutral-200">
        <div className="text-center rounded-lg bg-rb-page py-3 px-2">
          <p className="text-xl sm:text-2xl font-bold text-rb-black tabular-nums">1,247</p>
          <p className="text-xs text-neutral-500">Total</p>
        </div>
        <div className="text-center rounded-lg bg-rb-page py-3 px-2">
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 tabular-nums">89%</p>
          <p className="text-xs text-neutral-500">Validées</p>
        </div>
        <div className="text-center rounded-lg bg-rb-page py-3 px-2">
          <p className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums">8%</p>
          <p className="text-xs text-neutral-500">Suspectes</p>
        </div>
        <div className="text-center rounded-lg bg-rb-page py-3 px-2">
          <p className="text-xl sm:text-2xl font-bold text-red-600 tabular-nums">3%</p>
          <p className="text-xs text-neutral-500">Fraudes</p>
        </div>
      </div>
    </div>
  );
}
