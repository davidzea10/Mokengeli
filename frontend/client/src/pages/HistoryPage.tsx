import { OPERATION_TYPE_LABELS } from '../constants/operationLabels';
import { useClientSession } from '../context/ClientSessionContext';

export function HistoryPage() {
  const { history, getDecisionColor, getDecisionLabel } = useClientSession();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Historique</h1>
        <p className="text-sm text-gray-500 mt-1">Opérations réalisées pendant cette session.</p>
      </div>

      {history.length === 0 ? (
        <div className="rounded-xl bg-white p-8 shadow-sm text-center text-gray-500 text-sm">
          Aucune opération pour le moment. Utilisez « Opération » pour en effectuer une.
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800 truncate">{item.numero_transaction}</p>
                <p className="text-sm text-gray-500">{item.date}</p>
                <p className="text-xs text-gray-400 mt-1 truncate">{item.beneficiaire}</p>
              </div>
              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:text-right gap-3 shrink-0">
                <div>
                  <p className="font-semibold text-gray-800 tabular-nums">{item.montant.toLocaleString('fr-FR')} FC</p>
                  <p className="text-sm text-gray-500">
                    {OPERATION_TYPE_LABELS[item.type_transaction] ?? item.type_transaction}
                  </p>
                </div>
                <span
                  className={`text-xs sm:text-sm px-3 py-1 rounded-full text-white whitespace-nowrap ${getDecisionColor(item.decision)}`}
                >
                  {getDecisionLabel(item.decision)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
