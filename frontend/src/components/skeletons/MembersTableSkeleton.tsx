import { Skeleton, SkeletonButton } from '../Skeleton';
import './MembersTableSkeleton.css';

function MemberRowSkeleton() {
  return (
    <tr className="member-row-skeleton">
      <td>
        <div className="member-info-skeleton">
          <Skeleton width="120px" height="1rem" borderRadius="4px" />
          <Skeleton width="180px" height="0.875rem" borderRadius="4px" />
        </div>
      </td>
      <td>
        <Skeleton width="60px" height="1.5rem" borderRadius="9999px" />
      </td>
      <td>
        <Skeleton width="80px" height="0.875rem" borderRadius="4px" />
      </td>
      <td>
        <Skeleton width="70px" height="1.75rem" borderRadius="6px" />
      </td>
    </tr>
  );
}

export function MembersTableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="members-table-skeleton-container">
      <table className="members-table-skeleton">
        <thead>
          <tr>
            <th>Member</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <MemberRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MembersPageSkeleton() {
  return (
    <div className="members-page-skeleton">
      <div className="members-skeleton-header">
        <Skeleton width="120px" height="0.875rem" borderRadius="4px" />
        <div className="members-skeleton-header-content">
          <div className="members-skeleton-title">
            <Skeleton width="180px" height="2rem" borderRadius="4px" />
            <Skeleton width="240px" height="1rem" borderRadius="4px" />
          </div>
          <SkeletonButton width="130px" />
        </div>
      </div>
      <MembersTableSkeleton rows={3} />
    </div>
  );
}
