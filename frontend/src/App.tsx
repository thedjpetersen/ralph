import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { PageLoadingSpinner } from './components/ui/PageLoadingSpinner';
import './App.css';

// Lazy load all page components for route-based code splitting
// Dashboard is loaded eagerly as it's the landing page
import { Dashboard } from './pages/Dashboard';

// Lazy loaded pages - grouped by feature area
const Accounts = lazy(() => import('./pages/Accounts').then(m => ({ default: m.Accounts })));
const AccountSettings = lazy(() => import('./pages/AccountSettings').then(m => ({ default: m.AccountSettings })));
const AccountMembers = lazy(() => import('./pages/AccountMembers').then(m => ({ default: m.AccountMembers })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const OrganizedSettings = lazy(() => import('./pages/OrganizedSettings').then(m => ({ default: m.OrganizedSettings })));
const APIKeys = lazy(() => import('./pages/APIKeys').then(m => ({ default: m.APIKeys })));
const SkeletonDemo = lazy(() => import('./pages/SkeletonDemo').then(m => ({ default: m.SkeletonDemo })));
const SidebarDemo = lazy(() => import('./pages/SidebarDemo').then(m => ({ default: m.SidebarDemo })));
const ToastDemo = lazy(() => import('./pages/ToastDemo').then(m => ({ default: m.ToastDemo })));
const AuthorComparisonDemo = lazy(() => import('./pages/AuthorComparisonDemo').then(m => ({ default: m.AuthorComparisonDemo })));
const TitleSuggestionsDemo = lazy(() => import('./pages/TitleSuggestionsDemo').then(m => ({ default: m.TitleSuggestionsDemo })));
const AISummaryDemo = lazy(() => import('./pages/AISummaryDemo').then(m => ({ default: m.AISummaryDemo })));
const AIOutlineDemo = lazy(() => import('./pages/AIOutlineDemo').then(m => ({ default: m.AIOutlineDemo })));
const AISentenceCombinerDemo = lazy(() => import('./pages/AISentenceCombinerDemo').then(m => ({ default: m.AISentenceCombinerDemo })));
const AITransitionSuggestionsDemo = lazy(() => import('./pages/AITransitionSuggestionsDemo').then(m => ({ default: m.AITransitionSuggestionsDemo })));
const AIWritingPromptsDemo = lazy(() => import('./pages/AIWritingPromptsDemo').then(m => ({ default: m.AIWritingPromptsDemo })));
const CommentsSortDemo = lazy(() => import('./pages/CommentsSortDemo').then(m => ({ default: m.CommentsSortDemo })));
const CodeBlockDemo = lazy(() => import('./pages/CodeBlockDemo').then(m => ({ default: m.CodeBlockDemo })));

// Store pages
const Stores = lazy(() => import('./pages/Stores').then(m => ({ default: m.Stores })));
const StoreDetail = lazy(() => import('./pages/StoreDetail').then(m => ({ default: m.StoreDetail })));
const StoreForm = lazy(() => import('./components/StoreForm').then(m => ({ default: m.StoreForm })));

// Product pages
const Products = lazy(() => import('./pages/Products').then(m => ({ default: m.Products })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const Brands = lazy(() => import('./pages/Brands').then(m => ({ default: m.Brands })));
const Categories = lazy(() => import('./pages/Categories').then(m => ({ default: m.Categories })));

// Transaction pages
const Transactions = lazy(() => import('./pages/Transactions').then(m => ({ default: m.Transactions })));
const TransactionDetail = lazy(() => import('./pages/TransactionDetail').then(m => ({ default: m.TransactionDetail })));
const TransactionForm = lazy(() => import('./components/TransactionForm').then(m => ({ default: m.TransactionForm })));
const LineItems = lazy(() => import('./pages/LineItems').then(m => ({ default: m.LineItems })));

// Receipt pages
const Receipts = lazy(() => import('./pages/Receipts').then(m => ({ default: m.Receipts })));
const ReceiptDetail = lazy(() => import('./pages/ReceiptDetail').then(m => ({ default: m.ReceiptDetail })));
const ReceiptUpload = lazy(() => import('./pages/ReceiptUpload').then(m => ({ default: m.ReceiptUpload })));

// Budget pages
const Budget = lazy(() => import('./pages/Budget').then(m => ({ default: m.Budget })));
const Budgets = lazy(() => import('./pages/Budgets').then(m => ({ default: m.Budgets })));
const BudgetDetail = lazy(() => import('./pages/BudgetDetail').then(m => ({ default: m.BudgetDetail })));
const BudgetForm = lazy(() => import('./components/BudgetForm').then(m => ({ default: m.BudgetForm })));
const BudgetGoals = lazy(() => import('./pages/BudgetGoals').then(m => ({ default: m.BudgetGoals })));

// Bills pages
const Bills = lazy(() => import('./pages/Bills').then(m => ({ default: m.Bills })));

// Financial pages
const FinancialConnections = lazy(() => import('./pages/FinancialConnections').then(m => ({ default: m.FinancialConnections })));
const FinancialAccounts = lazy(() => import('./pages/FinancialAccounts').then(m => ({ default: m.FinancialAccounts })));
const FinancialTransactions = lazy(() => import('./pages/FinancialTransactions').then(m => ({ default: m.FinancialTransactions })));
const BankTransactions = lazy(() => import('./pages/BankTransactions').then(m => ({ default: m.BankTransactions })));
const BankTransactionDetail = lazy(() => import('./pages/BankTransactionDetail').then(m => ({ default: m.BankTransactionDetail })));

// Persona pages
const Personas = lazy(() => import('./pages/Personas').then(m => ({ default: m.Personas })));
const PersonaForm = lazy(() => import('./components/PersonaForm').then(m => ({ default: m.PersonaForm })));

// Paycheck pages
const Paychecks = lazy(() => import('./pages/Paychecks').then(m => ({ default: m.Paychecks })));
const PaycheckDetail = lazy(() => import('./pages/PaycheckDetail').then(m => ({ default: m.PaycheckDetail })));
const PaycheckForm = lazy(() => import('./components/PaycheckForm').then(m => ({ default: m.PaycheckForm })));
const Employers = lazy(() => import('./pages/Employers').then(m => ({ default: m.Employers })));

// Retirement pages - heavy with charts
const RetirementPlans = lazy(() => import('./pages/RetirementPlans').then(m => ({ default: m.RetirementPlans })));
const RetirementPlanDetail = lazy(() => import('./pages/RetirementPlanDetail').then(m => ({ default: m.RetirementPlanDetail })));
const RetirementPlanForm = lazy(() => import('./components/RetirementPlanForm').then(m => ({ default: m.RetirementPlanForm })));
const FIRECalculator = lazy(() => import('./pages/FIRECalculator').then(m => ({ default: m.FIRECalculator })));
const FIREHistory = lazy(() => import('./pages/FIREHistory').then(m => ({ default: m.FIREHistory })));
const RetirementProjections = lazy(() => import('./pages/RetirementProjections').then(m => ({ default: m.RetirementProjections })));
const WithdrawalStrategy = lazy(() => import('./pages/WithdrawalStrategy').then(m => ({ default: m.WithdrawalStrategy })));
const RetirementBacktest = lazy(() => import('./pages/RetirementBacktest').then(m => ({ default: m.RetirementBacktest })));

// Integration pages
const Integrations = lazy(() => import('./pages/Integrations').then(m => ({ default: m.Integrations })));
const GoogleDriveSettings = lazy(() => import('./pages/GoogleDriveSettings').then(m => ({ default: m.GoogleDriveSettings })));
const GoogleDriveSync = lazy(() => import('./pages/GoogleDriveSync').then(m => ({ default: m.GoogleDriveSync })));
const EmailSettings = lazy(() => import('./pages/EmailSettings').then(m => ({ default: m.EmailSettings })));
const EmailSync = lazy(() => import('./pages/EmailSync').then(m => ({ default: m.EmailSync })));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const QueueManagement = lazy(() => import('./pages/admin/QueueManagement').then(m => ({ default: m.QueueManagement })));
const UserManagement = lazy(() => import('./pages/admin/UserManagement').then(m => ({ default: m.UserManagement })));

// Error pages
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        {/* Dashboard loaded eagerly for fast initial load */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* All other routes wrapped in Suspense for lazy loading */}
        <Route path="/accounts" element={<Suspense fallback={<PageLoadingSpinner />}><Accounts /></Suspense>} />
        <Route path="/accounts/:id/settings" element={<Suspense fallback={<PageLoadingSpinner />}><AccountSettings /></Suspense>} />
        <Route path="/accounts/:id/members" element={<Suspense fallback={<PageLoadingSpinner />}><AccountMembers /></Suspense>} />
        <Route path="/profile" element={<Suspense fallback={<PageLoadingSpinner />}><Profile /></Suspense>} />
        <Route path="/settings" element={<Suspense fallback={<PageLoadingSpinner />}><OrganizedSettings /></Suspense>} />
        <Route path="/settings/legacy" element={<Suspense fallback={<PageLoadingSpinner />}><Settings /></Suspense>} />
        <Route path="/api-keys" element={<Suspense fallback={<PageLoadingSpinner />}><APIKeys /></Suspense>} />
        <Route path="/skeleton-demo" element={<Suspense fallback={<PageLoadingSpinner />}><SkeletonDemo /></Suspense>} />
        <Route path="/sidebar-demo" element={<Suspense fallback={<PageLoadingSpinner />}><SidebarDemo /></Suspense>} />
        <Route path="/toast-demo" element={<Suspense fallback={<PageLoadingSpinner />}><ToastDemo /></Suspense>} />
        <Route path="/author-comparison-demo" element={<Suspense fallback={<PageLoadingSpinner />}><AuthorComparisonDemo /></Suspense>} />
        <Route path="/title-suggestions-demo" element={<Suspense fallback={<PageLoadingSpinner />}><TitleSuggestionsDemo /></Suspense>} />
        <Route path="/ai-summary-demo" element={<Suspense fallback={<PageLoadingSpinner />}><AISummaryDemo /></Suspense>} />
        <Route path="/ai-outline-demo" element={<Suspense fallback={<PageLoadingSpinner />}><AIOutlineDemo /></Suspense>} />
        <Route path="/ai-sentence-combiner-demo" element={<Suspense fallback={<PageLoadingSpinner />}><AISentenceCombinerDemo /></Suspense>} />
        <Route path="/ai-transition-suggestions-demo" element={<Suspense fallback={<PageLoadingSpinner />}><AITransitionSuggestionsDemo /></Suspense>} />
        <Route path="/ai-writing-prompts-demo" element={<Suspense fallback={<PageLoadingSpinner />}><AIWritingPromptsDemo /></Suspense>} />
        <Route path="/comments-sort-demo" element={<Suspense fallback={<PageLoadingSpinner />}><CommentsSortDemo /></Suspense>} />
        <Route path="/code-block-demo" element={<Suspense fallback={<PageLoadingSpinner />}><CodeBlockDemo /></Suspense>} />
        <Route path="/stores" element={<Suspense fallback={<PageLoadingSpinner />}><Stores /></Suspense>} />
        <Route path="/stores/new" element={<Suspense fallback={<PageLoadingSpinner />}><StoreForm /></Suspense>} />
        <Route path="/stores/:id" element={<Suspense fallback={<PageLoadingSpinner />}><StoreDetail /></Suspense>} />
        <Route path="/stores/:id/edit" element={<Suspense fallback={<PageLoadingSpinner />}><StoreForm /></Suspense>} />
        <Route path="/products" element={<Suspense fallback={<PageLoadingSpinner />}><Products /></Suspense>} />
        <Route path="/products/:id" element={<Suspense fallback={<PageLoadingSpinner />}><ProductDetail /></Suspense>} />
        <Route path="/brands" element={<Suspense fallback={<PageLoadingSpinner />}><Brands /></Suspense>} />
        <Route path="/categories" element={<Suspense fallback={<PageLoadingSpinner />}><Categories /></Suspense>} />
        <Route path="/transactions" element={<Suspense fallback={<PageLoadingSpinner />}><Transactions /></Suspense>} />
        <Route path="/transactions/new" element={<Suspense fallback={<PageLoadingSpinner />}><TransactionForm /></Suspense>} />
        <Route path="/transactions/:id" element={<Suspense fallback={<PageLoadingSpinner />}><TransactionDetail /></Suspense>} />
        <Route path="/transactions/:id/edit" element={<Suspense fallback={<PageLoadingSpinner />}><TransactionForm /></Suspense>} />
        <Route path="/line-items" element={<Suspense fallback={<PageLoadingSpinner />}><LineItems /></Suspense>} />
        <Route path="/receipts" element={<Suspense fallback={<PageLoadingSpinner />}><Receipts /></Suspense>} />
        <Route path="/receipts/upload" element={<Suspense fallback={<PageLoadingSpinner />}><ReceiptUpload /></Suspense>} />
        <Route path="/receipts/:id" element={<Suspense fallback={<PageLoadingSpinner />}><ReceiptDetail /></Suspense>} />
        <Route path="/budget" element={<Suspense fallback={<PageLoadingSpinner />}><Budget /></Suspense>} />
        <Route path="/budgets" element={<Suspense fallback={<PageLoadingSpinner />}><Budgets /></Suspense>} />
        <Route path="/budgets/new" element={<Suspense fallback={<PageLoadingSpinner />}><BudgetForm /></Suspense>} />
        <Route path="/budgets/:id" element={<Suspense fallback={<PageLoadingSpinner />}><BudgetDetail /></Suspense>} />
        <Route path="/budgets/:id/edit" element={<Suspense fallback={<PageLoadingSpinner />}><BudgetForm /></Suspense>} />
        <Route path="/budgets/:id/goals" element={<Suspense fallback={<PageLoadingSpinner />}><BudgetGoals /></Suspense>} />
        <Route path="/bills" element={<Suspense fallback={<PageLoadingSpinner />}><Bills /></Suspense>} />
        <Route path="/connections" element={<Suspense fallback={<PageLoadingSpinner />}><FinancialConnections /></Suspense>} />
        <Route path="/financial-accounts" element={<Suspense fallback={<PageLoadingSpinner />}><FinancialAccounts /></Suspense>} />
        <Route path="/financial-transactions" element={<Suspense fallback={<PageLoadingSpinner />}><FinancialTransactions /></Suspense>} />
        <Route path="/bank-transactions" element={<Suspense fallback={<PageLoadingSpinner />}><BankTransactions /></Suspense>} />
        <Route path="/bank-transactions/:id" element={<Suspense fallback={<PageLoadingSpinner />}><BankTransactionDetail /></Suspense>} />
        <Route path="/personas" element={<Suspense fallback={<PageLoadingSpinner />}><Personas /></Suspense>} />
        <Route path="/personas/new" element={<Suspense fallback={<PageLoadingSpinner />}><PersonaForm /></Suspense>} />
        <Route path="/personas/:id/edit" element={<Suspense fallback={<PageLoadingSpinner />}><PersonaForm /></Suspense>} />
        <Route path="/paychecks" element={<Suspense fallback={<PageLoadingSpinner />}><Paychecks /></Suspense>} />
        <Route path="/paychecks/new" element={<Suspense fallback={<PageLoadingSpinner />}><PaycheckForm /></Suspense>} />
        <Route path="/paychecks/:id" element={<Suspense fallback={<PageLoadingSpinner />}><PaycheckDetail /></Suspense>} />
        <Route path="/paychecks/:id/edit" element={<Suspense fallback={<PageLoadingSpinner />}><PaycheckForm /></Suspense>} />
        <Route path="/employers" element={<Suspense fallback={<PageLoadingSpinner />}><Employers /></Suspense>} />
        <Route path="/retirement-plans" element={<Suspense fallback={<PageLoadingSpinner />}><RetirementPlans /></Suspense>} />
        <Route path="/retirement-plans/new" element={<Suspense fallback={<PageLoadingSpinner />}><RetirementPlanForm /></Suspense>} />
        <Route path="/retirement-plans/:id" element={<Suspense fallback={<PageLoadingSpinner />}><RetirementPlanDetail /></Suspense>} />
        <Route path="/retirement-plans/:id/edit" element={<Suspense fallback={<PageLoadingSpinner />}><RetirementPlanForm /></Suspense>} />
        <Route path="/fire-calculator" element={<Suspense fallback={<PageLoadingSpinner />}><FIRECalculator /></Suspense>} />
        <Route path="/fire-history" element={<Suspense fallback={<PageLoadingSpinner />}><FIREHistory /></Suspense>} />
        <Route path="/retirement-projections" element={<Suspense fallback={<PageLoadingSpinner />}><RetirementProjections /></Suspense>} />
        <Route path="/withdrawal-strategy" element={<Suspense fallback={<PageLoadingSpinner />}><WithdrawalStrategy /></Suspense>} />
        <Route path="/retirement-backtest" element={<Suspense fallback={<PageLoadingSpinner />}><RetirementBacktest /></Suspense>} />
        <Route path="/integrations" element={<Suspense fallback={<PageLoadingSpinner />}><Integrations /></Suspense>} />
        <Route path="/integrations/google-drive" element={<Suspense fallback={<PageLoadingSpinner />}><GoogleDriveSettings /></Suspense>} />
        <Route path="/integrations/google-drive/callback" element={<Suspense fallback={<PageLoadingSpinner />}><GoogleDriveSettings /></Suspense>} />
        <Route path="/integrations/google-drive/sync" element={<Suspense fallback={<PageLoadingSpinner />}><GoogleDriveSync /></Suspense>} />
        <Route path="/integrations/email" element={<Suspense fallback={<PageLoadingSpinner />}><EmailSettings /></Suspense>} />
        <Route path="/integrations/email/callback" element={<Suspense fallback={<PageLoadingSpinner />}><EmailSettings /></Suspense>} />
        <Route path="/integrations/email/sync" element={<Suspense fallback={<PageLoadingSpinner />}><EmailSync /></Suspense>} />

        {/* Admin routes - protected by RequireRole inside component */}
        <Route path="/admin" element={<Suspense fallback={<PageLoadingSpinner />}><AdminDashboard /></Suspense>} />
        <Route path="/admin/queue" element={<Suspense fallback={<PageLoadingSpinner />}><QueueManagement /></Suspense>} />
        <Route path="/admin/users" element={<Suspense fallback={<PageLoadingSpinner />}><UserManagement /></Suspense>} />

        {/* Catch-all route for 404 */}
        <Route path="*" element={<Suspense fallback={<PageLoadingSpinner />}><NotFound /></Suspense>} />
      </Route>
    </Routes>
  );
}

export default App;
