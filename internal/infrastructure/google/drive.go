// Package google provides Google Drive API integration.
package google

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Google Drive API endpoints
const (
	driveAPIBaseURL   = "https://www.googleapis.com/drive/v3"
	driveFilesURL     = driveAPIBaseURL + "/files"
	driveChangesURL   = driveAPIBaseURL + "/changes"
	driveExportURL    = driveAPIBaseURL + "/files/%s/export"
	driveDownloadURL  = driveAPIBaseURL + "/files/%s?alt=media"
	driveStartPageURL = driveChangesURL + "/startPageToken"
)

// Drive-specific errors
var (
	ErrFileNotFound       = errors.New("file not found")
	ErrFolderNotFound     = errors.New("folder not found")
	ErrAccessDenied       = errors.New("access denied")
	ErrQuotaExceeded      = errors.New("quota exceeded")
	ErrInvalidRequest     = errors.New("invalid request")
	ErrDriveAPIError      = errors.New("drive API error")
	ErrUnsupportedExport  = errors.New("unsupported export format")
	ErrDownloadFailed     = errors.New("download failed")
	ErrInvalidPageToken   = errors.New("invalid page token")
	ErrNoChangesStartPage = errors.New("could not obtain changes start page token")
)

// MimeType constants for Google Drive file types
const (
	MimeTypeFolder       = "application/vnd.google-apps.folder"
	MimeTypeDocument     = "application/vnd.google-apps.document"
	MimeTypeSpreadsheet  = "application/vnd.google-apps.spreadsheet"
	MimeTypePresentation = "application/vnd.google-apps.presentation"
	MimeTypeDrawing      = "application/vnd.google-apps.drawing"
	MimeTypeForm         = "application/vnd.google-apps.form"
	MimeTypeSite         = "application/vnd.google-apps.site"
	MimeTypeShortcut     = "application/vnd.google-apps.shortcut"
)

// Export MIME types for Google Docs formats
const (
	ExportPDF  = "application/pdf"
	ExportDocx = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	ExportXlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	ExportPptx = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
	ExportTxt  = "text/plain"
	ExportHTML = "text/html"
	ExportCSV  = "text/csv"
	ExportPNG  = "image/png"
	ExportSVG  = "image/svg+xml"
)

// DriveFile represents a file or folder in Google Drive
type DriveFile struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	MimeType     string            `json:"mimeType"`
	Parents      []string          `json:"parents,omitempty"`
	Size         int64             `json:"size,omitempty,string"`
	CreatedTime  time.Time         `json:"createdTime,omitzero"`
	ModifiedTime time.Time         `json:"modifiedTime,omitzero"`
	Trashed      bool              `json:"trashed,omitempty"`
	Starred      bool              `json:"starred,omitempty"`
	Shared       bool              `json:"shared,omitempty"`
	WebViewLink  string            `json:"webViewLink,omitempty"`
	IconLink     string            `json:"iconLink,omitempty"`
	Owners       []DriveUser       `json:"owners,omitempty"`
	Permissions  []DrivePermission `json:"permissions,omitempty"`
	MD5Checksum  string            `json:"md5Checksum,omitempty"`
	Version      int64             `json:"version,omitempty,string"`
	Properties   map[string]string `json:"properties,omitempty"`
}

// DriveUser represents a user in Google Drive
type DriveUser struct {
	DisplayName  string `json:"displayName"`
	EmailAddress string `json:"emailAddress"`
	PhotoLink    string `json:"photoLink,omitempty"`
}

// DrivePermission represents a permission on a file
type DrivePermission struct {
	ID           string `json:"id"`
	Type         string `json:"type"`
	Role         string `json:"role"`
	EmailAddress string `json:"emailAddress,omitempty"`
	DisplayName  string `json:"displayName,omitempty"`
}

