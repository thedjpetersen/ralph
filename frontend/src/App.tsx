import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Accounts } from './pages/Accounts';
import { AccountSettings } from './pages/AccountSettings';
import { AccountMembers } from './pages/AccountMembers';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { APIKeys } from './pages/APIKeys';
import { SkeletonDemo } from './pages/SkeletonDemo';
import { Stores } from './pages/Stores';
import { StoreDetail } from './pages/StoreDetail';
import { StoreForm } from './components/StoreForm';
import { Products } from './pages/Products';
import { ProductDetail } from './pages/ProductDetail';
import { Brands } from './pages/Brands';
import { Categories } from './pages/Categories';
import './App.css';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/accounts" replace />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/accounts/:id/settings" element={<AccountSettings />} />
        <Route path="/accounts/:id/members" element={<AccountMembers />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/api-keys" element={<APIKeys />} />
        <Route path="/skeleton-demo" element={<SkeletonDemo />} />
        <Route path="/stores" element={<Stores />} />
        <Route path="/stores/new" element={<StoreForm />} />
        <Route path="/stores/:id" element={<StoreDetail />} />
        <Route path="/stores/:id/edit" element={<StoreForm />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/brands" element={<Brands />} />
        <Route path="/categories" element={<Categories />} />
      </Route>
    </Routes>
  );
}

export default App;
