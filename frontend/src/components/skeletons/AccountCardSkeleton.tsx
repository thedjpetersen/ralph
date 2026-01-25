import { Skeleton, SkeletonButton } from '../Skeleton';
import './AccountCardSkeleton.css';

export function AccountCardSkeleton() {
  return (
    <div className="account-card-skeleton">
      <div className="account-card-skeleton-header">
        <Skeleton width="60%" height="1.25rem" borderRadius="4px" />
        <Skeleton width="80%" height="0.875rem" borderRadius="4px" />
      </div>
      <div className="account-card-skeleton-details">
        <div className="account-card-skeleton-detail">
          <Skeleton width="60px" height="0.875rem" borderRadius="4px" />
          <Skeleton width="40px" height="0.875rem" borderRadius="4px" />
        </div>
        <div className="account-card-skeleton-detail">
          <Skeleton width="70px" height="0.875rem" borderRadius="4px" />
          <Skeleton width="100px" height="0.875rem" borderRadius="4px" />
        </div>
        <div className="account-card-skeleton-detail">
          <Skeleton width="50px" height="0.875rem" borderRadius="4px" />
          <Skeleton width="80px" height="0.875rem" borderRadius="4px" />
        </div>
      </div>
      <div className="account-card-skeleton-actions">
        <SkeletonButton width="100%" />
        <SkeletonButton width="100%" />
        <SkeletonButton width="100%" />
      </div>
    </div>
  );
}

export function AccountsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="accounts-skeleton-grid">
      {Array.from({ length: count }).map((_, i) => (
        <AccountCardSkeleton key={i} />
      ))}
    </div>
  );
}