// DriveChange represents a change to a file in Google Drive
type DriveChange struct {
	ChangeType    string     `json:"changeType"`
	FileID        string     `json:"fileId"`
	File          *DriveFile `json:"file,omitempty"`
	Removed       bool       `json:"removed"`
	Time          time.Time  `json:"time"`
	DriveID       string     `json:"driveId,omitempty"`
	Drive         *DriveInfo `json:"drive,omitempty"`
	ChangeKind    string     `json:"kind"`
}

// DriveInfo represents shared drive information
type DriveInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// FileListResponse represents the response from listing files
type FileListResponse struct {
	Files         []DriveFile `json:"files"`
	NextPageToken string      `json:"nextPageToken,omitempty"`
	IncompleteSearch bool     `json:"incompleteSearch,omitempty"`
}

// ChangesListResponse represents the response from listing changes
type ChangesListResponse struct {
	Changes           []DriveChange `json:"changes"`
	NextPageToken     string        `json:"nextPageToken,omitempty"`
	NewStartPageToken string        `json:"newStartPageToken,omitempty"`
}

// StartPageTokenResponse represents the response from getting the start page token
type StartPageTokenResponse struct {
	StartPageToken string `json:"startPageToken"`
}

// driveErrorResponse represents an error from the Drive API
type driveErrorResponse struct {
	Error struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Status  string `json:"status"`
		Errors  []struct {
			Message string `json:"message"`
			Domain  string `json:"domain"`
			Reason  string `json:"reason"`
		} `json:"errors,omitempty"`
	} `json:"error"`
}

// DriveClient provides Google Drive API functionality
type DriveClient struct {
	tokenSource *TokenSource
	httpClient  *http.Client
}

