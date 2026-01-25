// Package integration provides application-level services for third-party integrations.
package integration

import (
	"context"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"clockzen-next/internal/ent"
	"clockzen-next/internal/ent/googledrivefolder"
	"clockzen-next/internal/ent/googledrivesync"
	"clockzen-next/internal/infrastructure/google"

	"github.com/google/uuid"
)

// Sync service errors
var (
	ErrConnectionNotFound    = errors.New("google drive connection not found")
	ErrConnectionInactive    = errors.New("google drive connection is not active")
	ErrFolderNotFound        = errors.New("folder not found")
	ErrSyncAlreadyRunning    = errors.New("sync is already running for this connection")
	ErrSyncNotFound          = errors.New("sync record not found")
	ErrInvalidSyncType       = errors.New("invalid sync type")
	ErrNoFoldersToSync       = errors.New("no folders configured for sync")
	ErrReceiptExtractionFail = errors.New("receipt extraction failed")
)

// Receipt file extensions that can be extracted
var receiptExtensions = map[string]bool{
	".pdf":  true,
	".png":  true,
	".jpg":  true,
	".jpeg": true,
	".gif":  true,
	".tiff": true,
	".bmp":  true,
	".webp": true,
}

// SyncConfig holds configuration for the sync service
type SyncConfig struct {
	// MaxConcurrentDownloads limits parallel file downloads
	MaxConcurrentDownloads int
	// DownloadTimeout per file
	DownloadTimeout time.Duration
	// MaxFileSizeBytes limits individual file download size
	MaxFileSizeBytes int64
	// EnableReceiptExtraction enables automatic receipt detection
	EnableReceiptExtraction bool
	// ReceiptFolderNames are folder names to scan for receipts
	ReceiptFolderNames []string
}

// DefaultSyncConfig returns sensible default configuration
func DefaultSyncConfig() SyncConfig {
	return SyncConfig{
		MaxConcurrentDownloads:  5,
		DownloadTimeout:         5 * time.Minute,
		MaxFileSizeBytes:        100 * 1024 * 1024, // 100MB
		EnableReceiptExtraction: true,
		ReceiptFolderNames: []string{
			"receipts",
			"Receipts",
			"RECEIPTS",
			"invoices",
			"Invoices",
			"expenses",
			"Expenses",
		},
	}
}

// SyncResult represents the result of a sync operation
type SyncResult struct {
	SyncID           string
	ConnectionID     string
	FolderID         *string
	SyncType         string
	Status           string
	StartedAt        time.Time
	CompletedAt      *time.Time
	FilesScanned     int
	FilesDownloaded  int
	FilesUploaded    int
	FilesDeleted     int
	FilesFailed      int
	BytesTransferred int64
	ErrorMessage     *string
	ChangeToken      *string
	Receipts         []ExtractedReceipt
}

// ExtractedReceipt represents a receipt file extracted during sync
type ExtractedReceipt struct {
	FileID       string
	FileName     string
	FilePath     string
	MimeType     string
	Size         int64
	ModifiedTime time.Time
	FolderID     string
	FolderPath   string
}

// SyncProgress reports real-time sync progress
type SyncProgress struct {
	SyncID           string
	Status           string
	FilesScanned     int
	FilesProcessed   int
	TotalFiles       int
	BytesTransferred int64
	CurrentFile      string
	Errors           []string
}

// SyncProgressCallback is called during sync to report progress
type SyncProgressCallback func(progress SyncProgress)

// DriveSyncService provides Google Drive sync functionality
type DriveSyncService struct {
	config      SyncConfig
	entClient   *ent.Client
	oauthCfg    *google.Config
	mu          sync.RWMutex
	activeSyncs map[string]context.CancelFunc
}

// NewDriveSyncService creates a new drive sync service
func NewDriveSyncService(entClient *ent.Client, oauthCfg *google.Config, config SyncConfig) *DriveSyncService {
	return &DriveSyncService{
		config:      config,
		entClient:   entClient,
		oauthCfg:    oauthCfg,
		activeSyncs: make(map[string]context.CancelFunc),
	}
}

// NewDriveSyncServiceWithDefaults creates a service with default configuration
func NewDriveSyncServiceWithDefaults(entClient *ent.Client, oauthCfg *google.Config) *DriveSyncService {
	return NewDriveSyncService(entClient, oauthCfg, DefaultSyncConfig())
}

