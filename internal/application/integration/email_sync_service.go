// Package integration provides application-level services for third-party integrations.
package integration

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"clockzen-next/internal/ent"
	"clockzen-next/internal/ent/emailconnection"
	"clockzen-next/internal/ent/emaillabel"
	"clockzen-next/internal/ent/emailsync"
	"clockzen-next/internal/infrastructure/google"

	"github.com/google/uuid"
)

// Email sync service errors
var (
	ErrEmailConnectionNotFound    = errors.New("email connection not found")
	ErrEmailConnectionInactive    = errors.New("email connection is not active")
	ErrEmailLabelNotFound         = errors.New("email label not found")
	ErrEmailSyncAlreadyRunning    = errors.New("sync is already running for this connection")
	ErrEmailSyncNotFound          = errors.New("email sync record not found")
	ErrInvalidEmailSyncType       = errors.New("invalid email sync type")
	ErrNoEmailLabelsToSync        = errors.New("no email labels configured for sync")
	ErrEmailReceiptExtractionFail = errors.New("email receipt extraction failed")
	ErrAttachmentDownloadFail     = errors.New("attachment download failed")
)

// Receipt-related attachment extensions
var receiptAttachmentExtensions = map[string]bool{
	".pdf":  true,
	".png":  true,
	".jpg":  true,
	".jpeg": true,
	".gif":  true,
	".tiff": true,
	".bmp":  true,
	".webp": true,
}

// Receipt-related MIME types
var receiptMimeTypes = map[string]bool{
	"application/pdf":    true,
	"image/png":          true,
	"image/jpeg":         true,
	"image/gif":          true,
	"image/tiff":         true,
	"image/bmp":          true,
	"image/webp":         true,
}

// EmailSyncConfig holds configuration for the email sync service
type EmailSyncConfig struct {
	// MaxConcurrentMessages limits parallel message processing
	MaxConcurrentMessages int
	// MessageProcessingTimeout per message
	MessageProcessingTimeout time.Duration
	// MaxAttachmentSizeBytes limits individual attachment download size
	MaxAttachmentSizeBytes int64
	// EnableReceiptExtraction enables automatic receipt detection from emails
	EnableReceiptExtraction bool
	// EnableAttachmentProcessing enables downloading and processing attachments
	EnableAttachmentProcessing bool
	// ReceiptLabelNames are label names to scan for receipts
	ReceiptLabelNames []string
	// ReceiptKeywords are keywords to identify receipt emails
	ReceiptKeywords []string
	// BatchSize for message processing
	BatchSize int
}

// DefaultEmailSyncConfig returns sensible default configuration
func DefaultEmailSyncConfig() EmailSyncConfig {
	return EmailSyncConfig{
		MaxConcurrentMessages:      10,
		MessageProcessingTimeout:   2 * time.Minute,
		MaxAttachmentSizeBytes:     50 * 1024 * 1024, // 50MB
		EnableReceiptExtraction:    true,
		EnableAttachmentProcessing: true,
		ReceiptLabelNames: []string{
			"receipts",
			"Receipts",
			"RECEIPTS",
			"invoices",
			"Invoices",
			"expenses",
			"Expenses",
			"purchases",
			"Purchases",
		},
		ReceiptKeywords: []string{
			"receipt",
			"invoice",
			"order confirmation",
			"purchase",
			"payment",
			"transaction",
			"billing",
			"subscription",
		},
		BatchSize: 100,
	}
}

// EmailSyncResult represents the result of an email sync operation
type EmailSyncResult struct {
	SyncID                string
	ConnectionID          string
	LabelID               *string
	SyncType              string
	Status                string
	StartedAt             time.Time
	CompletedAt           *time.Time
	MessagesScanned       int
	MessagesDownloaded    int
	MessagesIndexed       int
	MessagesFailed        int
	AttachmentsDownloaded int
	BytesTransferred      int64
	ErrorMessage          *string
	HistoryID             *string
	Receipts              []ExtractedEmailReceipt
	Attachments           []ExtractedEmailAttachment
}

// ExtractedEmailReceipt represents a receipt extracted from an email
type ExtractedEmailReceipt struct {
	MessageID       string
	ThreadID        string
	Subject         string
	From            string
	To              string
	ReceivedAt      time.Time
	Snippet         string
	LabelIDs        []string
	HasAttachments  bool
	AttachmentCount int
	Attachments     []ExtractedEmailAttachment
}

// ExtractedEmailAttachment represents an attachment extracted from an email
type ExtractedEmailAttachment struct {
	AttachmentID string
	MessageID    string
	Filename     string
	MimeType     string
	Size         int
	IsReceipt    bool
}

// EmailSyncProgress reports real-time email sync progress
type EmailSyncProgress struct {
	SyncID                string
	Status                string
	MessagesScanned       int
	MessagesProcessed     int
	TotalMessages         int
	AttachmentsDownloaded int
	BytesTransferred      int64
	CurrentMessage        string
	Errors                []string
}