// NewDriveClient creates a new Google Drive client
func NewDriveClient(tokenSource *TokenSource) *DriveClient {
	return &DriveClient{
		tokenSource: tokenSource,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// NewDriveClientWithHTTP creates a new Drive client with a custom HTTP client
func NewDriveClientWithHTTP(tokenSource *TokenSource, httpClient *http.Client) *DriveClient {
	return &DriveClient{
		tokenSource: tokenSource,
		httpClient:  httpClient,
	}
}

// doRequest performs an authenticated request to the Drive API
func (dc *DriveClient) doRequest(ctx context.Context, method, urlStr string, body io.Reader) (*http.Response, error) {
	token, err := dc.tokenSource.Token(ctx)
	if err != nil {
		return nil, fmt.Errorf("getting token: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, method, urlStr, body)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := dc.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}

	return resp, nil
}

// handleError parses and returns an appropriate error from an API response
func (dc *DriveClient) handleError(resp *http.Response) error {
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("%w: status %d, could not read body", ErrDriveAPIError, resp.StatusCode)
	}

	var errResp driveErrorResponse
	if err := json.Unmarshal(body, &errResp); err == nil && errResp.Error.Message != "" {
		switch resp.StatusCode {
		case http.StatusNotFound:
			return fmt.Errorf("%w: %s", ErrFileNotFound, errResp.Error.Message)
		case http.StatusForbidden:
			if strings.Contains(errResp.Error.Message, "quota") {
				return fmt.Errorf("%w: %s", ErrQuotaExceeded, errResp.Error.Message)
			}
			return fmt.Errorf("%w: %s", ErrAccessDenied, errResp.Error.Message)
		case http.StatusBadRequest:
			return fmt.Errorf("%w: %s", ErrInvalidRequest, errResp.Error.Message)
		case http.StatusUnauthorized:
			return fmt.Errorf("%w: %s", ErrTokenExpired, errResp.Error.Message)
		default:
			return fmt.Errorf("%w: %s (status %d)", ErrDriveAPIError, errResp.Error.Message, resp.StatusCode)
		}
	}

	return fmt.Errorf("%w: status %d, body: %s", ErrDriveAPIError, resp.StatusCode, string(body))
}

// ListFilesOptions contains options for listing files
type ListFilesOptions struct {
	PageSize      int
	PageToken     string
	Query         string
	OrderBy       string
	Fields        string
	Spaces        string
	IncludeTrashed bool
}

// DefaultFileFields returns the default fields to request for file listings
func DefaultFileFields() string {
	return "id,name,mimeType,parents,size,createdTime,modifiedTime,trashed,starred,shared,webViewLink,iconLink,md5Checksum,version"
}

// ListFiles lists files in Google Drive based on the provided options
func (dc *DriveClient) ListFiles(ctx context.Context, opts ListFilesOptions) (*FileListResponse, error) {
	params := url.Values{}

	if opts.PageSize > 0 {
		params.Set("pageSize", strconv.Itoa(opts.PageSize))
	} else {
		params.Set("pageSize", "100")
	}

	if opts.PageToken != "" {
		params.Set("pageToken", opts.PageToken)
	}

	if opts.Query != "" {
		params.Set("q", opts.Query)
	}

	if opts.OrderBy != "" {
		params.Set("orderBy", opts.OrderBy)
	}

	fields := opts.Fields
	if fields == "" {
		fields = DefaultFileFields()
	}
	params.Set("fields", fmt.Sprintf("nextPageToken,incompleteSearch,files(%s)", fields))

	if opts.Spaces != "" {
		params.Set("spaces", opts.Spaces)
	}

	if !opts.IncludeTrashed {
		if opts.Query != "" {
			params.Set("q", opts.Query+" and trashed=false")
		} else {
			params.Set("q", "trashed=false")
		}
	}

	resp, err := dc.doRequest(ctx, http.MethodGet, driveFilesURL+"?"+params.Encode(), nil)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, dc.handleError(resp)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	var result FileListResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parsing response: %w", err)
	}

	return &result, nil
}

// ListFolder lists files within a specific folder
func (dc *DriveClient) ListFolder(ctx context.Context, folderID string, opts ListFilesOptions) (*FileListResponse, error) {
	query := fmt.Sprintf("'%s' in parents", folderID)
	if opts.Query != "" {
		opts.Query = query + " and " + opts.Query
	} else {
		opts.Query = query
	}

	return dc.ListFiles(ctx, opts)
}

// ListFolderAll lists all files within a folder, handling pagination automatically
func (dc *DriveClient) ListFolderAll(ctx context.Context, folderID string, opts ListFilesOptions) ([]DriveFile, error) {
	var allFiles []DriveFile
	pageToken := ""

	for {
		opts.PageToken = pageToken
		result, err := dc.ListFolder(ctx, folderID, opts)
		if err != nil {
			return nil, err
		}

		allFiles = append(allFiles, result.Files...)

		if result.NextPageToken == "" {
			break
		}
		pageToken = result.NextPageToken
	}

	return allFiles, nil
}

// GetFile retrieves metadata for a specific file
func (dc *DriveClient) GetFile(ctx context.Context, fileID string, fields string) (*DriveFile, error) {
	params := url.Values{}
	if fields == "" {
		fields = DefaultFileFields()
	}
	params.Set("fields", fields)

	resp, err := dc.doRequest(ctx, http.MethodGet, fmt.Sprintf("%s/%s?%s", driveFilesURL, fileID, params.Encode()), nil)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, dc.handleError(resp)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	var file DriveFile
	if err := json.Unmarshal(body, &file); err != nil {
		return nil, fmt.Errorf("parsing response: %w", err)
	}

	return &file, nil
}

// DownloadFile downloads a file's content from Google Drive
func (dc *DriveClient) DownloadFile(ctx context.Context, fileID string) (io.ReadCloser, error) {
	downloadURL := fmt.Sprintf(driveDownloadURL, fileID)

	resp, err := dc.doRequest(ctx, http.MethodGet, downloadURL, nil)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, dc.handleError(resp)
	}

	return resp.Body, nil
}

// DownloadFileToWriter downloads a file and writes it to the provided writer
func (dc *DriveClient) DownloadFileToWriter(ctx context.Context, fileID string, w io.Writer) (int64, error) {
	reader, err := dc.DownloadFile(ctx, fileID)
	if err != nil {
		return 0, err
	}
	defer reader.Close()

	written, err := io.Copy(w, reader)
	if err != nil {
		return written, fmt.Errorf("%w: %v", ErrDownloadFailed, err)
	}

	return written, nil
}

// ExportFile exports a Google Docs file to a different format
func (dc *DriveClient) ExportFile(ctx context.Context, fileID string, mimeType string) (io.ReadCloser, error) {
	params := url.Values{}
	params.Set("mimeType", mimeType)

	exportURL := fmt.Sprintf(driveExportURL, fileID) + "?" + params.Encode()

	resp, err := dc.doRequest(ctx, http.MethodGet, exportURL, nil)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, dc.handleError(resp)
	}

	return resp.Body, nil
}

