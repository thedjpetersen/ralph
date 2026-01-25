import { Skeleton } from '../Skeleton';
import './HeaderSkeleton.css';

export function AccountSwitcherSkeleton() {
  return (
    <div className="account-switcher-skeleton">
      <Skeleton width="120px" height="2.25rem" borderRadius="6px" />
    </div>
  );
}