// EmailSyncProgressCallback is called during sync to report progress
type EmailSyncProgressCallback func(progress EmailSyncProgress)

// EmailSyncService provides email sync functionality
type EmailSyncService struct {
	config      EmailSyncConfig
	entClient   *ent.Client
	oauthCfg    *google.Config
	mu          sync.RWMutex
	activeSyncs map[string]context.CancelFunc
}

// NewEmailSyncService creates a new email sync service
func NewEmailSyncService(entClient *ent.Client, oauthCfg *google.Config, config EmailSyncConfig) *EmailSyncService {
	return &EmailSyncService{
		config:      config,
		entClient:   entClient,
		oauthCfg:    oauthCfg,
		activeSyncs: make(map[string]context.CancelFunc),
	}
}

// NewEmailSyncServiceWithDefaults creates a service with default configuration
func NewEmailSyncServiceWithDefaults(entClient *ent.Client, oauthCfg *google.Config) *EmailSyncService {
	return NewEmailSyncService(entClient, oauthCfg, DefaultEmailSyncConfig())
}

// SyncLabel performs a sync operation for a specific label
func (s *EmailSyncService) SyncLabel(ctx context.Context, connectionID, labelID string, syncType string) (*EmailSyncResult, error) {
	return s.SyncLabelWithProgress(ctx, connectionID, labelID, syncType, nil)
}

// SyncLabelWithProgress performs a sync with progress callback
func (s *EmailSyncService) SyncLabelWithProgress(ctx context.Context, connectionID, labelID string, syncType string, progressCb EmailSyncProgressCallback) (*EmailSyncResult, error) {
	// Validate sync type
	if !isValidEmailSyncType(syncType) {
		return nil, fmt.Errorf("%w: %s", ErrInvalidEmailSyncType, syncType)
	}

	// Check if sync is already running
	s.mu.RLock()
	if _, exists := s.activeSyncs[connectionID]; exists {
		s.mu.RUnlock()
		return nil, ErrEmailSyncAlreadyRunning
	}
	s.mu.RUnlock()

	// Get connection
	connection, err := s.entClient.EmailConnection.Get(ctx, connectionID)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrEmailConnectionNotFound
		}
		return nil, fmt.Errorf("getting connection: %w", err)
	}

	// Verify connection is active
	if connection.Status != emailconnection.StatusActive {
		return nil, fmt.Errorf("%w: status is %s", ErrEmailConnectionInactive, connection.Status)
	}

	// Get label if specified
	var label *ent.EmailLabel
	if labelID != "" {
		label, err = s.entClient.EmailLabel.Get(ctx, labelID)
		if err != nil {
			if ent.IsNotFound(err) {
				return nil, ErrEmailLabelNotFound
			}
			return nil, fmt.Errorf("getting label: %w", err)
		}
	}

	// Create sync record
	syncID := uuid.New().String()
	now := time.Now()
	syncRecord, err := s.entClient.EmailSync.Create().
		SetID(syncID).
		SetConnectionID(connectionID).
		SetNillableLabelID(&labelID).
		SetSyncType(emailsync.SyncType(syncType)).
		SetStatus(emailsync.StatusRunning).
		SetStartedAt(now).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("creating sync record: %w", err)
	}

	// Register active sync with cancellation
	ctx, cancel := context.WithCancel(ctx)
	s.mu.Lock()
	s.activeSyncs[connectionID] = cancel
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		delete(s.activeSyncs, connectionID)
		s.mu.Unlock()
		cancel()
	}()

	// Create OAuth token and Gmail client
	oauthClient, err := google.NewClient(s.oauthCfg)
	if err != nil {
		return s.failSync(ctx, syncRecord, fmt.Errorf("creating oauth client: %w", err))
	}

	token := &google.Token{
		AccessToken:  connection.AccessToken,
		RefreshToken: connection.RefreshToken,
		Expiry:       connection.TokenExpiry,
	}
	tokenSource := google.NewTokenSource(oauthClient, token)
	gmailClient := google.NewGmailClient(tokenSource)

	// Perform the sync based on type
	var result *EmailSyncResult
	switch syncType {
	case "full":
		result, err = s.performFullEmailSync(ctx, gmailClient, syncRecord, label, progressCb)
	case "incremental":
		result, err = s.performIncrementalEmailSync(ctx, gmailClient, syncRecord, label, progressCb)
	case "manual":
		result, err = s.performFullEmailSync(ctx, gmailClient, syncRecord, label, progressCb)
	default:
		return s.failSync(ctx, syncRecord, ErrInvalidEmailSyncType)
	}

	if err != nil {
		return s.failSync(ctx, syncRecord, err)
	}

	// Update connection's last sync time
	_, err = s.entClient.EmailConnection.UpdateOneID(connectionID).
		SetLastSyncAt(time.Now()).
		Save(ctx)
	if err != nil {
		// Log but don't fail - sync was successful
	}

	return result, nil
}

