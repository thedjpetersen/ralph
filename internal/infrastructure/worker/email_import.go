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
	"clockzen-next/internal/ent/emailconnection"
	"clockzen-next/internal/infrastructure/google"

	"github.com/google/uuid"
)

// Email import worker errors
var (
	ErrTaskNotFound          = errors.New("task not found")
	ErrTaskAlreadyProcessing = errors.New("task is already being processed")
	ErrInvalidTaskType       = errors.New("invalid task type")
	ErrWorkerNotRunning      = errors.New("worker is not running")
	ErrOCRQueueFull          = errors.New("OCR task queue is full")
)

// EmailImportTaskStatus represents the status of an email import task
type EmailImportTaskStatus string

const (
	TaskStatusPending    EmailImportTaskStatus = "pending"
	TaskStatusProcessing EmailImportTaskStatus = "processing"
	TaskStatusCompleted  EmailImportTaskStatus = "completed"
	TaskStatusFailed     EmailImportTaskStatus = "failed"
)

// EmailImportTask represents a task to import emails from a connection
type EmailImportTask struct {
	ID           string                `json:"id"`
	ConnectionID string                `json:"connection_id"`
	LabelID      string                `json:"label_id,omitempty"`
	SyncType     string                `json:"sync_type"`
	Status       EmailImportTaskStatus `json:"status"`
	CreatedAt    time.Time             `json:"created_at"`
	StartedAt    *time.Time            `json:"started_at,omitempty"`
	CompletedAt  *time.Time            `json:"completed_at,omitempty"`
	RetryCount   int                   `json:"retry_count"`
	MaxRetries   int                   `json:"max_retries"`
	Error        string                `json:"error,omitempty"`
	Result       *EmailImportResult    `json:"result,omitempty"`
}

// EmailImportResult contains the result of an email import operation
type EmailImportResult struct {
	SyncID                string                 `json:"sync_id"`
	MessagesScanned       int                    `json:"messages_scanned"`
	MessagesDownloaded    int                    `json:"messages_downloaded"`
	MessagesIndexed       int                    `json:"messages_indexed"`
	MessagesFailed        int                    `json:"messages_failed"`
	AttachmentsDownloaded int                    `json:"attachments_downloaded"`
	BytesTransferred      int64                  `json:"bytes_transferred"`
	ReceiptsExtracted     int                    `json:"receipts_extracted"`
	OCRTasksQueued        int                    `json:"ocr_tasks_queued"`
	Receipts              []ExtractedReceipt     `json:"receipts,omitempty"`
	QueuedOCRTasks        []OCRTask              `json:"queued_ocr_tasks,omitempty"`
}

// ExtractedReceipt represents a receipt extracted from an email
type ExtractedReceipt struct {
	MessageID       string                `json:"message_id"`
	ThreadID        string                `json:"thread_id"`
	Subject         string                `json:"subject"`
	From            string                `json:"from"`
	To              string                `json:"to"`
	ReceivedAt      time.Time             `json:"received_at"`
	Snippet         string                `json:"snippet"`
	HasAttachments  bool                  `json:"has_attachments"`
	AttachmentCount int                   `json:"attachment_count"`
	Attachments     []ExtractedAttachment `json:"attachments,omitempty"`
}

// ExtractedAttachment represents an attachment from an email
type ExtractedAttachment struct {
	AttachmentID string `json:"attachment_id"`
	MessageID    string `json:"message_id"`
	Filename     string `json:"filename"`
	MimeType     string `json:"mime_type"`
	Size         int    `json:"size"`
	IsReceipt    bool   `json:"is_receipt"`
}

