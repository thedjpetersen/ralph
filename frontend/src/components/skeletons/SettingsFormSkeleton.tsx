import { Skeleton, SkeletonInput, SkeletonButton } from '../Skeleton';
import './SettingsFormSkeleton.css';

export function SettingsFormSkeleton() {
  return (
    <div className="settings-form-skeleton">
      <div className="settings-skeleton-header">
        <Skeleton width="120px" height="0.875rem" borderRadius="4px" />
        <Skeleton width="200px" height="2rem" borderRadius="4px" />
        <Skeleton width="280px" height="1rem" borderRadius="4px" />
      </div>

      <div className="settings-skeleton-form">
        <div className="settings-skeleton-group">
          <Skeleton width="100px" height="0.875rem" borderRadius="4px" />
          <SkeletonInput />
          <Skeleton width="200px" height="0.75rem" borderRadius="4px" />
        </div>

        <div className="settings-skeleton-group">
          <Skeleton width="120px" height="0.875rem" borderRadius="4px" />
          <SkeletonInput />
          <Skeleton width="250px" height="0.75rem" borderRadius="4px" />
        </div>

        <div className="settings-skeleton-group">
          <Skeleton width="70px" height="0.875rem" borderRadius="4px" />
          <SkeletonInput />
          <Skeleton width="220px" height="0.75rem" borderRadius="4px" />
        </div>

        <div className="settings-skeleton-actions">
          <SkeletonButton width="80px" />
          <SkeletonButton width="120px" />
        </div>
      </div>
    </div>
  );
}