// ExportFileToWriter exports a Google Docs file and writes it to the provided writer
func (dc *DriveClient) ExportFileToWriter(ctx context.Context, fileID string, mimeType string, w io.Writer) (int64, error) {
	reader, err := dc.ExportFile(ctx, fileID, mimeType)
	if err != nil {
		return 0, err
	}
	defer reader.Close()

	written, err := io.Copy(w, reader)
	if err != nil {
		return written, fmt.Errorf("%w: %v", ErrDownloadFailed, err)
	}

	return written, nil
}

// IsGoogleDocsFormat returns true if the MIME type is a Google Docs native format
func IsGoogleDocsFormat(mimeType string) bool {
	switch mimeType {
	case MimeTypeDocument, MimeTypeSpreadsheet, MimeTypePresentation, MimeTypeDrawing, MimeTypeForm:
		return true
	default:
		return false
	}
}

// DefaultExportMimeType returns the default export MIME type for a Google Docs format
func DefaultExportMimeType(sourceMimeType string) string {
	switch sourceMimeType {
	case MimeTypeDocument:
		return ExportDocx
	case MimeTypeSpreadsheet:
		return ExportXlsx
	case MimeTypePresentation:
		return ExportPptx
	case MimeTypeDrawing:
		return ExportPNG
	default:
		return ExportPDF
	}
}

// GetStartPageToken gets the initial page token for change tracking
func (dc *DriveClient) GetStartPageToken(ctx context.Context) (string, error) {
	resp, err := dc.doRequest(ctx, http.MethodGet, driveStartPageURL, nil)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", dc.handleError(resp)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("reading response: %w", err)
	}

	var result StartPageTokenResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("parsing response: %w", err)
	}

	if result.StartPageToken == "" {
		return "", ErrNoChangesStartPage
	}

	return result.StartPageToken, nil
}

// ListChangesOptions contains options for listing changes
type ListChangesOptions struct {
	PageSize              int
	PageToken             string
	Fields                string
	Spaces                string
	IncludeRemoved        bool
	IncludeItemsFromAllDrives bool
	RestrictToMyDrive     bool
}

// ListChanges lists changes to files in Google Drive since the given page token
func (dc *DriveClient) ListChanges(ctx context.Context, pageToken string, opts ListChangesOptions) (*ChangesListResponse, error) {
	if pageToken == "" {
		return nil, ErrInvalidPageToken
	}

	params := url.Values{}
	params.Set("pageToken", pageToken)

	if opts.PageSize > 0 {
		params.Set("pageSize", strconv.Itoa(opts.PageSize))
	} else {
		params.Set("pageSize", "100")
	}

	fields := opts.Fields
	if fields == "" {
		fields = DefaultFileFields()
	}
	params.Set("fields", fmt.Sprintf("nextPageToken,newStartPageToken,changes(changeType,fileId,removed,time,driveId,file(%s))", fields))

	if opts.Spaces != "" {
		params.Set("spaces", opts.Spaces)
	}

	if opts.IncludeRemoved {
		params.Set("includeRemoved", "true")
	}

	if opts.IncludeItemsFromAllDrives {
		params.Set("includeItemsFromAllDrives", "true")
		params.Set("supportsAllDrives", "true")
	}

	if opts.RestrictToMyDrive {
		params.Set("restrictToMyDrive", "true")
	}

	resp, err := dc.doRequest(ctx, http.MethodGet, driveChangesURL+"?"+params.Encode(), nil)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, dc.handleError(resp)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	var result ChangesListResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parsing response: %w", err)
	}

	return &result, nil
}