// SyncFolder performs a sync operation for a specific folder
func (s *DriveSyncService) SyncFolder(ctx context.Context, connectionID, folderID string, syncType string) (*SyncResult, error) {
	return s.SyncFolderWithProgress(ctx, connectionID, folderID, syncType, nil)
}

// SyncFolderWithProgress performs a sync with progress callback
func (s *DriveSyncService) SyncFolderWithProgress(ctx context.Context, connectionID, folderID string, syncType string, progressCb SyncProgressCallback) (*SyncResult, error) {
	// Validate sync type
	if !isValidSyncType(syncType) {
		return nil, fmt.Errorf("%w: %s", ErrInvalidSyncType, syncType)
	}

	// Check if sync is already running
	s.mu.RLock()
	if _, exists := s.activeSyncs[connectionID]; exists {
		s.mu.RUnlock()
		return nil, ErrSyncAlreadyRunning
	}
	s.mu.RUnlock()

	// Get connection
	connection, err := s.entClient.GoogleDriveConnection.Get(ctx, connectionID)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrConnectionNotFound
		}
		return nil, fmt.Errorf("getting connection: %w", err)
	}

	// Verify connection is active
	if connection.Status != "active" {
		return nil, fmt.Errorf("%w: status is %s", ErrConnectionInactive, connection.Status)
	}

	// Get folder if specified
	var folder *ent.GoogleDriveFolder
	if folderID != "" {
		folder, err = s.entClient.GoogleDriveFolder.Get(ctx, folderID)
		if err != nil {
			if ent.IsNotFound(err) {
				return nil, ErrFolderNotFound
			}
			return nil, fmt.Errorf("getting folder: %w", err)
		}
	}

	// Create sync record
	syncID := uuid.New().String()
	now := time.Now()
	syncRecord, err := s.entClient.GoogleDriveSync.Create().
		SetID(syncID).
		SetConnectionID(connectionID).
		SetNillableFolderID(&folderID).
		SetSyncType(googledrivesync.SyncType(syncType)).
		SetStatus(googledrivesync.StatusRunning).
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

	// Create OAuth token and drive client
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
	driveClient := google.NewDriveClient(tokenSource)

	// Perform the sync based on type
	var result *SyncResult
	switch syncType {
	case "full":
		result, err = s.performFullSync(ctx, driveClient, syncRecord, folder, progressCb)
	case "incremental":
		result, err = s.performIncrementalSync(ctx, driveClient, syncRecord, folder, progressCb)
	case "manual":
		result, err = s.performFullSync(ctx, driveClient, syncRecord, folder, progressCb)
	default:
		return s.failSync(ctx, syncRecord, ErrInvalidSyncType)
	}

	if err != nil {
		return s.failSync(ctx, syncRecord, err)
	}

	// Update connection's last sync time
	_, err = s.entClient.GoogleDriveConnection.UpdateOneID(connectionID).
		SetLastSyncAt(time.Now()).
		Save(ctx)
	if err != nil {
		// Log but don't fail - sync was successful
	}

	return result, nil
}

// performFullSync scans all files in the folder(s)
func (s *DriveSyncService) performFullSync(ctx context.Context, driveClient *google.DriveClient, syncRecord *ent.GoogleDriveSync, folder *ent.GoogleDriveFolder, progressCb SyncProgressCallback) (*SyncResult, error) {
	result := &SyncResult{
		SyncID:       syncRecord.ID,
		ConnectionID: syncRecord.ConnectionID,
		FolderID:     syncRecord.FolderID,
		SyncType:     string(syncRecord.SyncType),
		Status:       "running",
		StartedAt:    *syncRecord.StartedAt,
		Receipts:     make([]ExtractedReceipt, 0),
	}

	var folderIDs []string
	if folder != nil {
		folderIDs = []string{folder.DriveFolderID}
	} else {
		// Get all enabled folders for this connection
		folders, err := s.entClient.GoogleDriveFolder.Query().
			Where(
				googledrivefolder.ConnectionID(syncRecord.ConnectionID),
				googledrivefolder.SyncEnabled(true),
			).
			All(ctx)
		if err != nil {
			return nil, fmt.Errorf("querying folders: %w", err)
		}
		if len(folders) == 0 {
			return nil, ErrNoFoldersToSync
		}
		for _, f := range folders {
			folderIDs = append(folderIDs, f.DriveFolderID)
		}
	}

	// Scan all folders
	for _, fid := range folderIDs {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		err := s.scanFolderRecursive(ctx, driveClient, fid, "", result, progressCb)
		if err != nil {
			result.FilesFailed++
			continue
		}
	}

	// Get a new start page token for future incremental syncs
	startToken, err := driveClient.GetStartPageToken(ctx)
	if err == nil {
		result.ChangeToken = &startToken
	}

	// Complete the sync
	result.Status = "completed"
	now := time.Now()
	result.CompletedAt = &now

	// Update sync record
	_, err = s.entClient.GoogleDriveSync.UpdateOneID(syncRecord.ID).
		SetStatus(googledrivesync.StatusCompleted).
		SetCompletedAt(now).
		SetFilesScanned(result.FilesScanned).
		SetFilesDownloaded(result.FilesDownloaded).
		SetFilesUploaded(result.FilesUploaded).
		SetFilesDeleted(result.FilesDeleted).
		SetFilesFailed(result.FilesFailed).
		SetBytesTransferred(result.BytesTransferred).
		SetNillableChangeToken(result.ChangeToken).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("updating sync record: %w", err)
	}

	return result, nil
}

