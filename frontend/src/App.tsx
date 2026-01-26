import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { AccountSettings } from './pages/AccountSettings';
import { AccountMembers } from './pages/AccountMembers';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { APIKeys } from './pages/APIKeys';
import { SkeletonDemo } from './pages/SkeletonDemo';
import { SidebarDemo } from './pages/SidebarDemo';
import { Stores } from './pages/Stores';
import { StoreDetail } from './pages/StoreDetail';
import { StoreForm } from './components/StoreForm';
import { Products } from './pages/Products';
import { ProductDetail } from './pages/ProductDetail';
import { Brands } from './pages/Brands';
import { Categories } from './pages/Categories';
import { Transactions } from './pages/Transactions';
import { TransactionDetail } from './pages/TransactionDetail';
import { TransactionForm } from './components/TransactionForm';
import { Receipts } from './pages/Receipts';
import { ReceiptDetail } from './pages/ReceiptDetail';
import { ReceiptUpload } from './pages/ReceiptUpload';
import { Budgets } from './pages/Budgets';
import { BudgetDetail } from './pages/BudgetDetail';
import { BudgetForm } from './components/BudgetForm';
import { FinancialConnections } from './pages/FinancialConnections';
import { FinancialAccounts } from './pages/FinancialAccounts';
import { BankTransactions } from './pages/BankTransactions';
import { BankTransactionDetail } from './pages/BankTransactionDetail';
import { Personas } from './pages/Personas';
import { PersonaForm } from './components/PersonaForm';
import { Paychecks } from './pages/Paychecks';
import { PaycheckDetail } from './pages/PaycheckDetail';
import { PaycheckForm } from './components/PaycheckForm';
import { Employers } from './pages/Employers';
import { RetirementPlans } from './pages/RetirementPlans';
import { RetirementPlanDetail } from './pages/RetirementPlanDetail';
import { RetirementPlanForm } from './components/RetirementPlanForm';
import { FIRECalculator } from './pages/FIRECalculator';
import { FIREHistory } from './pages/FIREHistory';
import { RetirementProjections } from './pages/RetirementProjections';
import { WithdrawalStrategy } from './pages/WithdrawalStrategy';
import { RetirementBacktest } from './pages/RetirementBacktest';
import { Integrations } from './pages/Integrations';
import { GoogleDriveSettings } from './pages/GoogleDriveSettings';
import { EmailSettings } from './pages/EmailSettings';
import './App.css';

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/accounts/:id/settings" element={<AccountSettings />} />
        <Route path="/accounts/:id/members" element={<AccountMembers />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/api-keys" element={<APIKeys />} />
        <Route path="/skeleton-demo" element={<SkeletonDemo />} />
        <Route path="/sidebar-demo" element={<SidebarDemo />} />
        <Route path="/stores" element={<Stores />} />
        <Route path="/stores/new" element={<StoreForm />} />
        <Route path="/stores/:id" element={<StoreDetail />} />
        <Route path="/stores/:id/edit" element={<StoreForm />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/brands" element={<Brands />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/transactions/new" element={<TransactionForm />} />
        <Route path="/transactions/:id" element={<TransactionDetail />} />
        <Route path="/transactions/:id/edit" element={<TransactionForm />} />
        <Route path="/receipts" element={<Receipts />} />
        <Route path="/receipts/upload" element={<ReceiptUpload />} />
        <Route path="/receipts/:id" element={<ReceiptDetail />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/budgets/new" element={<BudgetForm />} />
        <Route path="/budgets/:id" element={<BudgetDetail />} />
        <Route path="/budgets/:id/edit" element={<BudgetForm />} />
        <Route path="/connections" element={<FinancialConnections />} />
        <Route path="/financial-accounts" element={<FinancialAccounts />} />
        <Route path="/bank-transactions" element={<BankTransactions />} />
        <Route path="/bank-transactions/:id" element={<BankTransactionDetail />} />
        <Route path="/personas" element={<Personas />} />
        <Route path="/personas/new" element={<PersonaForm />} />
        <Route path="/personas/:id/edit" element={<PersonaForm />} />
        <Route path="/paychecks" element={<Paychecks />} />
        <Route path="/paychecks/new" element={<PaycheckForm />} />
        <Route path="/paychecks/:id" element={<PaycheckDetail />} />
        <Route path="/paychecks/:id/edit" element={<PaycheckForm />} />
        <Route path="/employers" element={<Employers />} />
        <Route path="/retirement-plans" element={<RetirementPlans />} />
        <Route path="/retirement-plans/new" element={<RetirementPlanForm />} />
        <Route path="/retirement-plans/:id" element={<RetirementPlanDetail />} />
        <Route path="/retirement-plans/:id/edit" element={<RetirementPlanForm />} />
        <Route path="/fire-calculator" element={<FIRECalculator />} />
        <Route path="/fire-history" element={<FIREHistory />} />
        <Route path="/retirement-projections" element={<RetirementProjections />} />
        <Route path="/withdrawal-strategy" element={<WithdrawalStrategy />} />
        <Route path="/retirement-backtest" element={<RetirementBacktest />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/integrations/google-drive" element={<GoogleDriveSettings />} />
        <Route path="/integrations/google-drive/callback" element={<GoogleDriveSettings />} />
        <Route path="/integrations/email" element={<EmailSettings />} />
        <Route path="/integrations/email/callback" element={<EmailSettings />} />
      </Route>
    </Routes>
  );
}

export default App;
