import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ClientSessionProvider, useClientSession } from './context/ClientSessionContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { BankLayout } from './layouts/BankLayout';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { AccountsPage } from './pages/AccountsPage';
import { CardsPage } from './pages/CardsPage';
import { TransferPage } from './pages/TransferPage';
import { HistoryPage } from './pages/HistoryPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';

function RootRedirect() {
  const { isLoggedIn } = useClientSession();
  return <Navigate to={isLoggedIn ? '/app/accueil' : '/connexion'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <BankLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="accueil" replace />} />
        <Route path="accueil" element={<HomePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="comptes" element={<AccountsPage />} />
        <Route path="operations" element={<TransferPage />} />
        <Route path="cartes" element={<CardsPage />} />
        <Route path="historique" element={<HistoryPage />} />
        <Route path="profil" element={<ProfilePage />} />
      </Route>
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ClientSessionProvider>
          <AppRoutes />
        </ClientSessionProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
