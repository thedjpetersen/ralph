// Package worker provides background task handlers for processing asynchronous jobs.
package worker

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"clockzen-next/internal/application/integration"
	"clockzen-next/internal/ent"
	"clockzen-next/internal/infrastructure/google"

	"github.com/google/uuid"
)

// Drive sync worker errors
var (
	ErrDriveSyncTaskNotFound          = errors.New("drive sync task not found")
	ErrDriveSyncTaskAlreadyProcessing = errors.New("drive sync task is already being processed")
	ErrDriveSyncWorkerNotRunning      = errors.New("drive sync worker is not running")
	ErrDriveSyncOCRQueueFull          = errors.New("OCR task queue is full")
)

// DriveSyncTaskStatus represents the status of a drive sync task
type DriveSyncTaskStatus string

const (
	DriveSyncTaskStatusPending    DriveSyncTaskStatus = "pending"
	DriveSyncTaskStatusProcessing DriveSyncTaskStatus = "processing"
	DriveSyncTaskStatusCompleted  DriveSyncTaskStatus = "completed"
	DriveSyncTaskStatusFailed     DriveSyncTaskStatus = "failed"
)

// DriveSyncTask represents a task to sync files from Google Drive
type DriveSyncTask struct {
	ID           string              `json:"id"`
	ConnectionID string              `json:"connection_id"`
	FolderID     string              `json:"folder_id,omitempty"`
	SyncType     string              `json:"sync_type"`
	Status       DriveSyncTaskStatus `json:"status"`
	CreatedAt    time.Time           `json:"created_at"`
	StartedAt    *time.Time          `json:"started_at,omitempty"`
	CompletedAt  *time.Time          `json:"completed_at,omitempty"`
	RetryCount   int                 `json:"retry_count"`
	MaxRetries   int                 `json:"max_retries"`
	Error        string              `json:"error,omitempty"`
	Result       *DriveSyncResult    `json:"result,omitempty"`
}

// DriveSyncResult contains the result of a drive sync operation
type DriveSyncResult struct {
	SyncID            string                       `json:"sync_id"`
	FilesScanned      int                          `json:"files_scanned"`
	FilesDownloaded   int                          `json:"files_downloaded"`
	FilesProcessed    int                          `json:"files_processed"`
	FilesFailed       int                          `json:"files_failed"`
	BytesTransferred  int64                        `json:"bytes_transferred"`
	ReceiptsExtracted int                          `json:"receipts_extracted"`
	OCRTasksQueued    int                          `json:"ocr_tasks_queued"`
	Receipts          []DriveExtractedReceipt      `json:"receipts,omitempty"`
	QueuedOCRTasks    []OCRTask                    `json:"queued_ocr_tasks,omitempty"`
}

// DriveExtractedReceipt represents a receipt file extracted from Google Drive
type DriveExtractedReceipt struct {
	FileID       string    `json:"file_id"`
	FileName     string    `json:"file_name"`
	FilePath     string    `json:"file_path"`
	MimeType     string    `json:"mime_type"`
	Size         int64     `json:"size"`
	ModifiedTime time.Time `json:"modified_time"`
	FolderID     string    `json:"folder_id"`
	FolderPath   string    `json:"folder_path"`
}

// DriveSyncWorkerConfig holds configuration for the drive sync worker
type DriveSyncWorkerConfig struct {
	// MaxConcurrentTasks limits the number of concurrent sync tasks
	MaxConcurrentTasks int
	// MaxRetriesPerTask is the maximum number of retries for failed tasks
	MaxRetriesPerTask int
	// RetryBackoffDuration is the base duration for exponential backoff
	RetryBackoffDuration time.Duration
	// OCRQueueSize is the maximum size of the OCR task queue
	OCRQueueSize int
	// TaskTimeout is the maximum time allowed for a single task
	TaskTimeout time.Duration
	// EnableOCRQueueing enables automatic OCR task queuing for receipt files
	EnableOCRQueueing bool
}

// DefaultDriveSyncWorkerConfig returns sensible default configuration
func DefaultDriveSyncWorkerConfig() DriveSyncWorkerConfig {
	return DriveSyncWorkerConfig{
		MaxConcurrentTasks:   3,
		MaxRetriesPerTask:    3,
		RetryBackoffDuration: 30 * time.Second,
		OCRQueueSize:         1000,
		TaskTimeout:          60 * time.Minute,
		EnableOCRQueueing:    true,
	}
}

