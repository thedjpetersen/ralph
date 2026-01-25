import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Accounts } from './pages/Accounts';
import { AccountSettings } from './pages/AccountSettings';
import { AccountMembers } from './pages/AccountMembers';
import './App.css';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/accounts" replace />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/accounts/:id/settings" element={<AccountSettings />} />
        <Route path="/accounts/:id/members" element={<AccountMembers />} />
      </Route>
    </Routes>
  );
}

export default App;
