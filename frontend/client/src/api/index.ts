export {
  sendClientLogin,
  sendClientLogout,
  sendClientTransactionSimulation,
  loginWithApi,
  fetchMeContext,
  createBeneficiaireApi,
  evaluateTransactionWithApi,
  fetchNotificationsUnreadCount,
  fetchNotificationsList,
  postNotificationsReadAll,
  patchNotificationReadOne,
  getApiBaseUrl,
  isApiConfigured,
} from './clientPortal';
export type {
  SendTransactionSimulationParams,
  MeContextData,
  CompteData,
  CarteData,
  LoginApiClient,
  EvaluateTransactionApiData,
  NotificationRow,
  NotificationPayload,
} from './clientPortal';
export { API_ROUTES } from './contracts';
export type {
  ClientLoginBody,
  ClientLogoutBody,
  ClientTransactionSimulationEnvelope,
} from './contracts';
export type { ApiTransactionDocument } from './transactionPayloadEnglish';
