package admin

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
)

// JobStatus represents the status of a job in the queue
type JobStatus string

const (
	JobStatusPending    JobStatus = "pending"
	JobStatusProcessing JobStatus = "processing"
	JobStatusCompleted  JobStatus = "completed"
	JobStatusFailed     JobStatus = "failed"
	JobStatusCancelled  JobStatus = "cancelled"
)

// QueueStatus represents the status of a queue
type QueueStatus string

const (
	QueueStatusActive  QueueStatus = "active"
	QueueStatusPaused  QueueStatus = "paused"
	QueueStatusStopped QueueStatus = "stopped"
)

// Job represents a job in the queue
type Job struct {
	ID          string          `json:"id"`
	QueueName   string          `json:"queue_name"`
	Type        string          `json:"type"`
	Status      JobStatus       `json:"status"`
	Payload     json.RawMessage `json:"payload,omitempty"`
	RetryCount  int             `json:"retry_count"`
	MaxRetries  int             `json:"max_retries"`
	Error       string          `json:"error,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
	StartedAt   *time.Time      `json:"started_at,omitempty"`
	CompletedAt *time.Time      `json:"completed_at,omitempty"`
	CancelledAt *time.Time      `json:"cancelled_at,omitempty"`
}

// Queue represents a queue with its jobs
type Queue struct {
	Name            string      `json:"name"`
	Status          QueueStatus `json:"status"`
	PendingCount    int         `json:"pending_count"`
	ProcessingCount int         `json:"processing_count"`
	CompletedCount  int         `json:"completed_count"`
	FailedCount     int         `json:"failed_count"`
	CancelledCount  int         `json:"cancelled_count"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
}

// QueueStats represents statistics for all queues
type QueueStats struct {
	TotalQueues     int            `json:"total_queues"`
	TotalJobs       int            `json:"total_jobs"`
	PendingJobs     int            `json:"pending_jobs"`
	ProcessingJobs  int            `json:"processing_jobs"`
	CompletedJobs   int            `json:"completed_jobs"`
	FailedJobs      int            `json:"failed_jobs"`
	CancelledJobs   int            `json:"cancelled_jobs"`
	QueueBreakdown  map[string]int `json:"queue_breakdown"`
	AvgProcessingMs float64        `json:"avg_processing_ms"`
}

// ListQueuesResponse represents a list of queues response
type ListQueuesResponse struct {
	Queues []*Queue `json:"queues"`
	Total  int      `json:"total"`
}

// ListJobsResponse represents a list of jobs response
type ListJobsResponse struct {
	Jobs  []*Job `json:"jobs"`
	Total int    `json:"total"`
}

// RetryJobRequest represents a request to retry a job
type RetryJobRequest struct {
	ResetRetryCount bool `json:"reset_retry_count,omitempty"`
}

// RetryJobResponse represents a response after retrying a job
type RetryJobResponse struct {
	Job     *Job   `json:"job"`
	Message string `json:"message"`
}

// CancelJobResponse represents a response after cancelling a job
type CancelJobResponse struct {
	Job     *Job   `json:"job"`
	Message string `json:"message"`
}

// QueueHandler handles HTTP requests for admin queue management
type QueueHandler struct {
	mu     sync.RWMutex
	queues map[string]*Queue
	jobs   map[string]*Job
}

// NewQueueHandler creates a new QueueHandler instance
func NewQueueHandler() *QueueHandler {
	h := &QueueHandler{
		queues: make(map[string]*Queue),
		jobs:   make(map[string]*Job),
	}
	// Initialize default queues
	h.initializeDefaultQueues()
	return h
}

// initializeDefaultQueues creates the default queues
func (h *QueueHandler) initializeDefaultQueues() {
	now := time.Now()
	defaultQueues := []string{"email_import", "drive_sync", "ocr_processing", "receipt_extraction"}
	for _, name := range defaultQueues {
		h.queues[name] = &Queue{
			Name:      name,
			Status:    QueueStatusActive,
			CreatedAt: now,
			UpdatedAt: now,
		}
	}
}

