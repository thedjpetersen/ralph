package admin

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
)

// OCRStatus represents the status of an OCR job
type OCRStatus string

const (
	OCRStatusPending    OCRStatus = "pending"
	OCRStatusProcessing OCRStatus = "processing"
	OCRStatusCompleted  OCRStatus = "completed"
	OCRStatusFailed     OCRStatus = "failed"
)

// OCREngine represents the OCR engine used
type OCREngine string

const (
	OCREngineTesseract   OCREngine = "tesseract"
	OCREngineGoogleVision OCREngine = "google_vision"
	OCREngineAWSTextract OCREngine = "aws_textract"
	OCREngineAzureOCR    OCREngine = "azure_ocr"
)

// OCRLanguage represents supported OCR languages
type OCRLanguage string

const (
	OCRLanguageEnglish  OCRLanguage = "eng"
	OCRLanguageSpanish  OCRLanguage = "spa"
	OCRLanguageFrench   OCRLanguage = "fra"
	OCRLanguageGerman   OCRLanguage = "deu"
	OCRLanguageChinese  OCRLanguage = "chi"
	OCRLanguageJapanese OCRLanguage = "jpn"
)

// OCRJob represents an OCR processing job
type OCRJob struct {
	ID            string            `json:"id"`
	ReceiptID     string            `json:"receipt_id,omitempty"`
	FileName      string            `json:"file_name"`
	FileSize      int64             `json:"file_size"`
	MimeType      string            `json:"mime_type"`
	Status        OCRStatus         `json:"status"`
	Engine        OCREngine         `json:"engine"`
	Languages     []OCRLanguage     `json:"languages"`
	ExtractedText string            `json:"extracted_text,omitempty"`
	Confidence    float64           `json:"confidence"`
	WordCount     int               `json:"word_count"`
	ProcessingMs  int64             `json:"processing_ms,omitempty"`
	Error         string            `json:"error,omitempty"`
	Metadata      map[string]string `json:"metadata,omitempty"`
	CreatedAt     time.Time         `json:"created_at"`
	StartedAt     *time.Time        `json:"started_at,omitempty"`
	CompletedAt   *time.Time        `json:"completed_at,omitempty"`
}

// OCRBoundingBox represents a text region with coordinates
type OCRBoundingBox struct {
	Text       string  `json:"text"`
	Confidence float64 `json:"confidence"`
	X          int     `json:"x"`
	Y          int     `json:"y"`
	Width      int     `json:"width"`
	Height     int     `json:"height"`
}

