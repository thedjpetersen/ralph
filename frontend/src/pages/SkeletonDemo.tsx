import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import { SettingsFormSkeleton } from '../components/skeletons';
import { MembersPageSkeleton } from '../components/skeletons';
import { ProfileSkeleton } from '../components/skeletons';
import './SkeletonDemo.css';

export function SkeletonDemo() {
  return (
    <PageTransition>
      <div className="skeleton-demo-page">
        <div className="skeleton-demo-header">
          <h1>Skeleton Loading States</h1>
          <p className="skeleton-demo-subtitle">UI-002: Skeleton loaders that match the exact layout of content</p>
        </div>

        <section className="skeleton-demo-section">
          <h2>Accounts List</h2>
          <p className="section-description">Card skeletons for the accounts grid</p>
          <AccountsListSkeleton count={3} />
        </section>

        <section className="skeleton-demo-section">
          <h2>Account Settings Form</h2>
          <p className="section-description">Title + form field skeletons</p>
          <SettingsFormSkeleton />
        </section>

        <section className="skeleton-demo-section">
          <h2>Account Members Table</h2>
          <p className="section-description">Table row skeletons with member info</p>
          <MembersPageSkeleton />
        </section>

        <section className="skeleton-demo-section">
          <h2>User Profile</h2>
          <p className="section-description">Avatar + form skeletons</p>
          <ProfileSkeleton />
        </section>
      </div>
    </PageTransition>
  );
}
