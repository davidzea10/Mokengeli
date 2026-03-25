import { useState } from 'react';
import type { Transaction } from '../../types';

interface TransactionTableProps {
  transactions: Transaction[];
}

type SortField = 'date_transaction' | 'montant' | 'riskScore';
type SortOrder = 'asc' | 'desc';

export function TransactionTable({ transactions }: TransactionTableProps) {
  const [sortField, setSortField] = useState<SortField>('date_transaction');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const calculateRiskScore = (tx: Transaction): number => {
    let score = 0;
    const event = tx.transaction_event;
    
    // Network intelligence (25 points)
    if (event.network_intelligence.ip_sur_liste_noire) score += 10;
    if (event.network_intelligence.ip_datacenter) score += 5;
    if (event.network_intelligence.ip_pays_inhabituel) score += 5;
    if (event.network_intelligence.score_reputation_ip < 0.3) score += 5;

    // Anonymization detection (25 points)
    if (event.anonymization_detection.tor_detecte) score += 10;
    if (event.anonymization_detection.vpn_detecte) score += 8;
    if (event.anonymization_detection.proxy_detecte) score += 7;

    // Behavioral biometrics (20 points)
    if (event.behavioral_biometrics_ueba.nb_echecs_login_24h > 3) score += 8;
    if (event.behavioral_biometrics_ueba.nombre_requetes_par_minute > 10) score += 6;
    if (event.behavioral_biometrics_ueba.vitesse_frappe < 20) score += 6;

    // Engineered features (15 points)
    if (event.engineered_features_profiling.beneficiaire_nouveau) score += 5;
    if (event.engineered_features_profiling.changement_appareil) score += 5;
    if (event.engineered_features_profiling.vitesse_24h > 1000) score += 5;

    // Relational graph (10 points)
    if (event.relational_graph_features.nb_voisins_frauduleux > 2) score += 10;

    // Security integrity (5 points)
    if (!event.security_integrity.signature_transaction_valide) score += 3;
    if (!event.security_integrity.certificat_valide) score += 2;

    return Math.min(score, 100);
  };

  const getRiskLevel = (score: number): { label: string; color: string; bg: string } => {
    if (score >= 75) return { label: 'Critique', color: 'text-red-700', bg: 'bg-red-100' };
    if (score >= 50) return { label: 'Élevé', color: 'text-orange-700', bg: 'bg-orange-100' };
    if (score >= 25) return { label: 'Moyen', color: 'text-yellow-700', bg: 'bg-yellow-100' };
    return { label: 'Faible', color: 'text-emerald-700', bg: 'bg-emerald-100' };
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    let aVal: any, bVal: any;
    
    if (sortField === 'date_transaction') {
      aVal = new Date(a.transaction_event.metadata.date_transaction).getTime();
      bVal = new Date(b.transaction_event.metadata.date_transaction).getTime();
    } else if (sortField === 'montant') {
      aVal = a.transaction_event.metadata.montant;
      bVal = b.transaction_event.metadata.montant;
    } else {
      aVal = calculateRiskScore(a);
      bVal = calculateRiskScore(b);
    }

    if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

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
      <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
      </svg>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-neutral-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base sm:text-lg font-semibold text-neutral-900">Transactions récentes</h2>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" className="px-3 py-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors">
            Exporter
          </button>
          <button type="button" className="px-3 py-1.5 text-sm font-medium text-rb-black bg-rb-yellow hover:bg-rb-yellow-dark rounded-lg transition-colors">
            Filtrer
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-rb-page border-b border-neutral-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('date_transaction')}
                  className="flex items-center hover:text-neutral-900"
                >
                  Date <SortIcon field="date_transaction" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Transaction
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Client
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('montant')}
                  className="flex items-center hover:text-neutral-900"
                >
                  Montant <SortIcon field="montant" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Canal
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('riskScore')}
                  className="flex items-center hover:text-neutral-900"
                >
                  Risque <SortIcon field="riskScore" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Statut
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {sortedTransactions.map((tx, index) => {
              const riskScore = calculateRiskScore(tx);
              const risk = getRiskLevel(riskScore);
              const meta = tx.transaction_event.metadata;

              return (
                <tr 
                  key={index}
                  className="hover:bg-rb-page transition-colors cursor-pointer"
                  onClick={() => setSelectedTransaction(tx)}
                >
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    {new Date(meta.date_transaction).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                    {meta.numero_transaction}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    {meta.id_client}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    {meta.type_transaction}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-neutral-900">
                    {meta.montant.toLocaleString('fr-FR')} {meta.devise}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    {meta.canal}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            riskScore >= 75 ? 'bg-red-500' :
                            riskScore >= 50 ? 'bg-orange-500' :
                            riskScore >= 25 ? 'bg-yellow-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${riskScore}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${risk.color} ${risk.bg}`}>
                        {riskScore}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {tx.target_labels.cible_fraude ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></span>
                        Fraude
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
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

      {selectedTransaction && (
        <TransactionDetailModal 
          transaction={selectedTransaction} 
          onClose={() => setSelectedTransaction(null)} 
        />
      )}
    </div>
  );
}

function TransactionDetailModal({ transaction, onClose }: { transaction: Transaction; onClose: () => void }) {
  const event = transaction.transaction_event;
  const meta = event.metadata;
  const riskScore = 65; // Simplified for demo

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 sm:p-6 border-b border-neutral-200 flex items-start gap-3 justify-between">
          <div>
            <h3 className="text-xl font-bold text-neutral-900">Détails de la transaction</h3>
            <p className="text-sm text-neutral-500">{meta.numero_transaction}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-lg hover:bg-neutral-100 flex items-center justify-center transition-colors">
            <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-rb-page rounded-lg p-4">
              <p className="text-xs font-medium text-neutral-500 uppercase">Montant</p>
              <p className="text-2xl font-bold text-neutral-900">{meta.montant.toLocaleString('fr-FR')} {meta.devise}</p>
            </div>
            <div className="bg-rb-page rounded-lg p-4">
              <p className="text-xs font-medium text-neutral-500 uppercase">Score de risque</p>
              <p className="text-2xl font-bold text-orange-600">{riskScore}%</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-900 mb-3">Métadonnées</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-neutral-500">Client:</span> <span className="font-medium text-neutral-900">{meta.id_client}</span></div>
              <div><span className="text-neutral-500">Type:</span> <span className="font-medium text-neutral-900">{meta.type_transaction}</span></div>
              <div><span className="text-neutral-500">Canal:</span> <span className="font-medium text-neutral-900">{meta.canal}</span></div>
              <div><span className="text-neutral-500">Date:</span> <span className="font-medium text-neutral-900">{new Date(meta.date_transaction).toLocaleString('fr-FR')}</span></div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-900 mb-3">Intelligence réseau</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${event.network_intelligence.ip_sur_liste_noire ? 'bg-red-50 border border-red-200' : 'bg-rb-page'}`}>
                <p className="text-xs text-neutral-500">IP sur liste noire</p>
                <p className={`font-semibold ${event.network_intelligence.ip_sur_liste_noire ? 'text-red-600' : 'text-emerald-600'}`}>
                  {event.network_intelligence.ip_sur_liste_noire ? 'Oui' : 'Non'}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${event.network_intelligence.ip_datacenter ? 'bg-orange-50 border border-orange-200' : 'bg-rb-page'}`}>
                <p className="text-xs text-neutral-500">IP Datacenter</p>
                <p className={`font-semibold ${event.network_intelligence.ip_datacenter ? 'text-orange-600' : 'text-emerald-600'}`}>
                  {event.network_intelligence.ip_datacenter ? 'Oui' : 'Non'}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${event.anonymization_detection.tor_detecte ? 'bg-red-50 border border-red-200' : 'bg-rb-page'}`}>
                <p className="text-xs text-neutral-500">TOR Détecté</p>
                <p className={`font-semibold ${event.anonymization_detection.tor_detecte ? 'text-red-600' : 'text-emerald-600'}`}>
                  {event.anonymization_detection.tor_detecte ? 'Oui' : 'Non'}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${event.anonymization_detection.vpn_detecte ? 'bg-orange-50 border border-orange-200' : 'bg-rb-page'}`}>
                <p className="text-xs text-neutral-500">VPN Détecté</p>
                <p className={`font-semibold ${event.anonymization_detection.vpn_detecte ? 'text-orange-600' : 'text-emerald-600'}`}>
                  {event.anonymization_detection.vpn_detecte ? 'Oui' : 'Non'}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-900 mb-3">Biométrie comportementale</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-rb-page rounded-lg p-3">
                <p className="text-xs text-neutral-500">Durée session</p>
                <p className="font-semibold text-neutral-900">{event.behavioral_biometrics_ueba.duree_session_min} min</p>
              </div>
              <div className="bg-rb-page rounded-lg p-3">
                <p className="text-xs text-neutral-500">Écrans session</p>
                <p className="font-semibold text-neutral-900">{event.behavioral_biometrics_ueba.nb_ecrans_session}</p>
              </div>
              <div className="bg-rb-page rounded-lg p-3">
                <p className="text-xs text-neutral-500">Délai OTP</p>
                <p className="font-semibold text-neutral-900">{event.behavioral_biometrics_ueba.delai_otp_s}s</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-neutral-200">
            <button type="button" className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors">
              Approuver
            </button>
            <button type="button" className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors">
              Rejeter
            </button>
            <button type="button" className="sm:flex-initial px-4 py-2.5 bg-neutral-100 text-neutral-700 font-medium rounded-lg hover:bg-neutral-200 transition-colors">
              En attente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