// DriveSyncWorker processes Google Drive sync tasks
type DriveSyncWorker struct {
	config      DriveSyncWorkerConfig
	entClient   *ent.Client
	oauthCfg    *google.Config
	syncService *integration.DriveSyncService

	mu           sync.RWMutex
	running      bool
	taskQueue    chan *DriveSyncTask
	ocrQueue     chan *OCRTask
	activeTasks  map[string]*DriveSyncTask
	cancelFuncs  map[string]context.CancelFunc
	stopCh       chan struct{}
	wg           sync.WaitGroup

	// Callbacks for external integrations
	onTaskComplete func(task *DriveSyncTask)
	onOCRTaskQueue func(task *OCRTask) error
}

// NewDriveSyncWorker creates a new drive sync worker
func NewDriveSyncWorker(
	entClient *ent.Client,
	oauthCfg *google.Config,
	syncService *integration.DriveSyncService,
	config DriveSyncWorkerConfig,
) *DriveSyncWorker {
	return &DriveSyncWorker{
		config:       config,
		entClient:    entClient,
		oauthCfg:     oauthCfg,
		syncService:  syncService,
		taskQueue:    make(chan *DriveSyncTask, 100),
		ocrQueue:     make(chan *OCRTask, config.OCRQueueSize),
		activeTasks:  make(map[string]*DriveSyncTask),
		cancelFuncs:  make(map[string]context.CancelFunc),
		stopCh:       make(chan struct{}),
	}
}

// NewDriveSyncWorkerWithDefaults creates a worker with default configuration
func NewDriveSyncWorkerWithDefaults(
	entClient *ent.Client,
	oauthCfg *google.Config,
	syncService *integration.DriveSyncService,
) *DriveSyncWorker {
	return NewDriveSyncWorker(entClient, oauthCfg, syncService, DefaultDriveSyncWorkerConfig())
}

// SetOnTaskComplete sets the callback for task completion
func (w *DriveSyncWorker) SetOnTaskComplete(callback func(task *DriveSyncTask)) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.onTaskComplete = callback
}

// SetOnOCRTaskQueue sets the callback for OCR task queuing
func (w *DriveSyncWorker) SetOnOCRTaskQueue(callback func(task *OCRTask) error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.onOCRTaskQueue = callback
}

// Start begins processing tasks
func (w *DriveSyncWorker) Start(ctx context.Context) error {
	w.mu.Lock()
	if w.running {
		w.mu.Unlock()
		return nil
	}
	w.running = true
	w.stopCh = make(chan struct{})
	w.mu.Unlock()

	// Start worker goroutines
	for i := 0; i < w.config.MaxConcurrentTasks; i++ {
		w.wg.Add(1)
		go w.workerLoop(ctx, i)
	}

	return nil
}

// Stop gracefully stops the worker
func (w *DriveSyncWorker) Stop() error {
	w.mu.Lock()
	if !w.running {
		w.mu.Unlock()
		return ErrDriveSyncWorkerNotRunning
	}
	w.running = false
	close(w.stopCh)

	// Cancel all active tasks
	for _, cancel := range w.cancelFuncs {
		cancel()
	}
	w.mu.Unlock()

	// Wait for all workers to finish
	w.wg.Wait()

	return nil
}

// QueueTask adds a new drive sync task to the queue
func (w *DriveSyncWorker) QueueTask(task *DriveSyncTask) error {
	w.mu.RLock()
	if !w.running {
		w.mu.RUnlock()
		return ErrDriveSyncWorkerNotRunning
	}
	w.mu.RUnlock()

	// Set defaults
	if task.ID == "" {
		task.ID = uuid.New().String()
	}
	if task.Status == "" {
		task.Status = DriveSyncTaskStatusPending
	}
	if task.CreatedAt.IsZero() {
		task.CreatedAt = time.Now()
	}
	if task.MaxRetries == 0 {
		task.MaxRetries = w.config.MaxRetriesPerTask
	}
	if task.SyncType == "" {
		task.SyncType = "incremental"
	}

	select {
	case w.taskQueue <- task:
		return nil
	default:
		return errors.New("drive sync task queue is full")
	}
}

// HandleDriveSync processes a single drive sync task synchronously
// This is the main entry point for handling drive sync tasks
func (w *DriveSyncWorker) HandleDriveSync(ctx context.Context, task *DriveSyncTask) error {
	if task == nil {
		return ErrDriveSyncTaskNotFound
	}

	// Register task as active
	w.mu.Lock()
	if _, exists := w.activeTasks[task.ID]; exists {
		w.mu.Unlock()
		return ErrDriveSyncTaskAlreadyProcessing
	}

	taskCtx, cancel := context.WithTimeout(ctx, w.config.TaskTimeout)
	w.activeTasks[task.ID] = task
	w.cancelFuncs[task.ID] = cancel
	w.mu.Unlock()

	defer func() {
		cancel()
		w.mu.Lock()
		delete(w.activeTasks, task.ID)
		delete(w.cancelFuncs, task.ID)
		w.mu.Unlock()
	}()

	// Update task status
	now := time.Now()
	task.Status = DriveSyncTaskStatusProcessing
	task.StartedAt = &now

	// Process the task
	result, err := w.processDriveSync(taskCtx, task)
	if err != nil {
		task.Status = DriveSyncTaskStatusFailed
		task.Error = err.Error()
		completedAt := time.Now()
		task.CompletedAt = &completedAt

		// Check if we should retry
		if task.RetryCount < task.MaxRetries {
			task.RetryCount++
			task.Status = DriveSyncTaskStatusPending
			// Re-queue with backoff
			go func() {
				backoff := w.config.RetryBackoffDuration * time.Duration(task.RetryCount)
				time.Sleep(backoff)
				_ = w.QueueTask(task)
			}()
		}

		w.notifyTaskComplete(task)
		return err
	}

	// Success
	task.Status = DriveSyncTaskStatusCompleted
	task.Result = result
	completedAt := time.Now()
	task.CompletedAt = &completedAt

	w.notifyTaskComplete(task)
	return nil
}