// performIncrementalSync uses change tokens to sync only changed files
func (s *DriveSyncService) performIncrementalSync(ctx context.Context, driveClient *google.DriveClient, syncRecord *ent.GoogleDriveSync, folder *ent.GoogleDriveFolder, progressCb SyncProgressCallback) (*SyncResult, error) {
	result := &SyncResult{
		SyncID:       syncRecord.ID,
		ConnectionID: syncRecord.ConnectionID,
		FolderID:     syncRecord.FolderID,
		SyncType:     string(syncRecord.SyncType),
		Status:       "running",
		StartedAt:    *syncRecord.StartedAt,
		Receipts:     make([]ExtractedReceipt, 0),
	}

	// Get the last change token from the most recent completed sync
	lastSync, err := s.entClient.GoogleDriveSync.Query().
		Where(
			googledrivesync.ConnectionID(syncRecord.ConnectionID),
			googledrivesync.StatusEQ(googledrivesync.StatusCompleted),
			googledrivesync.ChangeTokenNotNil(),
		).
		Order(ent.Desc(googledrivesync.FieldCompletedAt)).
		First(ctx)

	var pageToken string
	if err != nil || lastSync.ChangeToken == nil {
		// No previous sync or no change token, get a fresh start token
		// This effectively makes it a full sync for tracking purposes
		pageToken, err = driveClient.GetStartPageToken(ctx)
		if err != nil {
			return nil, fmt.Errorf("getting start page token: %w", err)
		}
	} else {
		pageToken = *lastSync.ChangeToken
	}

	// List all changes since the last token
	changes, newToken, err := driveClient.ListChangesAll(ctx, pageToken, google.ListChangesOptions{
		IncludeRemoved:    true,
		RestrictToMyDrive: true,
	})
	if err != nil {
		return nil, fmt.Errorf("listing changes: %w", err)
	}

	// Get folder IDs to filter changes
	var folderIDSet map[string]bool
	if folder != nil {
		folderIDSet = map[string]bool{folder.DriveFolderID: true}
	} else {
		folders, err := s.entClient.GoogleDriveFolder.Query().
			Where(
				googledrivefolder.ConnectionID(syncRecord.ConnectionID),
				googledrivefolder.SyncEnabled(true),
			).
			All(ctx)
		if err != nil {
			return nil, fmt.Errorf("querying folders: %w", err)
		}
		folderIDSet = make(map[string]bool)
		for _, f := range folders {
			folderIDSet[f.DriveFolderID] = true
		}
	}

	// Process changes
	for _, change := range changes {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		result.FilesScanned++

		if change.Removed {
			result.FilesDeleted++
			continue
		}

		if change.File == nil {
			continue
		}

		// Check if file is in a tracked folder
		inTrackedFolder := false
		for _, parentID := range change.File.Parents {
			if folderIDSet[parentID] {
				inTrackedFolder = true
				break
			}
		}
		if !inTrackedFolder {
			continue
		}

		// Skip folders
		if change.File.MimeType == google.MimeTypeFolder {
			continue
		}

		// Check if it's a potential receipt
		if s.config.EnableReceiptExtraction && s.isReceiptFile(change.File) {
			receipt := ExtractedReceipt{
				FileID:       change.File.ID,
				FileName:     change.File.Name,
				MimeType:     change.File.MimeType,
				Size:         change.File.Size,
				ModifiedTime: change.File.ModifiedTime,
			}
			result.Receipts = append(result.Receipts, receipt)
		}

		result.FilesDownloaded++
		result.BytesTransferred += change.File.Size

		// Report progress
		if progressCb != nil {
			progressCb(SyncProgress{
				SyncID:           syncRecord.ID,
				Status:           "running",
				FilesScanned:     result.FilesScanned,
				FilesProcessed:   result.FilesDownloaded,
				TotalFiles:       len(changes),
				BytesTransferred: result.BytesTransferred,
				CurrentFile:      change.File.Name,
			})
		}
	}

	// Update change token
	if newToken != "" {
		result.ChangeToken = &newToken
	}

	// Complete the sync
	result.Status = "completed"
	now := time.Now()
	result.CompletedAt = &now

	// Update sync record
	_, err = s.entClient.GoogleDriveSync.UpdateOneID(syncRecord.ID).
		SetStatus(googledrivesync.StatusCompleted).
		SetCompletedAt(now).
		SetFilesScanned(result.FilesScanned).
		SetFilesDownloaded(result.FilesDownloaded).
		SetFilesUploaded(result.FilesUploaded).
		SetFilesDeleted(result.FilesDeleted).
		SetFilesFailed(result.FilesFailed).
		SetBytesTransferred(result.BytesTransferred).
		SetNillableChangeToken(result.ChangeToken).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("updating sync record: %w", err)
	}

	return result, nil
}