// performFullEmailSync scans all messages in the label(s)
func (s *EmailSyncService) performFullEmailSync(ctx context.Context, gmailClient *google.GmailClient, syncRecord *ent.EmailSync, label *ent.EmailLabel, progressCb EmailSyncProgressCallback) (*EmailSyncResult, error) {
	result := &EmailSyncResult{
		SyncID:       syncRecord.ID,
		ConnectionID: syncRecord.ConnectionID,
		LabelID:      syncRecord.LabelID,
		SyncType:     string(syncRecord.SyncType),
		Status:       "running",
		StartedAt:    *syncRecord.StartedAt,
		Receipts:     make([]ExtractedEmailReceipt, 0),
		Attachments:  make([]ExtractedEmailAttachment, 0),
	}

	var labelIDs []string
	if label != nil {
		labelIDs = []string{label.ProviderLabelID}
	} else {
		// Get all enabled labels for this connection
		labels, err := s.entClient.EmailLabel.Query().
			Where(
				emaillabel.ConnectionID(syncRecord.ConnectionID),
				emaillabel.SyncEnabled(true),
			).
			All(ctx)
		if err != nil {
			return nil, fmt.Errorf("querying labels: %w", err)
		}
		if len(labels) == 0 {
			return nil, ErrNoEmailLabelsToSync
		}
		for _, l := range labels {
			labelIDs = append(labelIDs, l.ProviderLabelID)
		}
	}

	// Scan all labels
	for _, lid := range labelIDs {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		err := s.scanLabelMessages(ctx, gmailClient, lid, result, progressCb)
		if err != nil {
			result.MessagesFailed++
			continue
		}
	}

	// Get a new history ID for future incremental syncs
	profile, err := gmailClient.GetProfile(ctx)
	if err == nil && profile.HistoryID != "" {
		result.HistoryID = &profile.HistoryID
	}

	// Complete the sync
	result.Status = "completed"
	now := time.Now()
	result.CompletedAt = &now

	// Update sync record
	_, err = s.entClient.EmailSync.UpdateOneID(syncRecord.ID).
		SetStatus(emailsync.StatusCompleted).
		SetCompletedAt(now).
		SetMessagesScanned(result.MessagesScanned).
		SetMessagesDownloaded(result.MessagesDownloaded).
		SetMessagesIndexed(result.MessagesIndexed).
		SetMessagesFailed(result.MessagesFailed).
		SetAttachmentsDownloaded(result.AttachmentsDownloaded).
		SetBytesTransferred(result.BytesTransferred).
		SetNillableHistoryID(result.HistoryID).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("updating sync record: %w", err)
	}

	return result, nil
}