// processDriveSync performs the actual drive sync operation
func (w *DriveSyncWorker) processDriveSync(ctx context.Context, task *DriveSyncTask) (*DriveSyncResult, error) {
	result := &DriveSyncResult{
		Receipts:       make([]DriveExtractedReceipt, 0),
		QueuedOCRTasks: make([]OCRTask, 0),
	}

	// Call Drive sync service with progress tracking
	syncResult, err := w.syncService.SyncFolderWithProgress(
		ctx,
		task.ConnectionID,
		task.FolderID,
		task.SyncType,
		func(progress integration.SyncProgress) {
			// Update result with progress
			result.FilesScanned = progress.FilesScanned
			result.FilesDownloaded = progress.FilesProcessed
			result.BytesTransferred = progress.BytesTransferred
		},
	)
	if err != nil {
		return nil, fmt.Errorf("syncing drive: %w", err)
	}

	// Extract results from sync
	result.SyncID = syncResult.SyncID
	result.FilesScanned = syncResult.FilesScanned
	result.FilesDownloaded = syncResult.FilesDownloaded
	result.FilesProcessed = syncResult.FilesDownloaded
	result.FilesFailed = syncResult.FilesFailed
	result.BytesTransferred = syncResult.BytesTransferred

	// Process extracted receipts and queue OCR tasks for images
	for _, receipt := range syncResult.Receipts {
		extractedReceipt := DriveExtractedReceipt{
			FileID:       receipt.FileID,
			FileName:     receipt.FileName,
			FilePath:     receipt.FilePath,
			MimeType:     receipt.MimeType,
			Size:         receipt.Size,
			ModifiedTime: receipt.ModifiedTime,
			FolderID:     receipt.FolderID,
			FolderPath:   receipt.FolderPath,
		}
		result.Receipts = append(result.Receipts, extractedReceipt)
		result.ReceiptsExtracted++

		// Queue OCR task for image files
		if w.config.EnableOCRQueueing && isOCRableFile(receipt.MimeType, receipt.FileName) {
			ocrTask := w.createOCRTaskFromDriveFile(task.ConnectionID, receipt)
			if err := w.queueOCRTask(ctx, &ocrTask); err != nil {
				// Log but continue - OCR queue failure shouldn't fail the sync
				continue
			}
			result.QueuedOCRTasks = append(result.QueuedOCRTasks, ocrTask)
			result.OCRTasksQueued++
		}
	}

	return result, nil
}

// createOCRTaskFromDriveFile creates an OCR task from a Drive receipt file
func (w *DriveSyncWorker) createOCRTaskFromDriveFile(connectionID string, receipt integration.ExtractedReceipt) OCRTask {
	return OCRTask{
		ID:           uuid.New().String(),
		ConnectionID: connectionID,
		MessageID:    receipt.FileID, // Using FileID as MessageID for Drive files
		AttachmentID: receipt.FileID, // Using FileID as AttachmentID for Drive files
		Filename:     receipt.FileName,
		MimeType:     receipt.MimeType,
		Size:         int(receipt.Size),
		Status:       "pending",
		CreatedAt:    time.Now(),
		Priority:     1, // Default priority
	}
}

// queueOCRTask adds an OCR task to the queue
func (w *DriveSyncWorker) queueOCRTask(ctx context.Context, task *OCRTask) error {
	// First try the callback if set
	w.mu.RLock()
	callback := w.onOCRTaskQueue
	w.mu.RUnlock()

	if callback != nil {
		return callback(task)
	}

	// Otherwise use the internal queue
	select {
	case w.ocrQueue <- task:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	default:
		return ErrDriveSyncOCRQueueFull
	}
}

// GetOCRQueue returns the OCR task queue channel for external consumption
func (w *DriveSyncWorker) GetOCRQueue() <-chan *OCRTask {
	return w.ocrQueue
}