// scanFolderRecursive scans a folder and its subfolders
func (s *DriveSyncService) scanFolderRecursive(ctx context.Context, driveClient *google.DriveClient, folderID, folderPath string, result *SyncResult, progressCb SyncProgressCallback) error {
	files, err := driveClient.ListFolderAll(ctx, folderID, google.ListFilesOptions{
		PageSize: 100,
	})
	if err != nil {
		return fmt.Errorf("listing folder %s: %w", folderID, err)
	}

	for _, file := range files {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		result.FilesScanned++
		filePath := filepath.Join(folderPath, file.Name)

		if file.IsFolder() {
			// Recursively scan subfolders
			err := s.scanFolderRecursive(ctx, driveClient, file.ID, filePath, result, progressCb)
			if err != nil {
				result.FilesFailed++
				continue
			}
		} else {
			// Process file
			result.BytesTransferred += file.Size

			// Check if it's a potential receipt
			if s.config.EnableReceiptExtraction && s.isReceiptFile(&file) {
				receipt := ExtractedReceipt{
					FileID:       file.ID,
					FileName:     file.Name,
					FilePath:     filePath,
					MimeType:     file.MimeType,
					Size:         file.Size,
					ModifiedTime: file.ModifiedTime,
					FolderID:     folderID,
					FolderPath:   folderPath,
				}
				result.Receipts = append(result.Receipts, receipt)
			}

			result.FilesDownloaded++

			// Report progress
			if progressCb != nil {
				progressCb(SyncProgress{
					SyncID:           result.SyncID,
					Status:           "running",
					FilesScanned:     result.FilesScanned,
					FilesProcessed:   result.FilesDownloaded,
					BytesTransferred: result.BytesTransferred,
					CurrentFile:      file.Name,
				})
			}
		}
	}

	return nil
}

// isReceiptFile checks if a file is likely a receipt based on extension and folder
func (s *DriveSyncService) isReceiptFile(file *google.DriveFile) bool {
	if file == nil {
		return false
	}

	// Check file extension
	ext := strings.ToLower(filepath.Ext(file.Name))
	if !receiptExtensions[ext] {
		// Also check for Google Docs formats that export to PDF
		if file.MimeType != google.MimeTypeDocument &&
			file.MimeType != google.MimeTypeSpreadsheet {
			return false
		}
	}

	// Check if file name contains receipt-related keywords
	lowerName := strings.ToLower(file.Name)
	receiptKeywords := []string{"receipt", "invoice", "bill", "expense", "payment", "order"}
	for _, keyword := range receiptKeywords {
		if strings.Contains(lowerName, keyword) {
			return true
		}
	}

	return true // Include all files with receipt-like extensions
}