// HandleListQueues handles GET /api/admin/queues
func (h *QueueHandler) HandleListQueues(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	// Get optional status filter
	status := r.URL.Query().Get("status")

	h.mu.RLock()
	// Update queue counts based on jobs
	h.updateQueueCounts()
	queues := make([]*Queue, 0, len(h.queues))
	for _, queue := range h.queues {
		if status != "" && string(queue.Status) != status {
			continue
		}
		queues = append(queues, queue)
	}
	h.mu.RUnlock()

	resp := ListQueuesResponse{
		Queues: queues,
		Total:  len(queues),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleGetQueue handles GET /api/admin/queues/{name}
func (h *QueueHandler) HandleGetQueue(w http.ResponseWriter, r *http.Request, name string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	queue, exists := h.queues[name]
	if exists {
		h.updateQueueCounts()
		queue = h.queues[name]
	}
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Queue not found")
		return
	}

	h.writeJSON(w, http.StatusOK, queue)
}

// HandleListJobs handles GET /api/admin/queues/{name}/jobs
func (h *QueueHandler) HandleListJobs(w http.ResponseWriter, r *http.Request, queueName string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	// Get optional status filter
	status := r.URL.Query().Get("status")

	h.mu.RLock()
	_, exists := h.queues[queueName]
	if !exists {
		h.mu.RUnlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Queue not found")
		return
	}

	jobs := make([]*Job, 0)
	for _, job := range h.jobs {
		if job.QueueName != queueName {
			continue
		}
		if status != "" && string(job.Status) != status {
			continue
		}
		jobs = append(jobs, job)
	}
	h.mu.RUnlock()

	resp := ListJobsResponse{
		Jobs:  jobs,
		Total: len(jobs),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleGetJob handles GET /api/admin/queues/{name}/jobs/{id}
func (h *QueueHandler) HandleGetJob(w http.ResponseWriter, r *http.Request, queueName, jobID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	_, exists := h.queues[queueName]
	if !exists {
		h.mu.RUnlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Queue not found")
		return
	}

	job, exists := h.jobs[jobID]
	h.mu.RUnlock()

	if !exists || job.QueueName != queueName {
		h.writeError(w, http.StatusNotFound, "not_found", "Job not found")
		return
	}

	h.writeJSON(w, http.StatusOK, job)
}

// HandleRetryJob handles POST /api/admin/queues/{name}/jobs/{id}/retry
func (h *QueueHandler) HandleRetryJob(w http.ResponseWriter, r *http.Request, queueName, jobID string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req RetryJobRequest
	if r.Body != nil && r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
			return
		}
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	_, exists := h.queues[queueName]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Queue not found")
		return
	}

	job, exists := h.jobs[jobID]
	if !exists || job.QueueName != queueName {
		h.writeError(w, http.StatusNotFound, "not_found", "Job not found")
		return
	}

	// Only allow retrying failed or cancelled jobs
	if job.Status != JobStatusFailed && job.Status != JobStatusCancelled {
		h.writeError(w, http.StatusConflict, "conflict", "Only failed or cancelled jobs can be retried")
		return
	}

	// Reset the job for retry
	if req.ResetRetryCount {
		job.RetryCount = 0
	} else {
		job.RetryCount++
	}
	job.Status = JobStatusPending
	job.Error = ""
	job.StartedAt = nil
	job.CompletedAt = nil
	job.CancelledAt = nil

	h.updateQueueCounts()

	resp := RetryJobResponse{
		Job:     job,
		Message: "Job has been queued for retry",
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleCancelJob handles POST /api/admin/queues/{name}/jobs/{id}/cancel
func (h *QueueHandler) HandleCancelJob(w http.ResponseWriter, r *http.Request, queueName, jobID string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	_, exists := h.queues[queueName]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Queue not found")
		return
	}

	job, exists := h.jobs[jobID]
	if !exists || job.QueueName != queueName {
		h.writeError(w, http.StatusNotFound, "not_found", "Job not found")
		return
	}

	// Only allow cancelling pending or processing jobs
	if job.Status != JobStatusPending && job.Status != JobStatusProcessing {
		h.writeError(w, http.StatusConflict, "conflict", "Only pending or processing jobs can be cancelled")
		return
	}

	now := time.Now()
	job.Status = JobStatusCancelled
	job.CancelledAt = &now

	h.updateQueueCounts()

	resp := CancelJobResponse{
		Job:     job,
		Message: "Job has been cancelled",
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleDeleteJob handles DELETE /api/admin/queues/{name}/jobs/{id}
func (h *QueueHandler) HandleDeleteJob(w http.ResponseWriter, r *http.Request, queueName, jobID string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	_, exists := h.queues[queueName]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Queue not found")
		return
	}

	job, exists := h.jobs[jobID]
	if !exists || job.QueueName != queueName {
		h.writeError(w, http.StatusNotFound, "not_found", "Job not found")
		return
	}

	// Don't allow deleting processing jobs
	if job.Status == JobStatusProcessing {
		h.writeError(w, http.StatusConflict, "conflict", "Cannot delete a processing job. Cancel it first.")
		return
	}

	delete(h.jobs, jobID)
	h.updateQueueCounts()

	w.WriteHeader(http.StatusNoContent)
}

// HandleGetStats handles GET /api/admin/queues/stats
func (h *QueueHandler) HandleGetStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	stats := QueueStats{
		TotalQueues:    len(h.queues),
		QueueBreakdown: make(map[string]int),
	}

	var totalProcessingTime int64
	var completedJobCount int

	for _, job := range h.jobs {
		stats.TotalJobs++
		stats.QueueBreakdown[job.QueueName]++

		switch job.Status {
		case JobStatusPending:
			stats.PendingJobs++
		case JobStatusProcessing:
			stats.ProcessingJobs++
		case JobStatusCompleted:
			stats.CompletedJobs++
			if job.StartedAt != nil && job.CompletedAt != nil {
				totalProcessingTime += job.CompletedAt.Sub(*job.StartedAt).Milliseconds()
				completedJobCount++
			}
		case JobStatusFailed:
			stats.FailedJobs++
		case JobStatusCancelled:
			stats.CancelledJobs++
		}
	}

	if completedJobCount > 0 {
		stats.AvgProcessingMs = float64(totalProcessingTime) / float64(completedJobCount)
	}

	h.writeJSON(w, http.StatusOK, stats)
}

// HandleFlushQueue handles POST /api/admin/queues/{name}/flush
func (h *QueueHandler) HandleFlushQueue(w http.ResponseWriter, r *http.Request, queueName string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	// Get optional status filter - only flush jobs with this status
	status := r.URL.Query().Get("status")

	h.mu.Lock()
	defer h.mu.Unlock()

	_, exists := h.queues[queueName]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Queue not found")
		return
	}

	flushedCount := 0
	for id, job := range h.jobs {
		if job.QueueName != queueName {
			continue
		}
		// Don't flush processing jobs unless explicitly requested
		if job.Status == JobStatusProcessing && status != string(JobStatusProcessing) {
			continue
		}
		if status != "" && string(job.Status) != status {
			continue
		}
		delete(h.jobs, id)
		flushedCount++
	}

	h.updateQueueCounts()

	h.writeJSON(w, http.StatusOK, map[string]any{
		"message":       "Queue flushed",
		"flushed_count": flushedCount,
		"queue_name":    queueName,
	})
}

// HandlePauseQueue handles POST /api/admin/queues/{name}/pause
func (h *QueueHandler) HandlePauseQueue(w http.ResponseWriter, r *http.Request, queueName string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	queue, exists := h.queues[queueName]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Queue not found")
		return
	}

	if queue.Status == QueueStatusPaused {
		h.writeError(w, http.StatusConflict, "conflict", "Queue is already paused")
		return
	}

	queue.Status = QueueStatusPaused
	queue.UpdatedAt = time.Now()

	h.writeJSON(w, http.StatusOK, queue)
}

