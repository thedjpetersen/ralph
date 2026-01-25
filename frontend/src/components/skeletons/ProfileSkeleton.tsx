import { Skeleton, SkeletonAvatar, SkeletonInput, SkeletonButton } from '../Skeleton';
import './ProfileSkeleton.css';

export function ProfileSkeleton() {
  return (
    <div className="profile-skeleton">
      <div className="profile-skeleton-header">
        <Skeleton width="80px" height="2rem" borderRadius="4px" />
        <Skeleton width="200px" height="1rem" borderRadius="4px" />
      </div>

      <div className="profile-skeleton-content">
        <div className="profile-skeleton-avatar-section">
          <SkeletonAvatar size={80} />
          <div className="profile-skeleton-avatar-info">
            <Skeleton width="120px" height="1.25rem" borderRadius="4px" />
            <Skeleton width="180px" height="0.875rem" borderRadius="4px" />
            <Skeleton width="100px" height="0.75rem" borderRadius="4px" />
          </div>
        </div>

        <div className="profile-skeleton-form">
          <div className="profile-skeleton-group">
            <Skeleton width="100px" height="0.875rem" borderRadius="4px" />
            <SkeletonInput />
            <Skeleton width="280px" height="0.75rem" borderRadius="4px" />
          </div>

          <div className="profile-skeleton-group">
            <Skeleton width="100px" height="0.875rem" borderRadius="4px" />
            <SkeletonInput />
            <Skeleton width="250px" height="0.75rem" borderRadius="4px" />
          </div>

          <div className="profile-skeleton-actions">
            <SkeletonButton width="120px" />
          </div>
        </div>

        <div className="profile-skeleton-links">
          <Skeleton width="100%" height="3.5rem" borderRadius="8px" />
          <Skeleton width="100%" height="3.5rem" borderRadius="8px" />
        </div>
      </div>
    </div>
  );
}