// failSync marks a sync as failed and returns the error
func (s *DriveSyncService) failSync(ctx context.Context, syncRecord *ent.GoogleDriveSync, err error) (*SyncResult, error) {
	errMsg := err.Error()
	now := time.Now()

	_, updateErr := s.entClient.GoogleDriveSync.UpdateOneID(syncRecord.ID).
		SetStatus(googledrivesync.StatusFailed).
		SetCompletedAt(now).
		SetErrorMessage(errMsg).
		Save(ctx)
	if updateErr != nil {
		return nil, fmt.Errorf("updating failed sync: %w (original error: %v)", updateErr, err)
	}

	return &SyncResult{
		SyncID:       syncRecord.ID,
		ConnectionID: syncRecord.ConnectionID,
		Status:       "failed",
		StartedAt:    *syncRecord.StartedAt,
		CompletedAt:  &now,
		ErrorMessage: &errMsg,
	}, err
}

// CancelSync cancels a running sync operation
func (s *DriveSyncService) CancelSync(connectionID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cancel, exists := s.activeSyncs[connectionID]
	if !exists {
		return ErrSyncNotFound
	}

	cancel()
	delete(s.activeSyncs, connectionID)
	return nil
}

// GetSyncStatus retrieves the status of a sync operation
func (s *DriveSyncService) GetSyncStatus(ctx context.Context, syncID string) (*SyncResult, error) {
	sync, err := s.entClient.GoogleDriveSync.Get(ctx, syncID)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrSyncNotFound
		}
		return nil, fmt.Errorf("getting sync: %w", err)
	}

	result := &SyncResult{
		SyncID:           sync.ID,
		ConnectionID:     sync.ConnectionID,
		FolderID:         sync.FolderID,
		SyncType:         string(sync.SyncType),
		Status:           string(sync.Status),
		FilesScanned:     sync.FilesScanned,
		FilesDownloaded:  sync.FilesDownloaded,
		FilesUploaded:    sync.FilesUploaded,
		FilesDeleted:     sync.FilesDeleted,
		FilesFailed:      sync.FilesFailed,
		BytesTransferred: sync.BytesTransferred,
		ErrorMessage:     sync.ErrorMessage,
		ChangeToken:      sync.ChangeToken,
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
func (s *DriveSyncService) GetSyncHistory(ctx context.Context, connectionID string, limit int) ([]*SyncResult, error) {
	syncs, err := s.entClient.GoogleDriveSync.Query().
		Where(googledrivesync.ConnectionID(connectionID)).
		Order(ent.Desc(googledrivesync.FieldCreatedAt)).
		Limit(limit).
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("querying sync history: %w", err)
	}

	results := make([]*SyncResult, len(syncs))
	for i, sync := range syncs {
		results[i] = &SyncResult{
			SyncID:           sync.ID,
			ConnectionID:     sync.ConnectionID,
			FolderID:         sync.FolderID,
			SyncType:         string(sync.SyncType),
			Status:           string(sync.Status),
			FilesScanned:     sync.FilesScanned,
			FilesDownloaded:  sync.FilesDownloaded,
			FilesUploaded:    sync.FilesUploaded,
			FilesDeleted:     sync.FilesDeleted,
			FilesFailed:      sync.FilesFailed,
			BytesTransferred: sync.BytesTransferred,
			ErrorMessage:     sync.ErrorMessage,
			ChangeToken:      sync.ChangeToken,
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
func (s *DriveSyncService) GetActiveSyncs() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	ids := make([]string, 0, len(s.activeSyncs))
	for id := range s.activeSyncs {
		ids = append(ids, id)
	}
	return ids
}

// ExtractReceiptsFromFolder extracts receipt files from a specific folder
func (s *DriveSyncService) ExtractReceiptsFromFolder(ctx context.Context, connectionID, driveFolderID string) ([]ExtractedReceipt, error) {
	// Get connection
	connection, err := s.entClient.GoogleDriveConnection.Get(ctx, connectionID)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, ErrConnectionNotFound
		}
		return nil, fmt.Errorf("getting connection: %w", err)
	}

	if connection.Status != "active" {
		return nil, ErrConnectionInactive
	}

	// Create drive client
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
	driveClient := google.NewDriveClient(tokenSource)

	// List files in folder
	files, err := driveClient.ListFolderAll(ctx, driveFolderID, google.ListFilesOptions{})
	if err != nil {
		return nil, fmt.Errorf("listing folder: %w", err)
	}

	receipts := make([]ExtractedReceipt, 0)
	for _, file := range files {
		if file.IsFolder() {
			continue
		}
		if s.isReceiptFile(&file) {
			receipts = append(receipts, ExtractedReceipt{
				FileID:       file.ID,
				FileName:     file.Name,
				MimeType:     file.MimeType,
				Size:         file.Size,
				ModifiedTime: file.ModifiedTime,
				FolderID:     driveFolderID,
			})
		}
	}

	return receipts, nil
}