// performIncrementalEmailSync uses history ID to sync only changed messages
func (s *EmailSyncService) performIncrementalEmailSync(ctx context.Context, gmailClient *google.GmailClient, syncRecord *ent.EmailSync, label *ent.EmailLabel, progressCb EmailSyncProgressCallback) (*EmailSyncResult, error) {
	result := &EmailSyncResult{
		SyncID:       syncRecord.ID,
		ConnectionID: syncRecord.ConnectionID,
		LabelID:      syncRecord.LabelID,
		SyncType:     string(syncRecord.SyncType),
		Status:       "running",
		StartedAt:    *syncRecord.StartedAt,
		Receipts:     make([]ExtractedEmailReceipt, 0),
		Attachments:  make([]ExtractedEmailAttachment, 0),
	}

	// Get the last history ID from the most recent completed sync
	lastSync, err := s.entClient.EmailSync.Query().
		Where(
			emailsync.ConnectionID(syncRecord.ConnectionID),
			emailsync.StatusEQ(emailsync.StatusCompleted),
			emailsync.HistoryIDNotNil(),
		).
		Order(ent.Desc(emailsync.FieldCompletedAt)).
		First(ctx)

	var startHistoryID string
	if err != nil || lastSync.HistoryID == nil {
		// No previous sync or no history ID, get current profile for start
		profile, err := gmailClient.GetProfile(ctx)
		if err != nil {
			return nil, fmt.Errorf("getting profile for history ID: %w", err)
		}
		startHistoryID = profile.HistoryID
	} else {
		startHistoryID = *lastSync.HistoryID
	}

	// Get label IDs to filter changes
	var labelIDSet map[string]bool
	if label != nil {
		labelIDSet = map[string]bool{label.ProviderLabelID: true}
	} else {
		labels, err := s.entClient.EmailLabel.Query().
			Where(
				emaillabel.ConnectionID(syncRecord.ConnectionID),
				emaillabel.SyncEnabled(true),
			).
			All(ctx)
		if err != nil {
			return nil, fmt.Errorf("querying labels: %w", err)
		}
		labelIDSet = make(map[string]bool)
		for _, l := range labels {
			labelIDSet[l.ProviderLabelID] = true
		}
	}

	// List all history changes since the last sync
	historyRecords, newHistoryID, err := gmailClient.ListAllHistory(ctx, startHistoryID, google.ListHistoryOptions{
		HistoryTypes: []string{"messageAdded", "labelAdded"},
	})
	if err != nil {
		// If history ID is invalid (too old), fall back to full sync
		if errors.Is(err, google.ErrInvalidHistoryID) {
			return s.performFullEmailSync(ctx, gmailClient, syncRecord, label, progressCb)
		}
		return nil, fmt.Errorf("listing history: %w", err)
	}

	// Process history changes
	processedMessages := make(map[string]bool)
	for _, history := range historyRecords {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		// Process added messages
		for _, added := range history.MessagesAdded {
			if processedMessages[added.Message.ID] {
				continue
			}

			// Check if message is in a tracked label
			inTrackedLabel := false
			for _, msgLabelID := range added.Message.LabelIDs {
				if labelIDSet[msgLabelID] {
					inTrackedLabel = true
					break
				}
			}
			if !inTrackedLabel {
				continue
			}

			result.MessagesScanned++
			processedMessages[added.Message.ID] = true

			// Get full message details
			fullMessage, err := gmailClient.GetMessageContent(ctx, added.Message.ID)
			if err != nil {
				result.MessagesFailed++
				continue
			}

			// Process the message
			if err := s.processMessage(ctx, gmailClient, fullMessage, result, progressCb); err != nil {
				result.MessagesFailed++
				continue
			}

			result.MessagesDownloaded++
		}

		// Process label additions (messages that got a tracked label)
		for _, labelAdded := range history.LabelsAdded {
			if processedMessages[labelAdded.Message.ID] {
				continue
			}

			inTrackedLabel := false
			for _, addedLabelID := range labelAdded.LabelIDs {
				if labelIDSet[addedLabelID] {
					inTrackedLabel = true
					break
				}
			}
			if !inTrackedLabel {
				continue
			}

			result.MessagesScanned++
			processedMessages[labelAdded.Message.ID] = true

			fullMessage, err := gmailClient.GetMessageContent(ctx, labelAdded.Message.ID)
			if err != nil {
				result.MessagesFailed++
				continue
			}

			if err := s.processMessage(ctx, gmailClient, fullMessage, result, progressCb); err != nil {
				result.MessagesFailed++
				continue
			}

			result.MessagesDownloaded++
		}
	}

	// Update history ID
	if newHistoryID != "" {
		result.HistoryID = &newHistoryID
	}

	// Complete the sync
	result.Status = "completed"
	now := time.Now()
	result.CompletedAt = &now

	// Update sync record
	_, err = s.entClient.EmailSync.UpdateOneID(syncRecord.ID).
		SetStatus(emailsync.StatusCompleted).
		SetCompletedAt(now).
		SetMessagesScanned(result.MessagesScanned).
		SetMessagesDownloaded(result.MessagesDownloaded).
		SetMessagesIndexed(result.MessagesIndexed).
		SetMessagesFailed(result.MessagesFailed).
		SetAttachmentsDownloaded(result.AttachmentsDownloaded).
		SetBytesTransferred(result.BytesTransferred).
		SetNillableHistoryID(result.HistoryID).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("updating sync record: %w", err)
	}

	return result, nil
}

// scanLabelMessages scans messages in a specific label
func (s *EmailSyncService) scanLabelMessages(ctx context.Context, gmailClient *google.GmailClient, labelID string, result *EmailSyncResult, progressCb EmailSyncProgressCallback) error {
	// Use iterator for efficient pagination
	iterator := gmailClient.NewMessageIterator(ctx, google.ListMessagesOptions{
		MaxResults: s.config.BatchSize,
		LabelIDs:   []string{labelID},
	})

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		msgRef, err := iterator.Next()
		if err != nil {
			return fmt.Errorf("iterating messages: %w", err)
		}
		if msgRef == nil {
			break // No more messages
		}

		result.MessagesScanned++

		// Get full message details
		fullMessage, err := gmailClient.GetMessageContent(ctx, msgRef.ID)
		if err != nil {
			result.MessagesFailed++
			continue
		}

		// Process the message
		if err := s.processMessage(ctx, gmailClient, fullMessage, result, progressCb); err != nil {
			result.MessagesFailed++
			continue
		}

		result.MessagesDownloaded++

		// Report progress
		if progressCb != nil {
			subject := ""
			if fullMessage.Payload != nil {
				subject = fullMessage.Payload.GetHeader("Subject")
			}
			progressCb(EmailSyncProgress{
				SyncID:                result.SyncID,
				Status:                "running",
				MessagesScanned:       result.MessagesScanned,
				MessagesProcessed:     result.MessagesDownloaded,
				AttachmentsDownloaded: result.AttachmentsDownloaded,
				BytesTransferred:      result.BytesTransferred,
				CurrentMessage:        subject,
			})
		}
	}

	return nil
}

