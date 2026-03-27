import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Transaction } from '../../types';
import { getTransactionRiskPercent } from '../../utils/transactionRiskScore';
import { getTransactionParties } from '../../utils/getTransactionParties';
import { TransactionDetailModal } from './TransactionDetailModal';

export interface TransactionTablePagination {
  page: number;
  pageCount: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

interface TransactionTableProps {
  transactions: Transaction[];
  /** Limite d’affichage (ex. 5 sur le tableau de bord). */
  maxRows?: number;
  /** Titre du bloc (défaut : Transactions récentes). */
  title?: string;
  /** Masque la barre d’actions (ex. page Transactions avec filtres en amont). */
  hideToolbar?: boolean;
  /** Pagination en pied de tableau (10 lignes / page, etc.). */
  pagination?: TransactionTablePagination;
  /** Chargement depuis l’API (pagination serveur). */
  isLoading?: boolean;
  /** Ouvre le détail si présent dans l’URL (?tx=) */
  openTransactionNumero?: string | null;
  /** Transaction complète si absente du tableau filtré mais présente en base */
  detailTransactionOverride?: Transaction | null;
  /** Retire ?tx= de l’URL à la fermeture du détail */
  onCloseDetailFromUrl?: () => void;
}

type SortField = 'date_transaction' | 'montant' | 'riskScore';
type SortOrder = 'asc' | 'desc';

export function TransactionTable({
  transactions,
  maxRows,
  title = 'Transactions récentes',
  hideToolbar = false,
  pagination,
  isLoading = false,
  openTransactionNumero,
  detailTransactionOverride,
  onCloseDetailFromUrl,
}: TransactionTableProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('date_transaction');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!openTransactionNumero) return;
    const fromList = transactions.find(
      (t) => t.transaction_event.metadata.numero_transaction === openTransactionNumero,
    );
    const resolved = fromList ?? detailTransactionOverride ?? null;
    if (resolved) setSelectedTransaction(resolved);
  }, [openTransactionNumero, transactions, detailTransactionOverride]);

  const getRiskLevel = (score: number): { label: string; color: string; bg: string } => {
    if (score >= 75) return { label: 'Critique', color: 'text-red-700', bg: 'bg-red-100' };
    if (score >= 50) return { label: 'Élevé', color: 'text-orange-700', bg: 'bg-orange-100' };
    if (score >= 25) return { label: 'Moyen', color: 'text-yellow-700', bg: 'bg-yellow-100' };
    return { label: 'Faible', color: 'text-emerald-700', bg: 'bg-emerald-100' };
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    let aVal: number;
    let bVal: number;

    if (sortField === 'date_transaction') {
      aVal = new Date(a.transaction_event.metadata.date_transaction).getTime();
      bVal = new Date(b.transaction_event.metadata.date_transaction).getTime();
    } else if (sortField === 'montant') {
      aVal = a.transaction_event.metadata.montant;
      bVal = b.transaction_event.metadata.montant;
    } else {
      aVal = getTransactionRiskPercent(a);
      bVal = getTransactionRiskPercent(b);
    }

    if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  const displayed =
    maxRows != null ? sortedTransactions.slice(0, Math.max(0, maxRows)) : sortedTransactions;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return (
      <svg className="ml-1 h-3.5 w-3.5 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={sortOrder === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
        />
      </svg>
    );
  };

  const pag = pagination;
  const rangeStart = pag && pag.totalItems > 0 ? (pag.page - 1) * pag.pageSize + 1 : 0;
  const rangeEnd = pag ? Math.min(pag.page * pag.pageSize, pag.totalItems) : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.04]">
      <div className="flex flex-col gap-2 border-b border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-amber-50/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Cliquez sur une ligne pour le détail complet (client, bénéficiaire, session).
          </p>
        </div>
        {!hideToolbar && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              Exporter
            </button>
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Filtrer
            </button>
          </div>
        )}
      </div>

      <div className="relative overflow-x-auto">
        {isLoading && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-white/65 backdrop-blur-[1px]"
            aria-busy="true"
            aria-live="polite"
          >
            <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-md">
              <span
                className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800"
                aria-hidden
              />
              Chargement…
            </div>
          </div>
        )}
        <table
          className={`w-full min-w-[1100px] border-collapse text-left sm:min-w-[1280px] ${isLoading ? 'pointer-events-none opacity-45' : ''}`}
        >
          <thead>
            <tr className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-100/98 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-600 backdrop-blur-sm sm:text-[11px]">
              <th rowSpan={2} className="align-bottom whitespace-nowrap px-3 py-3 pl-4 sm:px-4">
                <button
                  type="button"
                  onClick={() => handleSort('date_transaction')}
                  className="inline-flex items-center text-slate-700 transition hover:text-slate-900"
                >
                  Date
                  <SortIcon field="date_transaction" />
                </button>
              </th>
              <th rowSpan={2} className="min-w-[7rem] align-bottom whitespace-nowrap px-3 py-3 sm:px-4">
                Référence
              </th>
              <th
                colSpan={3}
                className="border-l border-slate-200/80 bg-amber-50/50 px-2 py-2 text-center text-slate-800"
              >
                Expéditeur (client)
              </th>
              <th
                colSpan={3}
                className="border-l border-slate-200/80 bg-slate-100/80 px-2 py-2 text-center text-slate-800"
              >
                Destinataire (bénéficiaire)
              </th>
              <th rowSpan={2} className="align-bottom whitespace-nowrap px-3 py-3 sm:px-4">
                Type
              </th>
              <th rowSpan={2} className="align-bottom whitespace-nowrap px-3 py-3 sm:px-4">
                <button
                  type="button"
                  onClick={() => handleSort('montant')}
                  className="inline-flex items-center text-slate-700 transition hover:text-slate-900"
                >
                  Montant
                  <SortIcon field="montant" />
                </button>
              </th>
              <th rowSpan={2} className="align-bottom whitespace-nowrap px-3 py-3 sm:px-4">
                Canal
              </th>
              <th rowSpan={2} className="min-w-[7rem] align-bottom whitespace-nowrap px-3 py-3 sm:px-4">
                <button
                  type="button"
                  onClick={() => handleSort('riskScore')}
                  className="inline-flex items-center text-slate-700 transition hover:text-slate-900"
                >
                  Risque
                  <SortIcon field="riskScore" />
                </button>
              </th>
              <th rowSpan={2} className="align-bottom whitespace-nowrap px-3 py-3 pr-4 sm:px-4">
                Statut
              </th>
            </tr>
            <tr className="border-b border-slate-200/90 bg-slate-50/95 text-[10px] font-medium text-slate-600 sm:text-[11px]">
              <th className="border-l border-slate-200/80 bg-amber-50/30 px-2 py-2">Nom</th>
              <th className="bg-amber-50/30 px-2 py-2">Compte / n°</th>
              <th className="bg-amber-50/30 px-2 py-2">Banque / mobile</th>
              <th className="border-l border-slate-200/80 bg-slate-100/50 px-2 py-2">Nom</th>
              <th className="bg-slate-100/50 px-2 py-2">Compte / n°</th>
              <th className="bg-slate-100/50 px-2 py-2">Banque / mobile</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/90">
            {displayed.map((tx, index) => {
              const riskScore = getTransactionRiskPercent(tx);
              const risk = getRiskLevel(riskScore);
              const meta = tx.transaction_event.metadata;
              const p = getTransactionParties(tx);

              return (
                <tr
                  key={tx._api?.id ?? meta.numero_transaction ?? index}
                  className={`group cursor-pointer transition-colors hover:bg-amber-50/45 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50/35'
                  }`}
                  onClick={() => {
                    setSelectedTransaction(tx);
                    navigate(`/?tab=transactions&tx=${encodeURIComponent(meta.numero_transaction)}`);
                  }}
                >
                  <td className="whitespace-nowrap px-3 py-2.5 pl-4 text-xs text-slate-600 sm:px-4 sm:py-3 sm:text-sm">
                    {new Date(meta.date_transaction).toLocaleString('fr-FR')}
                  </td>
                  <td className="max-w-[8rem] truncate px-3 py-2.5 font-mono text-xs font-medium text-slate-900 sm:px-4 sm:py-3 sm:text-sm">
                    {meta.numero_transaction}
                  </td>
                  <td className="max-w-[9rem] truncate border-l border-slate-100 px-2 py-3 text-xs text-slate-800 sm:text-sm">
                    {p.expediteur.nom}
                  </td>
                  <td className="max-w-[8rem] truncate px-2 py-3 font-mono text-xs text-slate-700 sm:text-sm">
                    {p.expediteur.compte_ou_numero}
                  </td>
                  <td className="px-2 py-3">
                    <span className="inline-flex rounded-lg border border-slate-200/80 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm sm:text-xs">
                      {p.expediteurModeLabel}
                    </span>
                  </td>
                  <td className="max-w-[9rem] truncate border-l border-slate-100 px-2 py-3 text-xs text-slate-800 sm:text-sm">
                    {p.destinataire.nom}
                  </td>
                  <td className="max-w-[8rem] truncate px-2 py-3 font-mono text-xs text-slate-700 sm:text-sm">
                    {p.destinataire.compte_ou_numero}
                  </td>
                  <td className="px-2 py-3">
                    <span className="inline-flex rounded-lg border border-slate-200/80 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm sm:text-xs">
                      {p.destinataireModeLabel}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-700 sm:px-4 sm:text-sm">{meta.type_transaction}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs font-semibold tabular-nums text-slate-900 sm:px-4 sm:text-sm">
                    {meta.montant.toLocaleString('fr-FR')} {meta.devise}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600 sm:px-4 sm:text-sm">{meta.canal}</td>
                  <td className="px-3 py-3 sm:px-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-14 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full transition-all ${
                            riskScore >= 75
                              ? 'bg-red-500'
                              : riskScore >= 50
                                ? 'bg-orange-500'
                                : riskScore >= 25
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-500'
                          }`}
                          style={{ width: `${riskScore}%` }}
                        />
                      </div>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-xs ${risk.color} ${risk.bg}`}
                      >
                        {riskScore}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 pr-4 sm:px-4">
                    {tx.target_labels.cible_fraude ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-800 sm:text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Fraude
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 sm:text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Validée
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pag && (
        <div className="flex flex-col gap-3 border-t border-slate-200/90 bg-gradient-to-r from-slate-50/90 to-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-slate-600">
            {pag.totalItems === 0 ? (
              'Aucune transaction pour ces filtres.'
            ) : (
              <>
                Affichage{' '}
                <span className="font-semibold tabular-nums text-slate-900">
                  {rangeStart}–{rangeEnd}
                </span>{' '}
                sur <span className="font-semibold text-slate-900">{pag.totalItems}</span>
                <span className="text-slate-400"> · </span>
                {pag.pageSize} par page
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="inline-flex items-center rounded-lg border border-slate-200/90 bg-white p-0.5 shadow-sm">
              <button
                type="button"
                disabled={pag.page <= 1}
                onClick={() => pag.onPageChange(pag.page - 1)}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Précédent
              </button>
              <span className="min-w-[6.5rem] px-2 text-center text-xs font-medium tabular-nums text-slate-800">
                {pag.page} / {pag.pageCount}
              </span>
              <button
                type="button"
                disabled={pag.page >= pag.pageCount}
                onClick={() => pag.onPageChange(pag.page + 1)}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      )}

      {displayed.length === 0 && !pag && (
        <div className="border-t border-slate-100 px-5 py-10 text-center text-sm text-slate-500">
          Aucune transaction à afficher.
        </div>
      )}

      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => {
            setSelectedTransaction(null);
            onCloseDetailFromUrl?.();
          }}
        />
      )}
    </div>
  );
}