// DownloadReceipt downloads a receipt file's content
func (s *DriveSyncService) DownloadReceipt(ctx context.Context, connectionID, fileID string) (io.ReadCloser, *google.DriveFile, error) {
	// Get connection
	connection, err := s.entClient.GoogleDriveConnection.Get(ctx, connectionID)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, nil, ErrConnectionNotFound
		}
		return nil, nil, fmt.Errorf("getting connection: %w", err)
	}

	if connection.Status != "active" {
		return nil, nil, ErrConnectionInactive
	}

	// Create drive client
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
	driveClient := google.NewDriveClient(tokenSource)

	// Get file metadata
	file, err := driveClient.GetFile(ctx, fileID, "")
	if err != nil {
		return nil, nil, fmt.Errorf("getting file metadata: %w", err)
	}

	// Check file size
	if file.Size > s.config.MaxFileSizeBytes {
		return nil, nil, fmt.Errorf("file size %d exceeds limit %d", file.Size, s.config.MaxFileSizeBytes)
	}

	// Download file
	var reader io.ReadCloser
	if file.IsGoogleDoc() {
		// Export Google Docs to PDF
		reader, err = driveClient.ExportFile(ctx, fileID, google.ExportPDF)
	} else {
		reader, err = driveClient.DownloadFile(ctx, fileID)
	}
	if err != nil {
		return nil, nil, fmt.Errorf("downloading file: %w", err)
	}

	return reader, file, nil
}

// SyncAllConnections syncs all active connections
func (s *DriveSyncService) SyncAllConnections(ctx context.Context, syncType string) ([]*SyncResult, error) {
	connections, err := s.entClient.GoogleDriveConnection.Query().
		Where().
		All(ctx)
	if err != nil {
		return nil, fmt.Errorf("querying connections: %w", err)
	}

	results := make([]*SyncResult, 0, len(connections))
	for _, conn := range connections {
		if conn.Status != "active" {
			continue
		}

		result, err := s.SyncFolder(ctx, conn.ID, "", syncType)
		if err != nil {
			// Record failed sync attempt
			errMsg := err.Error()
			results = append(results, &SyncResult{
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
func (s *DriveSyncService) UpdateSyncProgress(ctx context.Context, syncID string, progress SyncProgress) error {
	_, err := s.entClient.GoogleDriveSync.UpdateOneID(syncID).
		SetFilesScanned(progress.FilesScanned).
		SetFilesDownloaded(progress.FilesProcessed).
		SetBytesTransferred(progress.BytesTransferred).
		Save(ctx)
	return err
}

// isValidSyncType checks if the sync type is valid
func isValidSyncType(syncType string) bool {
	switch syncType {
	case "full", "incremental", "manual":
		return true
	default:
		return false
	}
}

// SyncStatusTracker tracks sync status updates in real-time
type SyncStatusTracker struct {
	service  *DriveSyncService
	mu       sync.RWMutex
	watchers map[string][]chan SyncProgress
}

// NewSyncStatusTracker creates a new status tracker
func NewSyncStatusTracker(service *DriveSyncService) *SyncStatusTracker {
	return &SyncStatusTracker{
		service:  service,
		watchers: make(map[string][]chan SyncProgress),
	}
}

// Watch registers a channel to receive sync progress updates
func (t *SyncStatusTracker) Watch(syncID string) <-chan SyncProgress {
	t.mu.Lock()
	defer t.mu.Unlock()

	ch := make(chan SyncProgress, 10)
	t.watchers[syncID] = append(t.watchers[syncID], ch)
	return ch
}

// Unwatch removes a watcher channel
func (t *SyncStatusTracker) Unwatch(syncID string, ch <-chan SyncProgress) {
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
func (t *SyncStatusTracker) Notify(progress SyncProgress) {
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
func (t *SyncStatusTracker) CleanupWatchers(syncID string) {
	t.mu.Lock()
	defer t.mu.Unlock()

	for _, ch := range t.watchers[syncID] {
		close(ch)
	}
	delete(t.watchers, syncID)
}