// processMessage processes a single email message
func (s *EmailSyncService) processMessage(ctx context.Context, gmailClient *google.GmailClient, message *google.GmailMessage, result *EmailSyncResult, progressCb EmailSyncProgressCallback) error {
	if message == nil || message.Payload == nil {
		return nil
	}

	// Extract message metadata
	subject := message.Payload.GetHeader("Subject")
	from := message.Payload.GetHeader("From")
	to := message.Payload.GetHeader("To")

	receivedAt, _ := message.InternalDateTime()

	// Get attachments
	attachments := google.GetAttachments(message)

	// Check if this is a receipt email
	isReceiptEmail := s.isReceiptEmail(message, attachments)

	// Process attachments if enabled
	var extractedAttachments []ExtractedEmailAttachment
	if s.config.EnableAttachmentProcessing && len(attachments) > 0 {
		for _, att := range attachments {
			select {
			case <-ctx.Done():
				return ctx.Err()
			default:
			}

			// Check if attachment is a receipt-type file
			isReceiptAttachment := s.isReceiptAttachment(att)

			extractedAtt := ExtractedEmailAttachment{
				AttachmentID: att.AttachmentID,
				MessageID:    message.ID,
				Filename:     att.Filename,
				MimeType:     att.MimeType,
				Size:         att.Size,
				IsReceipt:    isReceiptAttachment,
			}

			// Check size limit
			if int64(att.Size) > s.config.MaxAttachmentSizeBytes {
				continue
			}

			// Download attachment if it's a receipt or if receipt extraction is enabled
			if isReceiptAttachment && s.config.EnableReceiptExtraction {
				_, err := gmailClient.DownloadAttachment(ctx, message.ID, att.AttachmentID)
				if err != nil {
					// Log but continue
					continue
				}
				result.AttachmentsDownloaded++
				result.BytesTransferred += int64(att.Size)
			}

			extractedAttachments = append(extractedAttachments, extractedAtt)
			result.Attachments = append(result.Attachments, extractedAtt)
		}
	}

	// If this is a receipt email, extract receipt information
	if isReceiptEmail && s.config.EnableReceiptExtraction {
		receipt := ExtractedEmailReceipt{
			MessageID:       message.ID,
			ThreadID:        message.ThreadID,
			Subject:         subject,
			From:            from,
			To:              to,
			ReceivedAt:      receivedAt,
			Snippet:         message.Snippet,
			LabelIDs:        message.LabelIDs,
			HasAttachments:  len(attachments) > 0,
			AttachmentCount: len(attachments),
			Attachments:     extractedAttachments,
		}
		result.Receipts = append(result.Receipts, receipt)
	}

	result.MessagesIndexed++
	return nil
}

// isReceiptEmail checks if an email is likely a receipt based on content and attachments
func (s *EmailSyncService) isReceiptEmail(message *google.GmailMessage, attachments []google.AttachmentInfo) bool {
	if message == nil || message.Payload == nil {
		return false
	}

	// Check subject for receipt keywords
	subject := strings.ToLower(message.Payload.GetHeader("Subject"))
	for _, keyword := range s.config.ReceiptKeywords {
		if strings.Contains(subject, strings.ToLower(keyword)) {
			return true
		}
	}

	// Check snippet for receipt keywords
	snippet := strings.ToLower(message.Snippet)
	for _, keyword := range s.config.ReceiptKeywords {
		if strings.Contains(snippet, strings.ToLower(keyword)) {
			return true
		}
	}

	// Check if it has receipt-type attachments
	for _, att := range attachments {
		if s.isReceiptAttachment(att) {
			// Check filename for receipt keywords
			lowerFilename := strings.ToLower(att.Filename)
			for _, keyword := range s.config.ReceiptKeywords {
				if strings.Contains(lowerFilename, strings.ToLower(keyword)) {
					return true
				}
			}
		}
	}

	return false
}

// isReceiptAttachment checks if an attachment is likely a receipt file
func (s *EmailSyncService) isReceiptAttachment(att google.AttachmentInfo) bool {
	// Check MIME type
	if receiptMimeTypes[att.MimeType] {
		return true
	}

	// Check file extension
	ext := strings.ToLower(filepath.Ext(att.Filename))
	if receiptAttachmentExtensions[ext] {
		return true
	}

	return false
}