// HandleResumeQueue handles POST /api/admin/queues/{name}/resume
func (h *QueueHandler) HandleResumeQueue(w http.ResponseWriter, r *http.Request, queueName string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	queue, exists := h.queues[queueName]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Queue not found")
		return
	}

	if queue.Status == QueueStatusActive {
		h.writeError(w, http.StatusConflict, "conflict", "Queue is already active")
		return
	}

	queue.Status = QueueStatusActive
	queue.UpdatedAt = time.Now()

	h.writeJSON(w, http.StatusOK, queue)
}

// AddJob adds a job to the queue (for testing and internal use)
func (h *QueueHandler) AddJob(queueName, jobType string, payload json.RawMessage) (*Job, error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	_, exists := h.queues[queueName]
	if !exists {
		return nil, &QueueNotFoundError{QueueName: queueName}
	}

	now := time.Now()
	job := &Job{
		ID:         uuid.New().String(),
		QueueName:  queueName,
		Type:       jobType,
		Status:     JobStatusPending,
		Payload:    payload,
		MaxRetries: 3,
		CreatedAt:  now,
	}

	h.jobs[job.ID] = job
	h.updateQueueCounts()

	return job, nil
}

// QueueNotFoundError is returned when a queue is not found
type QueueNotFoundError struct {
	QueueName string
}

func (e *QueueNotFoundError) Error() string {
	return "queue not found: " + e.QueueName
}

// updateQueueCounts updates the job counts for all queues
// Must be called with mutex held
func (h *QueueHandler) updateQueueCounts() {
	// Reset counts
	for _, queue := range h.queues {
		queue.PendingCount = 0
		queue.ProcessingCount = 0
		queue.CompletedCount = 0
		queue.FailedCount = 0
		queue.CancelledCount = 0
	}

	// Count jobs per queue and status
	for _, job := range h.jobs {
		queue, exists := h.queues[job.QueueName]
		if !exists {
			continue
		}

		switch job.Status {
		case JobStatusPending:
			queue.PendingCount++
		case JobStatusProcessing:
			queue.ProcessingCount++
		case JobStatusCompleted:
			queue.CompletedCount++
		case JobStatusFailed:
			queue.FailedCount++
		case JobStatusCancelled:
			queue.CancelledCount++
		}
	}
}

// writeJSON writes a JSON response
func (h *QueueHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *QueueHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}