// OCRTask represents a task to perform OCR on an attachment
type OCRTask struct {
	ID           string    `json:"id"`
	ConnectionID string    `json:"connection_id"`
	MessageID    string    `json:"message_id"`
	AttachmentID string    `json:"attachment_id"`
	Filename     string    `json:"filename"`
	MimeType     string    `json:"mime_type"`
	Size         int       `json:"size"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
	Priority     int       `json:"priority"`
}

// EmailImportWorkerConfig holds configuration for the email import worker
type EmailImportWorkerConfig struct {
	// MaxConcurrentTasks limits the number of concurrent import tasks
	MaxConcurrentTasks int
	// MaxRetriesPerTask is the maximum number of retries for failed tasks
	MaxRetriesPerTask int
	// RetryBackoffDuration is the base duration for exponential backoff
	RetryBackoffDuration time.Duration
	// OCRQueueSize is the maximum size of the OCR task queue
	OCRQueueSize int
	// TaskTimeout is the maximum time allowed for a single task
	TaskTimeout time.Duration
	// EnableOCRQueueing enables automatic OCR task queuing for receipt attachments
	EnableOCRQueueing bool
}

// DefaultEmailImportWorkerConfig returns sensible default configuration
func DefaultEmailImportWorkerConfig() EmailImportWorkerConfig {
	return EmailImportWorkerConfig{
		MaxConcurrentTasks:   5,
		MaxRetriesPerTask:    3,
		RetryBackoffDuration: 30 * time.Second,
		OCRQueueSize:         1000,
		TaskTimeout:          30 * time.Minute,
		EnableOCRQueueing:    true,
	}
}

// EmailImportWorker processes email import tasks
type EmailImportWorker struct {
	config      EmailImportWorkerConfig
	entClient   *ent.Client
	oauthCfg    *google.Config
	syncService *integration.EmailSyncService

	mu           sync.RWMutex
	running      bool
	taskQueue    chan *EmailImportTask
	ocrQueue     chan *OCRTask
	activeTasks  map[string]*EmailImportTask
	cancelFuncs  map[string]context.CancelFunc
	stopCh       chan struct{}
	wg           sync.WaitGroup

	// Callbacks for external integrations
	onTaskComplete func(task *EmailImportTask)
	onOCRTaskQueue func(task *OCRTask) error
}

// NewEmailImportWorker creates a new email import worker
func NewEmailImportWorker(
	entClient *ent.Client,
	oauthCfg *google.Config,
	syncService *integration.EmailSyncService,
	config EmailImportWorkerConfig,
) *EmailImportWorker {
	return &EmailImportWorker{
		config:       config,
		entClient:    entClient,
		oauthCfg:     oauthCfg,
		syncService:  syncService,
		taskQueue:    make(chan *EmailImportTask, 100),
		ocrQueue:     make(chan *OCRTask, config.OCRQueueSize),
		activeTasks:  make(map[string]*EmailImportTask),
		cancelFuncs:  make(map[string]context.CancelFunc),
		stopCh:       make(chan struct{}),
	}
}

// NewEmailImportWorkerWithDefaults creates a worker with default configuration
func NewEmailImportWorkerWithDefaults(
	entClient *ent.Client,
	oauthCfg *google.Config,
	syncService *integration.EmailSyncService,
) *EmailImportWorker {
	return NewEmailImportWorker(entClient, oauthCfg, syncService, DefaultEmailImportWorkerConfig())
}

// SetOnTaskComplete sets the callback for task completion
func (w *EmailImportWorker) SetOnTaskComplete(callback func(task *EmailImportTask)) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.onTaskComplete = callback
}

// SetOnOCRTaskQueue sets the callback for OCR task queuing
func (w *EmailImportWorker) SetOnOCRTaskQueue(callback func(task *OCRTask) error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.onOCRTaskQueue = callback
}

// Start begins processing tasks
func (w *EmailImportWorker) Start(ctx context.Context) error {
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
func (w *EmailImportWorker) Stop() error {
	w.mu.Lock()
	if !w.running {
		w.mu.Unlock()
		return ErrWorkerNotRunning
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

// QueueTask adds a new email import task to the queue
func (w *EmailImportWorker) QueueTask(task *EmailImportTask) error {
	w.mu.RLock()
	if !w.running {
		w.mu.RUnlock()
		return ErrWorkerNotRunning
	}
	w.mu.RUnlock()

	// Set defaults
	if task.ID == "" {
		task.ID = uuid.New().String()
	}
	if task.Status == "" {
		task.Status = TaskStatusPending
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
		return errors.New("task queue is full")
	}
}

// HandleEmailImport processes a single email import task synchronously
// This is the main entry point for handling email import tasks
func (w *EmailImportWorker) HandleEmailImport(ctx context.Context, task *EmailImportTask) error {
	if task == nil {
		return ErrTaskNotFound
	}

	// Register task as active
	w.mu.Lock()
	if _, exists := w.activeTasks[task.ID]; exists {
		w.mu.Unlock()
		return ErrTaskAlreadyProcessing
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
	task.Status = TaskStatusProcessing
	task.StartedAt = &now

	// Process the task
	result, err := w.processEmailImport(taskCtx, task)
	if err != nil {
		task.Status = TaskStatusFailed
		task.Error = err.Error()
		completedAt := time.Now()
		task.CompletedAt = &completedAt

		// Check if we should retry
		if task.RetryCount < task.MaxRetries {
			task.RetryCount++
			task.Status = TaskStatusPending
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
	task.Status = TaskStatusCompleted
	task.Result = result
	completedAt := time.Now()
	task.CompletedAt = &completedAt

	w.notifyTaskComplete(task)
	return nil
}

// processEmailImport performs the actual email import operation
func (w *EmailImportWorker) processEmailImport(ctx context.Context, task *EmailImportTask) (*EmailImportResult, error) {
	result := &EmailImportResult{
		Receipts:       make([]ExtractedReceipt, 0),
		QueuedOCRTasks: make([]OCRTask, 0),
	}

	// Verify connection exists and is active
	connection, err := w.entClient.EmailConnection.Get(ctx, task.ConnectionID)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, integration.ErrEmailConnectionNotFound
		}
		return nil, fmt.Errorf("getting connection: %w", err)
	}

	if connection.Status != emailconnection.StatusActive {
		return nil, fmt.Errorf("%w: status is %s", integration.ErrEmailConnectionInactive, connection.Status)
	}

	// Call Gmail sync service with progress tracking
	syncResult, err := w.syncService.SyncLabelWithProgress(
		ctx,
		task.ConnectionID,
		task.LabelID,
		task.SyncType,
		func(progress integration.EmailSyncProgress) {
			// Update result with progress
			result.MessagesScanned = progress.MessagesScanned
			result.MessagesDownloaded = progress.MessagesProcessed
			result.AttachmentsDownloaded = progress.AttachmentsDownloaded
			result.BytesTransferred = progress.BytesTransferred
		},
	)
	if err != nil {
		return nil, fmt.Errorf("syncing emails: %w", err)
	}

	// Extract results from sync
	result.SyncID = syncResult.SyncID
	result.MessagesScanned = syncResult.MessagesScanned
	result.MessagesDownloaded = syncResult.MessagesDownloaded
	result.MessagesIndexed = syncResult.MessagesIndexed
	result.MessagesFailed = syncResult.MessagesFailed
	result.AttachmentsDownloaded = syncResult.AttachmentsDownloaded
	result.BytesTransferred = syncResult.BytesTransferred

	// Extract receipts from the sync result
	for _, receipt := range syncResult.Receipts {
		extractedReceipt := ExtractedReceipt{
			MessageID:       receipt.MessageID,
			ThreadID:        receipt.ThreadID,
			Subject:         receipt.Subject,
			From:            receipt.From,
			To:              receipt.To,
			ReceivedAt:      receipt.ReceivedAt,
			Snippet:         receipt.Snippet,
			HasAttachments:  receipt.HasAttachments,
			AttachmentCount: receipt.AttachmentCount,
			Attachments:     make([]ExtractedAttachment, 0, len(receipt.Attachments)),
		}

		for _, att := range receipt.Attachments {
			extractedAtt := ExtractedAttachment{
				AttachmentID: att.AttachmentID,
				MessageID:    att.MessageID,
				Filename:     att.Filename,
				MimeType:     att.MimeType,
				Size:         att.Size,
				IsReceipt:    att.IsReceipt,
			}
			extractedReceipt.Attachments = append(extractedReceipt.Attachments, extractedAtt)

			// Queue OCR task for receipt attachments
			if att.IsReceipt && w.config.EnableOCRQueueing {
				ocrTask := w.createOCRTask(task.ConnectionID, att)
				if err := w.queueOCRTask(ctx, &ocrTask); err != nil {
					// Log but continue - OCR queue failure shouldn't fail the import
					continue
				}
				result.QueuedOCRTasks = append(result.QueuedOCRTasks, ocrTask)
				result.OCRTasksQueued++
			}
		}

		result.Receipts = append(result.Receipts, extractedReceipt)
		result.ReceiptsExtracted++
	}

	// Also queue OCR tasks for all receipt attachments from the sync
	for _, att := range syncResult.Attachments {
		if att.IsReceipt && w.config.EnableOCRQueueing {
			// Check if we already queued this attachment
			alreadyQueued := false
			for _, queued := range result.QueuedOCRTasks {
				if queued.AttachmentID == att.AttachmentID {
					alreadyQueued = true
					break
				}
			}
			if alreadyQueued {
				continue
			}

			ocrTask := w.createOCRTask(task.ConnectionID, integration.ExtractedEmailAttachment{
				AttachmentID: att.AttachmentID,
				MessageID:    att.MessageID,
				Filename:     att.Filename,
				MimeType:     att.MimeType,
				Size:         att.Size,
				IsReceipt:    att.IsReceipt,
			})
			if err := w.queueOCRTask(ctx, &ocrTask); err != nil {
				continue
			}
			result.QueuedOCRTasks = append(result.QueuedOCRTasks, ocrTask)
			result.OCRTasksQueued++
		}
	}

	return result, nil
}

// createOCRTask creates an OCR task from an attachment
func (w *EmailImportWorker) createOCRTask(connectionID string, att integration.ExtractedEmailAttachment) OCRTask {
	return OCRTask{
		ID:           uuid.New().String(),
		ConnectionID: connectionID,
		MessageID:    att.MessageID,
		AttachmentID: att.AttachmentID,
		Filename:     att.Filename,
		MimeType:     att.MimeType,
		Size:         att.Size,
		Status:       "pending",
		CreatedAt:    time.Now(),
		Priority:     1, // Default priority
	}
}

// queueOCRTask adds an OCR task to the queue
func (w *EmailImportWorker) queueOCRTask(ctx context.Context, task *OCRTask) error {
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
		return ErrOCRQueueFull
	}
}

// GetOCRQueue returns the OCR task queue channel for external consumption
func (w *EmailImportWorker) GetOCRQueue() <-chan *OCRTask {
	return w.ocrQueue
}

// workerLoop is the main loop for a worker goroutine
func (w *EmailImportWorker) workerLoop(ctx context.Context, _ int) {
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
			_ = w.HandleEmailImport(ctx, task)
		}
	}
}

// notifyTaskComplete calls the completion callback if set
func (w *EmailImportWorker) notifyTaskComplete(task *EmailImportTask) {
	w.mu.RLock()
	callback := w.onTaskComplete
	w.mu.RUnlock()

	if callback != nil {
		callback(task)
	}
}

// GetActiveTasks returns a list of currently processing tasks
func (w *EmailImportWorker) GetActiveTasks() []*EmailImportTask {
	w.mu.RLock()
	defer w.mu.RUnlock()

	tasks := make([]*EmailImportTask, 0, len(w.activeTasks))
	for _, task := range w.activeTasks {
		tasks = append(tasks, task)
	}
	return tasks
}

// GetTaskStatus retrieves the status of a specific task
func (w *EmailImportWorker) GetTaskStatus(taskID string) (*EmailImportTask, error) {
	w.mu.RLock()
	defer w.mu.RUnlock()

	task, exists := w.activeTasks[taskID]
	if !exists {
		return nil, ErrTaskNotFound
	}
	return task, nil
}

// CancelTask cancels a running task
func (w *EmailImportWorker) CancelTask(taskID string) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	cancel, exists := w.cancelFuncs[taskID]
	if !exists {
		return ErrTaskNotFound
	}

	cancel()
	if task, ok := w.activeTasks[taskID]; ok {
		task.Status = TaskStatusFailed
		task.Error = "task cancelled"
		now := time.Now()
		task.CompletedAt = &now
	}

	delete(w.cancelFuncs, taskID)
	delete(w.activeTasks, taskID)
	return nil
}

// IsRunning returns whether the worker is running
func (w *EmailImportWorker) IsRunning() bool {
	w.mu.RLock()
	defer w.mu.RUnlock()
	return w.running
}

// QueuedTaskCount returns the number of tasks waiting in the queue
func (w *EmailImportWorker) QueuedTaskCount() int {
	return len(w.taskQueue)
}

// QueuedOCRTaskCount returns the number of OCR tasks waiting in the queue
func (w *EmailImportWorker) QueuedOCRTaskCount() int {
	return len(w.ocrQueue)
}

// CreateEmailImportTask is a helper to create a new email import task
func CreateEmailImportTask(connectionID, labelID, syncType string) *EmailImportTask {
	return &EmailImportTask{
		ID:           uuid.New().String(),
		ConnectionID: connectionID,
		LabelID:      labelID,
		SyncType:     syncType,
		Status:       TaskStatusPending,
		CreatedAt:    time.Now(),
		MaxRetries:   3,
	}
}

// EmailImportTaskHandler is a function type for handling email import tasks
type EmailImportTaskHandler func(ctx context.Context, task *EmailImportTask) error

// EmailImportWorkerMetrics holds metrics for the worker
type EmailImportWorkerMetrics struct {
	TasksProcessed    int64
	TasksSucceeded    int64
	TasksFailed       int64
	TasksRetried      int64
	OCRTasksQueued    int64
	ReceiptsExtracted int64
	BytesProcessed    int64
}

// GetMetrics returns current worker metrics
func (w *EmailImportWorker) GetMetrics() EmailImportWorkerMetrics {
	// In a full implementation, these would be tracked with atomic counters
	return EmailImportWorkerMetrics{}
}