// failSync marks a sync as failed and returns the error
func (s *EmailSyncService) failSync(ctx context.Context, syncRecord *ent.EmailSync, err error) (*EmailSyncResult, error) {
	errMsg := err.Error()
	now := time.Now()

	_, updateErr := s.entClient.EmailSync.UpdateOneID(syncRecord.ID).
		SetStatus(emailsync.StatusFailed).
		SetCompletedAt(now).
		SetErrorMessage(errMsg).
		Save(ctx)
	if updateErr != nil {
		return nil, fmt.Errorf("updating failed sync: %w (original error: %v)", updateErr, err)
	}

	return &EmailSyncResult{
		SyncID:       syncRecord.ID,
		ConnectionID: syncRecord.ConnectionID,
		Status:       "failed",
		StartedAt:    *syncRecord.StartedAt,
		CompletedAt:  &now,
		ErrorMessage: &errMsg,
	}, err
}

// CancelSync cancels a running sync operation
func (s *EmailSyncService) CancelSync(connectionID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cancel, exists := s.activeSyncs[connectionID]
	if !exists {
		return ErrEmailSyncNotFound
	}

	cancel()
	delete(s.activeSyncs, connectionID)
	return nil
}

// GetSyncStatus retrieves the status of a sync operation
func (s *EmailSyncService) GetSyncStatus(ctx context.Context, syncID string) (*EmailSyncResult, error) {
	sync, err := s.entClient.EmailSync.Get(ctx, syncID)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrEmailSyncNotFound
		}
		return nil, fmt.Errorf("getting sync: %w", err)
	}

	result := &EmailSyncResult{
		SyncID:                sync.ID,
		ConnectionID:          sync.ConnectionID,
		LabelID:               sync.LabelID,
		SyncType:              string(sync.SyncType),
		Status:                string(sync.Status),
		MessagesScanned:       sync.MessagesScanned,
		MessagesDownloaded:    sync.MessagesDownloaded,
		MessagesIndexed:       sync.MessagesIndexed,
		MessagesFailed:        sync.MessagesFailed,
		AttachmentsDownloaded: sync.AttachmentsDownloaded,
		BytesTransferred:      sync.BytesTransferred,
		ErrorMessage:          sync.ErrorMessage,
		HistoryID:             sync.HistoryID,
	}

	if sync.StartedAt != nil {
		result.StartedAt = *sync.StartedAt
	}
	if sync.CompletedAt != nil {
		result.CompletedAt = sync.CompletedAt
	}

	return result, nil
}

// GetSyncHistory retrieves sync history for a connection
func (s *EmailSyncService) GetSyncHistory(ctx context.Context, connectionID string, limit int) ([]*EmailSyncResult, error) {
	syncs, err := s.entClient.EmailSync.Query().
		Where(emailsync.ConnectionID(connectionID)).
		Order(ent.Desc(emailsync.FieldCreatedAt)).
		Limit(limit).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("querying sync history: %w", err)
	}

	results := make([]*EmailSyncResult, len(syncs))
	for i, sync := range syncs {
		results[i] = &EmailSyncResult{
			SyncID:                sync.ID,
			ConnectionID:          sync.ConnectionID,
			LabelID:               sync.LabelID,
			SyncType:              string(sync.SyncType),
			Status:                string(sync.Status),
			MessagesScanned:       sync.MessagesScanned,
			MessagesDownloaded:    sync.MessagesDownloaded,
			MessagesIndexed:       sync.MessagesIndexed,
			MessagesFailed:        sync.MessagesFailed,
			AttachmentsDownloaded: sync.AttachmentsDownloaded,
			BytesTransferred:      sync.BytesTransferred,
			ErrorMessage:          sync.ErrorMessage,
			HistoryID:             sync.HistoryID,
		}
		if sync.StartedAt != nil {
			results[i].StartedAt = *sync.StartedAt
		}
		if sync.CompletedAt != nil {
			results[i].CompletedAt = sync.CompletedAt
		}
	}

	return results, nil
}

// GetActiveSyncs returns currently running syncs
func (s *EmailSyncService) GetActiveSyncs() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	ids := make([]string, 0, len(s.activeSyncs))
	for id := range s.activeSyncs {
		ids = append(ids, id)
	}
	return ids
}

// SyncAllLabels syncs all enabled labels for a connection
func (s *EmailSyncService) SyncAllLabels(ctx context.Context, connectionID string, syncType string) ([]*EmailSyncResult, error) {
	labels, err := s.entClient.EmailLabel.Query().
		Where(
			emaillabel.ConnectionID(connectionID),
			emaillabel.SyncEnabled(true),
		).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("querying labels: %w", err)
	}

	if len(labels) == 0 {
		return nil, ErrNoEmailLabelsToSync
	}

	results := make([]*EmailSyncResult, 0, len(labels))
	for _, label := range labels {
		result, err := s.SyncLabel(ctx, connectionID, label.ID, syncType)
		if err != nil {
			errMsg := err.Error()
			results = append(results, &EmailSyncResult{
				ConnectionID: connectionID,
				LabelID:      &label.ID,
				Status:       "failed",
				ErrorMessage: &errMsg,
			})
			continue
		}
		results = append(results, result)
	}

	return results, nil
}