// OCRExtraction represents extracted structured data
type OCRExtraction struct {
	ID          string            `json:"id"`
	JobID       string            `json:"job_id"`
	Type        string            `json:"type"` // merchant, date, amount, items, etc.
	Value       string            `json:"value"`
	Confidence  float64           `json:"confidence"`
	BoundingBox *OCRBoundingBox   `json:"bounding_box,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

// OCRStats represents statistics for OCR operations
type OCRStats struct {
	TotalJobs           int            `json:"total_jobs"`
	PendingJobs         int            `json:"pending_jobs"`
	ProcessingJobs      int            `json:"processing_jobs"`
	CompletedJobs       int            `json:"completed_jobs"`
	FailedJobs          int            `json:"failed_jobs"`
	EngineBreakdown     map[string]int `json:"engine_breakdown"`
	AvgProcessingMs     float64        `json:"avg_processing_ms"`
	AvgConfidence       float64        `json:"avg_confidence"`
	TotalBytesProcessed int64          `json:"total_bytes_processed"`
}

// OCRConfig represents OCR configuration
type OCRConfig struct {
	DefaultEngine     OCREngine     `json:"default_engine"`
	DefaultLanguages  []OCRLanguage `json:"default_languages"`
	MaxFileSizeBytes  int64         `json:"max_file_size_bytes"`
	SupportedFormats  []string      `json:"supported_formats"`
	EnablePreprocess  bool          `json:"enable_preprocess"`
	DeskewEnabled     bool          `json:"deskew_enabled"`
	DenoiseEnabled    bool          `json:"denoise_enabled"`
	ContrastEnhance   bool          `json:"contrast_enhance"`
	MinConfidence     float64       `json:"min_confidence"`
	TimeoutSeconds    int           `json:"timeout_seconds"`
}

// ListOCRJobsResponse represents a list of OCR jobs
type ListOCRJobsResponse struct {
	Jobs  []*OCRJob `json:"jobs"`
	Total int       `json:"total"`
}

// CreateOCRJobRequest represents a request to create an OCR job
type CreateOCRJobRequest struct {
	ReceiptID string        `json:"receipt_id,omitempty"`
	FileName  string        `json:"file_name"`
	FileSize  int64         `json:"file_size"`
	MimeType  string        `json:"mime_type"`
	Engine    OCREngine     `json:"engine,omitempty"`
	Languages []OCRLanguage `json:"languages,omitempty"`
}

// BulkOCRRequest represents a request to process multiple files
type BulkOCRRequest struct {
	Jobs []CreateOCRJobRequest `json:"jobs"`
}

// BulkOCRResponse represents the response for bulk OCR
type BulkOCRResponse struct {
	Jobs        []*OCRJob `json:"jobs"`
	TotalJobs   int       `json:"total_jobs"`
	QueuedJobs  int       `json:"queued_jobs"`
	FailedJobs  int       `json:"failed_jobs"`
}

// ReprocessOCRRequest represents a request to reprocess OCR
type ReprocessOCRRequest struct {
	Engine    OCREngine     `json:"engine,omitempty"`
	Languages []OCRLanguage `json:"languages,omitempty"`
}

// UpdateOCRConfigRequest represents a request to update config
type UpdateOCRConfigRequest struct {
	DefaultEngine     *OCREngine    `json:"default_engine,omitempty"`
	DefaultLanguages  []OCRLanguage `json:"default_languages,omitempty"`
	MaxFileSizeBytes  *int64        `json:"max_file_size_bytes,omitempty"`
	SupportedFormats  []string      `json:"supported_formats,omitempty"`
	EnablePreprocess  *bool         `json:"enable_preprocess,omitempty"`
	DeskewEnabled     *bool         `json:"deskew_enabled,omitempty"`
	DenoiseEnabled    *bool         `json:"denoise_enabled,omitempty"`
	ContrastEnhance   *bool         `json:"contrast_enhance,omitempty"`
	MinConfidence     *float64      `json:"min_confidence,omitempty"`
	TimeoutSeconds    *int          `json:"timeout_seconds,omitempty"`
}

// OCRHandler handles HTTP requests for admin OCR management
type OCRHandler struct {
	mu          sync.RWMutex
	jobs        map[string]*OCRJob
	extractions map[string][]*OCRExtraction
	config      *OCRConfig
	stats       *OCRStats
}

// NewOCRHandler creates a new OCRHandler instance
func NewOCRHandler() *OCRHandler {
	return &OCRHandler{
		jobs:        make(map[string]*OCRJob),
		extractions: make(map[string][]*OCRExtraction),
		config: &OCRConfig{
			DefaultEngine:     OCREngineTesseract,
			DefaultLanguages:  []OCRLanguage{OCRLanguageEnglish},
			MaxFileSizeBytes:  10 * 1024 * 1024, // 10MB
			SupportedFormats:  []string{"image/jpeg", "image/png", "image/tiff", "application/pdf"},
			EnablePreprocess:  true,
			DeskewEnabled:     true,
			DenoiseEnabled:    true,
			ContrastEnhance:   true,
			MinConfidence:     0.6,
			TimeoutSeconds:    120,
		},
		stats: &OCRStats{
			EngineBreakdown: make(map[string]int),
		},
	}
}

// HandleList handles GET /api/admin/ocr
func (h *OCRHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	// Get optional filters
	status := r.URL.Query().Get("status")
	engine := r.URL.Query().Get("engine")

	h.mu.RLock()
	jobs := make([]*OCRJob, 0)
	for _, job := range h.jobs {
		if status != "" && string(job.Status) != status {
			continue
		}
		if engine != "" && string(job.Engine) != engine {
			continue
		}
		jobs = append(jobs, job)
	}
	h.mu.RUnlock()

	resp := ListOCRJobsResponse{
		Jobs:  jobs,
		Total: len(jobs),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleGet handles GET /api/admin/ocr/{id}
func (h *OCRHandler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	job, exists := h.jobs[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "OCR job not found")
		return
	}

	h.writeJSON(w, http.StatusOK, job)
}

// HandleCreate handles POST /api/admin/ocr
func (h *OCRHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req CreateOCRJobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.FileName == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "file_name is required")
		return
	}

	h.mu.RLock()
	config := h.config
	h.mu.RUnlock()

	if req.FileSize > config.MaxFileSizeBytes {
		h.writeError(w, http.StatusBadRequest, "validation_error", "file size exceeds maximum allowed")
		return
	}

	engine := config.DefaultEngine
	if req.Engine != "" {
		engine = req.Engine
	}

	languages := config.DefaultLanguages
	if len(req.Languages) > 0 {
		languages = req.Languages
	}

	now := time.Now()
	job := &OCRJob{
		ID:        uuid.New().String(),
		ReceiptID: req.ReceiptID,
		FileName:  req.FileName,
		FileSize:  req.FileSize,
		MimeType:  req.MimeType,
		Status:    OCRStatusPending,
		Engine:    engine,
		Languages: languages,
		Metadata:  make(map[string]string),
		CreatedAt: now,
	}

	h.mu.Lock()
	h.jobs[job.ID] = job
	h.stats.TotalJobs++
	h.stats.PendingJobs++
	h.mu.Unlock()

	h.writeJSON(w, http.StatusCreated, job)
}

// HandleBulkCreate handles POST /api/admin/ocr/bulk
func (h *OCRHandler) HandleBulkCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req BulkOCRRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if len(req.Jobs) == 0 {
		h.writeError(w, http.StatusBadRequest, "validation_error", "jobs is required")
		return
	}

	if len(req.Jobs) > 50 {
		h.writeError(w, http.StatusBadRequest, "validation_error", "maximum 50 jobs per bulk request")
		return
	}

	h.mu.RLock()
	config := h.config
	h.mu.RUnlock()

	jobs := make([]*OCRJob, 0, len(req.Jobs))
	queuedJobs := 0
	failedJobs := 0
	now := time.Now()

	h.mu.Lock()
	for _, jobReq := range req.Jobs {
		if jobReq.FileName == "" || jobReq.FileSize > config.MaxFileSizeBytes {
			failedJobs++
			continue
		}

		engine := config.DefaultEngine
		if jobReq.Engine != "" {
			engine = jobReq.Engine
		}

		languages := config.DefaultLanguages
		if len(jobReq.Languages) > 0 {
			languages = jobReq.Languages
		}

		job := &OCRJob{
			ID:        uuid.New().String(),
			ReceiptID: jobReq.ReceiptID,
			FileName:  jobReq.FileName,
			FileSize:  jobReq.FileSize,
			MimeType:  jobReq.MimeType,
			Status:    OCRStatusPending,
			Engine:    engine,
			Languages: languages,
			Metadata:  make(map[string]string),
			CreatedAt: now,
		}

		h.jobs[job.ID] = job
		jobs = append(jobs, job)
		queuedJobs++
		h.stats.TotalJobs++
		h.stats.PendingJobs++
	}
	h.mu.Unlock()

	resp := BulkOCRResponse{
		Jobs:       jobs,
		TotalJobs:  len(req.Jobs),
		QueuedJobs: queuedJobs,
		FailedJobs: failedJobs,
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleDelete handles DELETE /api/admin/ocr/{id}
func (h *OCRHandler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	job, exists := h.jobs[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "OCR job not found")
		return
	}

	if job.Status == OCRStatusProcessing {
		h.mu.Unlock()
		h.writeError(w, http.StatusConflict, "conflict", "Cannot delete a processing job")
		return
	}

	delete(h.jobs, id)
	delete(h.extractions, id)

	// Update stats
	switch job.Status {
	case OCRStatusPending:
		h.stats.PendingJobs--
	case OCRStatusCompleted:
		h.stats.CompletedJobs--
	case OCRStatusFailed:
		h.stats.FailedJobs--
	}
	h.stats.TotalJobs--
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// HandleReprocess handles POST /api/admin/ocr/{id}/reprocess
func (h *OCRHandler) HandleReprocess(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req ReprocessOCRRequest
	if r.Body != nil && r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
			return
		}
	}

	h.mu.Lock()
	job, exists := h.jobs[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "OCR job not found")
		return
	}

	if job.Status == OCRStatusProcessing {
		h.mu.Unlock()
		h.writeError(w, http.StatusConflict, "conflict", "Job is already processing")
		return
	}

	// Update stats for status change
	switch job.Status {
	case OCRStatusCompleted:
		h.stats.CompletedJobs--
	case OCRStatusFailed:
		h.stats.FailedJobs--
	}

	// Reset job for reprocessing
	job.Status = OCRStatusPending
	job.ExtractedText = ""
	job.Confidence = 0
	job.WordCount = 0
	job.ProcessingMs = 0
	job.Error = ""
	job.StartedAt = nil
	job.CompletedAt = nil

	if req.Engine != "" {
		job.Engine = req.Engine
	}
	if len(req.Languages) > 0 {
		job.Languages = req.Languages
	}

	h.stats.PendingJobs++

	// Clear previous extractions
	delete(h.extractions, id)
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, job)
}

// HandleGetExtractions handles GET /api/admin/ocr/{id}/extractions
func (h *OCRHandler) HandleGetExtractions(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	_, exists := h.jobs[id]
	if !exists {
		h.mu.RUnlock()
		h.writeError(w, http.StatusNotFound, "not_found", "OCR job not found")
		return
	}

	extractions := h.extractions[id]
	h.mu.RUnlock()

	if extractions == nil {
		extractions = []*OCRExtraction{}
	}

	h.writeJSON(w, http.StatusOK, map[string]any{
		"extractions": extractions,
		"total":       len(extractions),
	})
}

// HandleGetStats handles GET /api/admin/ocr/stats
func (h *OCRHandler) HandleGetStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	stats := *h.stats
	h.mu.RUnlock()

	h.writeJSON(w, http.StatusOK, stats)
}

// HandleGetConfig handles GET /api/admin/ocr/config
func (h *OCRHandler) HandleGetConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	config := *h.config
	h.mu.RUnlock()

	h.writeJSON(w, http.StatusOK, config)
}

// HandleUpdateConfig handles PUT /api/admin/ocr/config
func (h *OCRHandler) HandleUpdateConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req UpdateOCRConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	if req.DefaultEngine != nil {
		h.config.DefaultEngine = *req.DefaultEngine
	}
	if req.DefaultLanguages != nil {
		h.config.DefaultLanguages = req.DefaultLanguages
	}
	if req.MaxFileSizeBytes != nil {
		h.config.MaxFileSizeBytes = *req.MaxFileSizeBytes
	}
	if req.SupportedFormats != nil {
		h.config.SupportedFormats = req.SupportedFormats
	}
	if req.EnablePreprocess != nil {
		h.config.EnablePreprocess = *req.EnablePreprocess
	}
	if req.DeskewEnabled != nil {
		h.config.DeskewEnabled = *req.DeskewEnabled
	}
	if req.DenoiseEnabled != nil {
		h.config.DenoiseEnabled = *req.DenoiseEnabled
	}
	if req.ContrastEnhance != nil {
		h.config.ContrastEnhance = *req.ContrastEnhance
	}
	if req.MinConfidence != nil {
		h.config.MinConfidence = *req.MinConfidence
	}
	if req.TimeoutSeconds != nil {
		h.config.TimeoutSeconds = *req.TimeoutSeconds
	}

	h.writeJSON(w, http.StatusOK, h.config)
}

// writeJSON writes a JSON response
func (h *OCRHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *OCRHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}