// workerLoop is the main loop for a worker goroutine
func (w *DriveSyncWorker) workerLoop(ctx context.Context, _ int) {
	defer w.wg.Done()

	for {
		select {
		case <-w.stopCh:
			return
		case <-ctx.Done():
			return
		case task := <-w.taskQueue:
			if task == nil {
				continue
			}
			_ = w.HandleDriveSync(ctx, task)
		}
	}
}

// notifyTaskComplete calls the completion callback if set
func (w *DriveSyncWorker) notifyTaskComplete(task *DriveSyncTask) {
	w.mu.RLock()
	callback := w.onTaskComplete
	w.mu.RUnlock()

	if callback != nil {
		callback(task)
	}
}

// GetActiveTasks returns a list of currently processing tasks
func (w *DriveSyncWorker) GetActiveTasks() []*DriveSyncTask {
	w.mu.RLock()
	defer w.mu.RUnlock()

	tasks := make([]*DriveSyncTask, 0, len(w.activeTasks))
	for _, task := range w.activeTasks {
		tasks = append(tasks, task)
	}
	return tasks
}

// GetTaskStatus retrieves the status of a specific task
func (w *DriveSyncWorker) GetTaskStatus(taskID string) (*DriveSyncTask, error) {
	w.mu.RLock()
	defer w.mu.RUnlock()

	task, exists := w.activeTasks[taskID]
	if !exists {
		return nil, ErrDriveSyncTaskNotFound
	}
	return task, nil
}

// CancelTask cancels a running task
func (w *DriveSyncWorker) CancelTask(taskID string) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	cancel, exists := w.cancelFuncs[taskID]
	if !exists {
		return ErrDriveSyncTaskNotFound
	}

	cancel()
	if task, ok := w.activeTasks[taskID]; ok {
		task.Status = DriveSyncTaskStatusFailed
		task.Error = "task cancelled"
		now := time.Now()
		task.CompletedAt = &now
	}

	delete(w.cancelFuncs, taskID)
	delete(w.activeTasks, taskID)
	return nil
}

// IsRunning returns whether the worker is running
func (w *DriveSyncWorker) IsRunning() bool {
	w.mu.RLock()
	defer w.mu.RUnlock()
	return w.running
}

// QueuedTaskCount returns the number of tasks waiting in the queue
func (w *DriveSyncWorker) QueuedTaskCount() int {
	return len(w.taskQueue)
}

// QueuedOCRTaskCount returns the number of OCR tasks waiting in the queue
func (w *DriveSyncWorker) QueuedOCRTaskCount() int {
	return len(w.ocrQueue)
}

// CreateDriveSyncTask is a helper to create a new drive sync task
func CreateDriveSyncTask(connectionID, folderID, syncType string) *DriveSyncTask {
	return &DriveSyncTask{
		ID:           uuid.New().String(),
		ConnectionID: connectionID,
		FolderID:     folderID,
		SyncType:     syncType,
		Status:       DriveSyncTaskStatusPending,
		CreatedAt:    time.Now(),
		MaxRetries:   3,
	}
}

// DriveSyncTaskHandler is a function type for handling drive sync tasks
type DriveSyncTaskHandler func(ctx context.Context, task *DriveSyncTask) error

// DriveSyncWorkerMetrics holds metrics for the worker
type DriveSyncWorkerMetrics struct {
	TasksProcessed    int64
	TasksSucceeded    int64
	TasksFailed       int64
	TasksRetried      int64
	OCRTasksQueued    int64
	ReceiptsExtracted int64
	BytesProcessed    int64
}

// GetMetrics returns current worker metrics
func (w *DriveSyncWorker) GetMetrics() DriveSyncWorkerMetrics {
	// In a full implementation, these would be tracked with atomic counters
	return DriveSyncWorkerMetrics{}
}

// isOCRableFile checks if a file can be processed by OCR
func isOCRableFile(mimeType, filename string) bool {
	// Image types that can be OCR'd
	ocrableMimeTypes := map[string]bool{
		"image/png":  true,
		"image/jpeg": true,
		"image/jpg":  true,
		"image/gif":  true,
		"image/tiff": true,
		"image/bmp":  true,
		"image/webp": true,
		// PDF can also be OCR'd
		"application/pdf": true,
	}

	if ocrableMimeTypes[mimeType] {
		return true
	}

	// Check by extension as fallback
	ocrableExtensions := map[string]bool{
		".png":  true,
		".jpg":  true,
		".jpeg": true,
		".gif":  true,
		".tiff": true,
		".bmp":  true,
		".webp": true,
		".pdf":  true,
	}

	for ext := range ocrableExtensions {
		if len(filename) > len(ext) && filename[len(filename)-len(ext):] == ext {
			return true
		}
	}

	return false
}