// ListChangesAll lists all changes since the given page token, handling pagination
func (dc *DriveClient) ListChangesAll(ctx context.Context, startPageToken string, opts ListChangesOptions) ([]DriveChange, string, error) {
	var allChanges []DriveChange
	pageToken := startPageToken
	var newStartPageToken string

	for {
		result, err := dc.ListChanges(ctx, pageToken, opts)
		if err != nil {
			return nil, "", err
		}

		allChanges = append(allChanges, result.Changes...)

		if result.NewStartPageToken != "" {
			newStartPageToken = result.NewStartPageToken
			break
		}

		if result.NextPageToken == "" {
			break
		}
		pageToken = result.NextPageToken
	}

	return allChanges, newStartPageToken, nil
}

// ChangeTracker helps track changes over time
type ChangeTracker struct {
	client    *DriveClient
	pageToken string
}

// NewChangeTracker creates a new change tracker
func NewChangeTracker(client *DriveClient) *ChangeTracker {
	return &ChangeTracker{
		client: client,
	}
}

// Initialize gets the initial page token for tracking changes from now
func (ct *ChangeTracker) Initialize(ctx context.Context) error {
	token, err := ct.client.GetStartPageToken(ctx)
	if err != nil {
		return err
	}
	ct.pageToken = token
	return nil
}

// SetPageToken sets the page token manually (for restoring from saved state)
func (ct *ChangeTracker) SetPageToken(token string) {
	ct.pageToken = token
}

// GetPageToken returns the current page token (for saving state)
func (ct *ChangeTracker) GetPageToken() string {
	return ct.pageToken
}

// GetChanges retrieves all changes since the last check and updates the page token
func (ct *ChangeTracker) GetChanges(ctx context.Context, opts ListChangesOptions) ([]DriveChange, error) {
	if ct.pageToken == "" {
		return nil, ErrInvalidPageToken
	}

	changes, newToken, err := ct.client.ListChangesAll(ctx, ct.pageToken, opts)
	if err != nil {
		return nil, err
	}

	if newToken != "" {
		ct.pageToken = newToken
	}

	return changes, nil
}

// FileIterator provides a way to iterate through all files matching a query
type FileIterator struct {
	client   *DriveClient
	opts     ListFilesOptions
	buffer   []DriveFile
	bufIndex int
	done     bool
	ctx      context.Context
}

// NewFileIterator creates a new file iterator
func (dc *DriveClient) NewFileIterator(ctx context.Context, opts ListFilesOptions) *FileIterator {
	return &FileIterator{
		client: dc,
		opts:   opts,
		ctx:    ctx,
	}
}

// Next returns the next file or nil if iteration is complete
func (fi *FileIterator) Next() (*DriveFile, error) {
	if fi.done {
		return nil, nil
	}

	// If buffer is empty or exhausted, fetch more
	if fi.bufIndex >= len(fi.buffer) {
		result, err := fi.client.ListFiles(fi.ctx, fi.opts)
		if err != nil {
			return nil, err
		}

		fi.buffer = result.Files
		fi.bufIndex = 0

		if result.NextPageToken != "" {
			fi.opts.PageToken = result.NextPageToken
		} else {
			fi.done = true
		}

		if len(fi.buffer) == 0 {
			return nil, nil
		}
	}

	file := fi.buffer[fi.bufIndex]
	fi.bufIndex++
	return &file, nil
}

// IsFolder returns true if the file is a folder
func (f *DriveFile) IsFolder() bool {
	return f.MimeType == MimeTypeFolder
}

// IsGoogleDoc returns true if the file is a Google Docs native format
func (f *DriveFile) IsGoogleDoc() bool {
	return IsGoogleDocsFormat(f.MimeType)
}