// SyncAllConnections syncs all active email connections
func (s *EmailSyncService) SyncAllConnections(ctx context.Context, syncType string) ([]*EmailSyncResult, error) {
	connections, err := s.entClient.EmailConnection.Query().
		Where(emailconnection.StatusEQ(emailconnection.StatusActive)).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("querying connections: %w", err)
	}

	results := make([]*EmailSyncResult, 0, len(connections))
	for _, conn := range connections {
		result, err := s.SyncLabel(ctx, conn.ID, "", syncType)
		if err != nil {
			errMsg := err.Error()
			results = append(results, &EmailSyncResult{
				ConnectionID: conn.ID,
				Status:       "failed",
				ErrorMessage: &errMsg,
			})
			continue
		}
		results = append(results, result)
	}

	return results, nil
}

// UpdateSyncProgress updates the progress of a running sync
func (s *EmailSyncService) UpdateSyncProgress(ctx context.Context, syncID string, progress EmailSyncProgress) error {
	_, err := s.entClient.EmailSync.UpdateOneID(syncID).
		SetMessagesScanned(progress.MessagesScanned).
		SetMessagesDownloaded(progress.MessagesProcessed).
		SetAttachmentsDownloaded(progress.AttachmentsDownloaded).
		SetBytesTransferred(progress.BytesTransferred).
		Save(ctx)
	return err
}

// ExtractReceiptsFromLabel extracts receipt emails from a specific label
func (s *EmailSyncService) ExtractReceiptsFromLabel(ctx context.Context, connectionID, labelID string) ([]ExtractedEmailReceipt, error) {
	// Get connection
	connection, err := s.entClient.EmailConnection.Get(ctx, connectionID)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrEmailConnectionNotFound
		}
		return nil, fmt.Errorf("getting connection: %w", err)
	}

	if connection.Status != emailconnection.StatusActive {
		return nil, ErrEmailConnectionInactive
	}

	// Get label
	label, err := s.entClient.EmailLabel.Get(ctx, labelID)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrEmailLabelNotFound
		}
		return nil, fmt.Errorf("getting label: %w", err)
	}

	// Create Gmail client
	oauthClient, err := google.NewClient(s.oauthCfg)
	if err != nil {
		return nil, fmt.Errorf("creating oauth client: %w", err)
	}

	token := &google.Token{
		AccessToken:  connection.AccessToken,
		RefreshToken: connection.RefreshToken,
		Expiry:       connection.TokenExpiry,
	}
	tokenSource := google.NewTokenSource(oauthClient, token)
	gmailClient := google.NewGmailClient(tokenSource)

	// Build a search query for receipts
	queryParts := make([]string, 0, len(s.config.ReceiptKeywords))
	for _, keyword := range s.config.ReceiptKeywords {
		queryParts = append(queryParts, fmt.Sprintf("subject:%s", keyword))
	}
	query := strings.Join(queryParts, " OR ")

	// List messages matching the query
	messageList, err := gmailClient.ListMessages(ctx, google.ListMessagesOptions{
		MaxResults: s.config.BatchSize,
		LabelIDs:   []string{label.ProviderLabelID},
		Query:      query,
	})
	if err != nil {
		return nil, fmt.Errorf("listing messages: %w", err)
	}

	receipts := make([]ExtractedEmailReceipt, 0)
	for _, msgRef := range messageList.Messages {
		fullMessage, err := gmailClient.GetMessageContent(ctx, msgRef.ID)
		if err != nil {
			continue
		}

		attachments := google.GetAttachments(fullMessage)
		if !s.isReceiptEmail(fullMessage, attachments) {
			continue
		}

		subject := ""
		from := ""
		to := ""
		if fullMessage.Payload != nil {
			subject = fullMessage.Payload.GetHeader("Subject")
			from = fullMessage.Payload.GetHeader("From")
			to = fullMessage.Payload.GetHeader("To")
		}
		receivedAt, _ := fullMessage.InternalDateTime()

		var extractedAtts []ExtractedEmailAttachment
		for _, att := range attachments {
			extractedAtts = append(extractedAtts, ExtractedEmailAttachment{
				AttachmentID: att.AttachmentID,
				MessageID:    fullMessage.ID,
				Filename:     att.Filename,
				MimeType:     att.MimeType,
				Size:         att.Size,
				IsReceipt:    s.isReceiptAttachment(att),
			})
		}

		receipts = append(receipts, ExtractedEmailReceipt{
			MessageID:       fullMessage.ID,
			ThreadID:        fullMessage.ThreadID,
			Subject:         subject,
			From:            from,
			To:              to,
			ReceivedAt:      receivedAt,
			Snippet:         fullMessage.Snippet,
			LabelIDs:        fullMessage.LabelIDs,
			HasAttachments:  len(attachments) > 0,
			AttachmentCount: len(attachments),
			Attachments:     extractedAtts,
		})
	}

	return receipts, nil
}

