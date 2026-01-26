import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RequireRole } from '../../components/auth/RequireRole';
import { PageTransition } from '../../components/PageTransition';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, Pagination } from '../../components/ui/Table';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { announce } from '../../stores/announcer';
import './QueueManagement.css';

// SVG Icons
const QueueIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 6h16M4 10h16M4 14h10M4 18h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 14l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M19 12H5m0 0l7 7m-7-7l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const RetryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M1 4v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Types matching backend
type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

interface Job {
  id: string;
  queueName: string;
  type: string;
  status: JobStatus;
  payload: unknown;
  retryCount: number;
  maxRetries: number;
  error: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

interface QueueStats {
  totalQueues: number;
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  queueBreakdown: Record<string, number>;
  avgProcessingMs: number;
}

interface Queue {
  name: string;
  status: 'active' | 'paused' | 'stopped';
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  cancelledCount: number;
  createdAt: string;
  updatedAt: string;
}

// Mock data for demo purposes - replace with actual API calls
const mockStats: QueueStats = {
  totalQueues: 4,
  totalJobs: 156,
  pendingJobs: 12,
  processingJobs: 3,
  completedJobs: 135,
  failedJobs: 4,
  cancelledJobs: 2,
  queueBreakdown: {
    'email_import': 45,
    'drive_sync': 38,
    'ocr_processing': 52,
    'receipt_extraction': 21,
  },
  avgProcessingMs: 2340,
};

const mockQueues: Queue[] = [
  { name: 'email_import', status: 'active', pendingCount: 5, processingCount: 1, completedCount: 35, failedCount: 2, cancelledCount: 2, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-20T10:30:00Z' },
  { name: 'drive_sync', status: 'active', pendingCount: 3, processingCount: 1, completedCount: 32, failedCount: 1, cancelledCount: 1, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-20T10:28:00Z' },
  { name: 'ocr_processing', status: 'active', pendingCount: 2, processingCount: 1, completedCount: 48, failedCount: 1, cancelledCount: 0, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-20T10:25:00Z' },
  { name: 'receipt_extraction', status: 'paused', pendingCount: 2, processingCount: 0, completedCount: 19, failedCount: 0, cancelledCount: 0, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-20T09:00:00Z' },
];

const mockJobs: Job[] = [
  { id: 'job-001', queueName: 'email_import', type: 'import_emails', status: 'processing', payload: {}, retryCount: 0, maxRetries: 3, error: '', createdAt: '2024-01-20T10:30:00Z', startedAt: '2024-01-20T10:31:00Z' },
  { id: 'job-002', queueName: 'ocr_processing', type: 'process_image', status: 'pending', payload: {}, retryCount: 0, maxRetries: 3, error: '', createdAt: '2024-01-20T10:29:00Z' },
  { id: 'job-003', queueName: 'drive_sync', type: 'sync_folder', status: 'completed', payload: {}, retryCount: 0, maxRetries: 3, error: '', createdAt: '2024-01-20T10:25:00Z', startedAt: '2024-01-20T10:26:00Z', completedAt: '2024-01-20T10:28:00Z' },
  { id: 'job-004', queueName: 'email_import', type: 'import_emails', status: 'failed', payload: {}, retryCount: 3, maxRetries: 3, error: 'IMAP connection timeout', createdAt: '2024-01-20T10:20:00Z', startedAt: '2024-01-20T10:21:00Z' },
  { id: 'job-005', queueName: 'ocr_processing', type: 'process_image', status: 'completed', payload: {}, retryCount: 1, maxRetries: 3, error: '', createdAt: '2024-01-20T10:15:00Z', startedAt: '2024-01-20T10:16:00Z', completedAt: '2024-01-20T10:20:00Z' },
  { id: 'job-006', queueName: 'receipt_extraction', type: 'extract_data', status: 'pending', payload: {}, retryCount: 0, maxRetries: 3, error: '', createdAt: '2024-01-20T10:10:00Z' },
  { id: 'job-007', queueName: 'drive_sync', type: 'sync_folder', status: 'failed', payload: {}, retryCount: 2, maxRetries: 3, error: 'API rate limit exceeded', createdAt: '2024-01-20T10:05:00Z', startedAt: '2024-01-20T10:06:00Z' },
  { id: 'job-008', queueName: 'email_import', type: 'import_emails', status: 'completed', payload: {}, retryCount: 0, maxRetries: 3, error: '', createdAt: '2024-01-20T10:00:00Z', startedAt: '2024-01-20T10:01:00Z', completedAt: '2024-01-20T10:03:00Z' },
];

function getStatusBadgeVariant(status: JobStatus): 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'pending': return 'default';
    case 'processing': return 'info';
    case 'completed': return 'success';
    case 'failed': return 'danger';
    case 'cancelled': return 'warning';
    default: return 'default';
  }
}

function getQueueStatusBadgeVariant(status: Queue['status']): 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'active': return 'success';
    case 'paused': return 'warning';
    case 'stopped': return 'danger';
    default: return 'default';
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return date.toLocaleDateString();
}

function formatQueueName(name: string): string {
  return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function QueueManagementContent() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [selectedQueue, setSelectedQueue] = useState<string | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [showClearCompleted, setShowClearCompleted] = useState(false);
  const [showRetryFailed, setShowRetryFailed] = useState(false);
  const [isClearingCompleted, setIsClearingCompleted] = useState(false);
  const [isRetryingFailed, setIsRetryingFailed] = useState(false);
  const hasAnnouncedRef = useRef(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Simulate API call - replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 500));
      setStats(mockStats);
      setQueues(mockQueues);
      setJobs(mockJobs);
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!hasAnnouncedRef.current && stats && !isLoading) {
      announce(
        `Queue management loaded. ${stats.totalJobs} total jobs: ${stats.pendingJobs} pending, ${stats.processingJobs} processing, ${stats.failedJobs} failed.`
      );
      hasAnnouncedRef.current = true;
    }
  }, [stats, isLoading]);

  const handleRefresh = () => {
    fetchData(true);
    announce('Refreshing queue data');
  };

  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      announce(`Job ${jobId} has been queued for retry`);
      fetchData(true);
    } finally {
      setRetryingJobId(null);
    }
  };

  const handleRetryAllFailed = async () => {
    setIsRetryingFailed(true);
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      announce('All failed jobs have been queued for retry');
      setShowRetryFailed(false);
      fetchData(true);
    } finally {
      setIsRetryingFailed(false);
    }
  };

  const handleClearCompleted = async () => {
    setIsClearingCompleted(true);
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      announce('Completed jobs have been cleared');
      setShowClearCompleted(false);
      fetchData(true);
    } finally {
      setIsClearingCompleted(false);
    }
  };

  // Filter jobs based on status and queue
  const filteredJobs = jobs.filter(job => {
    if (statusFilter !== 'all' && job.status !== statusFilter) return false;
    if (selectedQueue !== 'all' && job.queueName !== selectedQueue) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / pageSize);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const failedJobsCount = jobs.filter(j => j.status === 'failed').length;
  const completedJobsCount = jobs.filter(j => j.status === 'completed').length;

  return (
    <PageTransition>
      <div className="queue-management-page" role="region" aria-labelledby="queue-management-title">
        <div className="queue-management-header">
          <div className="queue-header-left">
            <Link to="/admin" className="queue-back-link">
              <BackIcon />
              <span>Admin Dashboard</span>
            </Link>
            <h1 id="queue-management-title">Queue Management</h1>
            <p className="queue-management-subtitle">
              Monitor and manage background processing queues
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            loading={isRefreshing}
            leftIcon={<RefreshIcon />}
          >
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <section className="queue-stats-section" aria-label="Queue statistics">
          <h2 className="sr-only">Queue Statistics</h2>
          <div className="queue-stats-grid">
            <div className="queue-stat-card">
              <div className="queue-stat-icon queue-stat-icon-pending">
                <QueueIcon />
              </div>
              <div className="queue-stat-content">
                <span className="queue-stat-label">Pending</span>
                {isLoading ? (
                  <span className="queue-stat-skeleton" />
                ) : (
                  <span className="queue-stat-value">{stats?.pendingJobs ?? 0}</span>
                )}
                <span className="queue-stat-subtext">jobs waiting</span>
              </div>
            </div>

            <div className="queue-stat-card">
              <div className="queue-stat-icon queue-stat-icon-processing">
                <QueueIcon />
              </div>
              <div className="queue-stat-content">
                <span className="queue-stat-label">Processing</span>
                {isLoading ? (
                  <span className="queue-stat-skeleton" />
                ) : (
                  <span className="queue-stat-value">{stats?.processingJobs ?? 0}</span>
                )}
                <span className="queue-stat-subtext">jobs running</span>
              </div>
            </div>

            <div className="queue-stat-card">
              <div className="queue-stat-icon queue-stat-icon-failed">
                <QueueIcon />
              </div>
              <div className="queue-stat-content">
                <span className="queue-stat-label">Failed</span>
                {isLoading ? (
                  <span className="queue-stat-skeleton" />
                ) : (
                  <span className="queue-stat-value">{stats?.failedJobs ?? 0}</span>
                )}
                <span className="queue-stat-subtext">jobs need attention</span>
              </div>
            </div>

            <div className="queue-stat-card">
              <div className="queue-stat-icon queue-stat-icon-completed">
                <QueueIcon />
              </div>
              <div className="queue-stat-content">
                <span className="queue-stat-label">Completed</span>
                {isLoading ? (
                  <span className="queue-stat-skeleton" />
                ) : (
                  <span className="queue-stat-value">{stats?.completedJobs ?? 0}</span>
                )}
                <span className="queue-stat-subtext">jobs processed</span>
              </div>
            </div>
          </div>
        </section>

        {/* Queue List */}
        <section className="queue-list-section">
          <h2>Queues</h2>
          <div className="queue-list">
            {isLoading ? (
              <>
                <div className="queue-item-skeleton" />
                <div className="queue-item-skeleton" />
                <div className="queue-item-skeleton" />
              </>
            ) : (
              queues.map(queue => (
                <div key={queue.name} className="queue-item">
                  <div className="queue-item-header">
                    <h3 className="queue-item-name">{formatQueueName(queue.name)}</h3>
                    <Badge variant={getQueueStatusBadgeVariant(queue.status)} size="sm">
                      {queue.status}
                    </Badge>
                  </div>
                  <div className="queue-item-stats">
                    <span className="queue-item-stat">
                      <span className="queue-item-stat-value">{queue.pendingCount}</span>
                      <span className="queue-item-stat-label">pending</span>
                    </span>
                    <span className="queue-item-stat">
                      <span className="queue-item-stat-value">{queue.processingCount}</span>
                      <span className="queue-item-stat-label">processing</span>
                    </span>
                    <span className="queue-item-stat">
                      <span className="queue-item-stat-value">{queue.failedCount}</span>
                      <span className="queue-item-stat-label">failed</span>
                    </span>
                    <span className="queue-item-stat">
                      <span className="queue-item-stat-value">{queue.completedCount}</span>
                      <span className="queue-item-stat-label">completed</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Jobs Table */}
        <section className="queue-jobs-section">
          <div className="queue-jobs-header">
            <h2>Recent Jobs</h2>
            <div className="queue-jobs-actions">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowRetryFailed(true)}
                leftIcon={<RetryIcon />}
                disabled={failedJobsCount === 0}
              >
                Retry Failed ({failedJobsCount})
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowClearCompleted(true)}
                leftIcon={<TrashIcon />}
                disabled={completedJobsCount === 0}
              >
                Clear Completed ({completedJobsCount})
              </Button>
            </div>
          </div>

          <div className="queue-jobs-filters">
            <div className="queue-filter">
              <label htmlFor="status-filter">Status:</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as JobStatus | 'all');
                  setCurrentPage(1);
                }}
                className="queue-filter-select"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="queue-filter">
              <label htmlFor="queue-filter">Queue:</label>
              <select
                id="queue-filter"
                value={selectedQueue}
                onChange={(e) => {
                  setSelectedQueue(e.target.value);
                  setCurrentPage(1);
                }}
                className="queue-filter-select"
              >
                <option value="all">All Queues</option>
                {queues.map(queue => (
                  <option key={queue.name} value={queue.name}>
                    {formatQueueName(queue.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="queue-jobs-loading">
              <div className="queue-jobs-skeleton" />
              <div className="queue-jobs-skeleton" />
              <div className="queue-jobs-skeleton" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="queue-jobs-empty">
              <p>No jobs found matching the current filters.</p>
            </div>
          ) : (
            <>
              <Table striped hoverable>
                <Table.Head>
                  <Table.Row>
                    <Table.Header>Job ID</Table.Header>
                    <Table.Header>Type</Table.Header>
                    <Table.Header>Queue</Table.Header>
                    <Table.Header>Status</Table.Header>
                    <Table.Header>Created</Table.Header>
                    <Table.Header>Error</Table.Header>
                    <Table.Header>Actions</Table.Header>
                  </Table.Row>
                </Table.Head>
                <Table.Body>
                  {paginatedJobs.map(job => (
                    <Table.Row key={job.id}>
                      <Table.Cell>
                        <code className="queue-job-id">{job.id}</code>
                      </Table.Cell>
                      <Table.Cell>{job.type}</Table.Cell>
                      <Table.Cell>{formatQueueName(job.queueName)}</Table.Cell>
                      <Table.Cell>
                        <Badge variant={getStatusBadgeVariant(job.status)} size="sm">
                          {job.status}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>{formatDate(job.createdAt)}</Table.Cell>
                      <Table.Cell>
                        {job.error ? (
                          <span className="queue-job-error" title={job.error}>
                            {job.error}
                          </span>
                        ) : (
                          <span className="queue-job-no-error">-</span>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {job.status === 'failed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetryJob(job.id)}
                            loading={retryingJobId === job.id}
                            leftIcon={<RetryIcon />}
                          >
                            Retry
                          </Button>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredJobs.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                />
              )}
            </>
          )}
        </section>

        {/* Confirmation Dialogs */}
        <ConfirmDialog
          isOpen={showRetryFailed}
          onClose={() => setShowRetryFailed(false)}
          onConfirm={handleRetryAllFailed}
          title="Retry All Failed Jobs"
          description={`This will queue ${failedJobsCount} failed job${failedJobsCount !== 1 ? 's' : ''} for retry.`}
          confirmLabel="Retry All"
          variant="warning"
          isLoading={isRetryingFailed}
        />

        <ConfirmDialog
          isOpen={showClearCompleted}
          onClose={() => setShowClearCompleted(false)}
          onConfirm={handleClearCompleted}
          title="Clear Completed Jobs"
          description={`This will permanently delete ${completedJobsCount} completed job${completedJobsCount !== 1 ? 's' : ''} from the queue history.`}
          confirmLabel="Clear All"
          variant="danger"
          isLoading={isClearingCompleted}
        />
      </div>
    </PageTransition>
  );
}

export function QueueManagement() {
  return (
    <RequireRole
      allowedRoles={['admin', 'owner']}
      showForbidden={true}
      forbiddenMessage="You need administrator privileges to access queue management."
    >
      <QueueManagementContent />
    </RequireRole>
  );
}