// DownloadAttachment downloads an attachment from a message
func (s *EmailSyncService) DownloadAttachment(ctx context.Context, connectionID, messageID, attachmentID string) ([]byte, *google.AttachmentInfo, error) {
	// Get connection
	connection, err := s.entClient.EmailConnection.Get(ctx, connectionID)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, nil, ErrEmailConnectionNotFound
		}
		return nil, nil, fmt.Errorf("getting connection: %w", err)
	}

	if connection.Status != emailconnection.StatusActive {
		return nil, nil, ErrEmailConnectionInactive
	}

	// Create Gmail client
	oauthClient, err := google.NewClient(s.oauthCfg)
	if err != nil {
		return nil, nil, fmt.Errorf("creating oauth client: %w", err)
	}

	token := &google.Token{
		AccessToken:  connection.AccessToken,
		RefreshToken: connection.RefreshToken,
		Expiry:       connection.TokenExpiry,
	}
	tokenSource := google.NewTokenSource(oauthClient, token)
	gmailClient := google.NewGmailClient(tokenSource)

	// Get message to find attachment metadata
	message, err := gmailClient.GetMessageContent(ctx, messageID)
	if err != nil {
		return nil, nil, fmt.Errorf("getting message: %w", err)
	}

	// Find the attachment info
	attachments := google.GetAttachments(message)
	var attachmentInfo *google.AttachmentInfo
	for _, att := range attachments {
		if att.AttachmentID == attachmentID {
			attachmentInfo = &att
			break
		}
	}

	if attachmentInfo == nil {
		return nil, nil, ErrAttachmentDownloadFail
	}

	// Check size limit
	if int64(attachmentInfo.Size) > s.config.MaxAttachmentSizeBytes {
		return nil, nil, fmt.Errorf("attachment size %d exceeds limit %d", attachmentInfo.Size, s.config.MaxAttachmentSizeBytes)
	}

	// Download the attachment
	data, err := gmailClient.DownloadAttachment(ctx, messageID, attachmentID)
	if err != nil {
		return nil, nil, fmt.Errorf("downloading attachment: %w", err)
	}

	return data, attachmentInfo, nil
}

// isValidEmailSyncType checks if the sync type is valid
func isValidEmailSyncType(syncType string) bool {
	switch syncType {
	case "full", "incremental", "manual":
		return true
	default:
		return false
	}
}

// EmailSyncStatusTracker tracks email sync status updates in real-time
type EmailSyncStatusTracker struct {
	service  *EmailSyncService
	mu       sync.RWMutex
	watchers map[string][]chan EmailSyncProgress
}

// NewEmailSyncStatusTracker creates a new status tracker
func NewEmailSyncStatusTracker(service *EmailSyncService) *EmailSyncStatusTracker {
	return &EmailSyncStatusTracker{
		service:  service,
		watchers: make(map[string][]chan EmailSyncProgress),
	}
}

// Watch registers a channel to receive sync progress updates
func (t *EmailSyncStatusTracker) Watch(syncID string) <-chan EmailSyncProgress {
	t.mu.Lock()
	defer t.mu.Unlock()

	ch := make(chan EmailSyncProgress, 10)
	t.watchers[syncID] = append(t.watchers[syncID], ch)
	return ch
}

// Unwatch removes a watcher channel
func (t *EmailSyncStatusTracker) Unwatch(syncID string, ch <-chan EmailSyncProgress) {
	t.mu.Lock()
	defer t.mu.Unlock()

	watchers := t.watchers[syncID]
	for i, w := range watchers {
		if w == ch {
			t.watchers[syncID] = append(watchers[:i], watchers[i+1:]...)
			close(w)
			break
		}
	}
}

// Notify sends progress update to all watchers
func (t *EmailSyncStatusTracker) Notify(progress EmailSyncProgress) {
	t.mu.RLock()
	watchers := t.watchers[progress.SyncID]
	t.mu.RUnlock()

	for _, ch := range watchers {
		select {
		case ch <- progress:
		default:
			// Channel full, skip this update
		}
	}
}

// CleanupWatchers removes watchers for a completed sync
func (t *EmailSyncStatusTracker) CleanupWatchers(syncID string) {
	t.mu.Lock()
	defer t.mu.Unlock()

	for _, ch := range t.watchers[syncID] {
		close(ch)
	}
	delete(t.watchers, syncID)
}
