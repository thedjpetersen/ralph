// Package google provides Gmail API integration.
package google

import (
	"context"
	"encoding/base64"
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

// Gmail API endpoints
const (
	gmailAPIBaseURL     = "https://www.googleapis.com/gmail/v1"
	gmailUsersURL       = gmailAPIBaseURL + "/users/me"
	gmailMessagesURL    = gmailUsersURL + "/messages"
	gmailLabelsURL      = gmailUsersURL + "/labels"
	gmailHistoryURL     = gmailUsersURL + "/history"
	gmailProfileURL     = gmailUsersURL + "/profile"
	gmailAttachmentURL  = gmailMessagesURL + "/%s/attachments/%s"
)

// Additional Gmail OAuth scopes (main scopes are in oauth.go)
const (
	// ScopeGmailLabels provides access to manage labels
	ScopeGmailLabels = "https://www.googleapis.com/auth/gmail.labels"
	// ScopeGmailMetadata provides read-only access to metadata
	ScopeGmailMetadata = "https://www.googleapis.com/auth/gmail.metadata"
)

// Gmail-specific errors
var (
	ErrMessageNotFound    = errors.New("message not found")
	ErrLabelNotFound      = errors.New("label not found")
	ErrAttachmentNotFound = errors.New("attachment not found")
	ErrInvalidMessageID   = errors.New("invalid message ID")
	ErrInvalidLabelID     = errors.New("invalid label ID")
	ErrGmailAPIError      = errors.New("gmail API error")
	ErrRateLimited        = errors.New("rate limit exceeded")
	ErrInvalidHistoryID   = errors.New("invalid history ID")
)

// GmailLabelType represents the type of a Gmail label
type GmailLabelType string

const (
	LabelTypeSystem   GmailLabelType = "system"
	LabelTypeUser     GmailLabelType = "user"
)

// Common Gmail system label IDs
const (
	LabelInbox     = "INBOX"
	LabelSent      = "SENT"
	LabelDraft     = "DRAFT"
	LabelTrash     = "TRASH"
	LabelSpam      = "SPAM"
	LabelStarred   = "STARRED"
	LabelUnread    = "UNREAD"
	LabelImportant = "IMPORTANT"
)

// GmailProfile represents the user's Gmail profile
type GmailProfile struct {
	EmailAddress  string `json:"emailAddress"`
	MessagesTotal int    `json:"messagesTotal"`
	ThreadsTotal  int    `json:"threadsTotal"`
	HistoryID     string `json:"historyId"`
}

// GmailLabel represents a Gmail label
type GmailLabel struct {
	ID                    string         `json:"id"`
	Name                  string         `json:"name"`
	Type                  GmailLabelType `json:"type"`
	MessageListVisibility string         `json:"messageListVisibility,omitempty"`
	LabelListVisibility   string         `json:"labelListVisibility,omitempty"`
	MessagesTotal         int            `json:"messagesTotal,omitempty"`
	MessagesUnread        int            `json:"messagesUnread,omitempty"`
	ThreadsTotal          int            `json:"threadsTotal,omitempty"`
	ThreadsUnread         int            `json:"threadsUnread,omitempty"`
	Color                 *LabelColor    `json:"color,omitempty"`
}

// LabelColor represents the color configuration of a label
type LabelColor struct {
	TextColor       string `json:"textColor,omitempty"`
	BackgroundColor string `json:"backgroundColor,omitempty"`
}

// GmailMessage represents a Gmail message
type GmailMessage struct {
	ID           string            `json:"id"`
	ThreadID     string            `json:"threadId"`
	LabelIDs     []string          `json:"labelIds,omitempty"`
	Snippet      string            `json:"snippet,omitempty"`
	HistoryID    string            `json:"historyId,omitempty"`
	InternalDate string            `json:"internalDate,omitempty"`
	SizeEstimate int               `json:"sizeEstimate,omitempty"`
	Raw          string            `json:"raw,omitempty"`
	Payload      *MessagePart      `json:"payload,omitempty"`
}

// InternalDateTime returns the internal date as a time.Time
func (m *GmailMessage) InternalDateTime() (time.Time, error) {
	if m.InternalDate == "" {
		return time.Time{}, nil
	}
	ms, err := strconv.ParseInt(m.InternalDate, 10, 64)
	if err != nil {
		return time.Time{}, fmt.Errorf("parsing internal date: %w", err)
	}
	return time.UnixMilli(ms), nil
}

// MessagePart represents a part of a message
type MessagePart struct {
	PartID   string            `json:"partId,omitempty"`
	MimeType string            `json:"mimeType,omitempty"`
	Filename string            `json:"filename,omitempty"`
	Headers  []MessageHeader   `json:"headers,omitempty"`
	Body     *MessagePartBody  `json:"body,omitempty"`
	Parts    []MessagePart     `json:"parts,omitempty"`
}

// GetHeader returns the value of a specific header
func (p *MessagePart) GetHeader(name string) string {
	name = strings.ToLower(name)
	for _, h := range p.Headers {
		if strings.ToLower(h.Name) == name {
			return h.Value
		}
	}
	return ""
}

// MessageHeader represents a message header
type MessageHeader struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// MessagePartBody represents the body of a message part
type MessagePartBody struct {
	AttachmentID string `json:"attachmentId,omitempty"`
	Size         int    `json:"size,omitempty"`
	Data         string `json:"data,omitempty"`
}

// DecodedData returns the base64url decoded body data
func (b *MessagePartBody) DecodedData() ([]byte, error) {
	if b.Data == "" {
		return nil, nil
	}
	return base64.URLEncoding.DecodeString(b.Data)
}

// GmailAttachment represents a message attachment
type GmailAttachment struct {
	Size int    `json:"size"`
	Data string `json:"data"`
}

// DecodedData returns the base64url decoded attachment data
func (a *GmailAttachment) DecodedData() ([]byte, error) {
	if a.Data == "" {
		return nil, nil
	}
	return base64.URLEncoding.DecodeString(a.Data)
}

// MessageListResponse represents the response from listing messages
type MessageListResponse struct {
	Messages           []GmailMessage `json:"messages,omitempty"`
	NextPageToken      string         `json:"nextPageToken,omitempty"`
	ResultSizeEstimate int            `json:"resultSizeEstimate,omitempty"`
}

// LabelListResponse represents the response from listing labels
type LabelListResponse struct {
	Labels []GmailLabel `json:"labels,omitempty"`
}

// HistoryListResponse represents the response from listing history
type HistoryListResponse struct {
	History        []History `json:"history,omitempty"`
	NextPageToken  string    `json:"nextPageToken,omitempty"`
	HistoryID      string    `json:"historyId,omitempty"`
}

// History represents a history record
type History struct {
	ID              string           `json:"id"`
	Messages        []GmailMessage   `json:"messages,omitempty"`
	MessagesAdded   []HistoryMessage `json:"messagesAdded,omitempty"`
	MessagesDeleted []HistoryMessage `json:"messagesDeleted,omitempty"`
	LabelsAdded     []HistoryLabel   `json:"labelsAdded,omitempty"`
	LabelsRemoved   []HistoryLabel   `json:"labelsRemoved,omitempty"`
}

// HistoryMessage represents a message in history
type HistoryMessage struct {
	Message GmailMessage `json:"message"`
}

// HistoryLabel represents a label change in history
type HistoryLabel struct {
	Message  GmailMessage `json:"message"`
	LabelIDs []string     `json:"labelIds"`
}

// gmailErrorResponse represents an error from the Gmail API
type gmailErrorResponse struct {
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

// GmailClient provides Gmail API functionality
type GmailClient struct {
	tokenSource *TokenSource
	httpClient  *http.Client
}

// NewGmailClient creates a new Gmail client
func NewGmailClient(tokenSource *TokenSource) *GmailClient {
	return &GmailClient{
		tokenSource: tokenSource,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// NewGmailClientWithHTTP creates a new Gmail client with a custom HTTP client
func NewGmailClientWithHTTP(tokenSource *TokenSource, httpClient *http.Client) *GmailClient {
	return &GmailClient{
		tokenSource: tokenSource,
		httpClient:  httpClient,
	}
}

// doRequest performs an authenticated request to the Gmail API
func (gc *GmailClient) doRequest(ctx context.Context, method, urlStr string, body io.Reader) (*http.Response, error) {
	token, err := gc.tokenSource.Token(ctx)
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

	resp, err := gc.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}

	return resp, nil
}

// handleError parses and returns an appropriate error from an API response
func (gc *GmailClient) handleError(resp *http.Response) error {
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("%w: status %d, could not read body", ErrGmailAPIError, resp.StatusCode)
	}

	var errResp gmailErrorResponse
	if err := json.Unmarshal(body, &errResp); err == nil && errResp.Error.Message != "" {
		switch resp.StatusCode {
		case http.StatusNotFound:
			if strings.Contains(errResp.Error.Message, "message") || strings.Contains(errResp.Error.Message, "Message") {
				return fmt.Errorf("%w: %s", ErrMessageNotFound, errResp.Error.Message)
			}
			if strings.Contains(errResp.Error.Message, "label") || strings.Contains(errResp.Error.Message, "Label") {
				return fmt.Errorf("%w: %s", ErrLabelNotFound, errResp.Error.Message)
			}
			if strings.Contains(errResp.Error.Message, "attachment") || strings.Contains(errResp.Error.Message, "Attachment") {
				return fmt.Errorf("%w: %s", ErrAttachmentNotFound, errResp.Error.Message)
			}
			return fmt.Errorf("%w: %s", ErrGmailAPIError, errResp.Error.Message)
		case http.StatusForbidden:
			return fmt.Errorf("%w: %s", ErrAccessDenied, errResp.Error.Message)
		case http.StatusBadRequest:
			if strings.Contains(errResp.Error.Message, "historyId") {
				return fmt.Errorf("%w: %s", ErrInvalidHistoryID, errResp.Error.Message)
			}
			return fmt.Errorf("%w: %s", ErrInvalidRequest, errResp.Error.Message)
		case http.StatusUnauthorized:
			return fmt.Errorf("%w: %s", ErrTokenExpired, errResp.Error.Message)
		case http.StatusTooManyRequests:
			return fmt.Errorf("%w: %s", ErrRateLimited, errResp.Error.Message)
		default:
			return fmt.Errorf("%w: %s (status %d)", ErrGmailAPIError, errResp.Error.Message, resp.StatusCode)
		}
	}

	return fmt.Errorf("%w: status %d, body: %s", ErrGmailAPIError, resp.StatusCode, string(body))
}

// GetProfile retrieves the user's Gmail profile
func (gc *GmailClient) GetProfile(ctx context.Context) (*GmailProfile, error) {
	resp, err := gc.doRequest(ctx, http.MethodGet, gmailProfileURL, nil)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, gc.handleError(resp)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	var profile GmailProfile
	if err := json.Unmarshal(body, &profile); err != nil {
		return nil, fmt.Errorf("parsing response: %w", err)
	}

	return &profile, nil
}

// ListLabels lists all labels in the user's mailbox
func (gc *GmailClient) ListLabels(ctx context.Context) ([]GmailLabel, error) {
	resp, err := gc.doRequest(ctx, http.MethodGet, gmailLabelsURL, nil)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, gc.handleError(resp)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	var result LabelListResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parsing response: %w", err)
	}

	return result.Labels, nil
}

// GetLabel retrieves a specific label by ID
func (gc *GmailClient) GetLabel(ctx context.Context, labelID string) (*GmailLabel, error) {
	if labelID == "" {
		return nil, ErrInvalidLabelID
	}

	resp, err := gc.doRequest(ctx, http.MethodGet, gmailLabelsURL+"/"+labelID, nil)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, gc.handleError(resp)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	var label GmailLabel
	if err := json.Unmarshal(body, &label); err != nil {
		return nil, fmt.Errorf("parsing response: %w", err)
	}

	return &label, nil
}

// ListMessagesOptions contains options for listing messages
type ListMessagesOptions struct {
	MaxResults      int
	PageToken       string
	Query           string
	LabelIDs        []string
	IncludeSpamTrash bool
}

// ListMessages lists messages in the user's mailbox
func (gc *GmailClient) ListMessages(ctx context.Context, opts ListMessagesOptions) (*MessageListResponse, error) {
	params := url.Values{}

	if opts.MaxResults > 0 {
		params.Set("maxResults", strconv.Itoa(opts.MaxResults))
	} else {
		params.Set("maxResults", "100")
	}

	if opts.PageToken != "" {
		params.Set("pageToken", opts.PageToken)
	}

	if opts.Query != "" {
		params.Set("q", opts.Query)
	}

	for _, labelID := range opts.LabelIDs {
		params.Add("labelIds", labelID)
	}

	if opts.IncludeSpamTrash {
		params.Set("includeSpamTrash", "true")
	}

	resp, err := gc.doRequest(ctx, http.MethodGet, gmailMessagesURL+"?"+params.Encode(), nil)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, gc.handleError(resp)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	var result MessageListResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parsing response: %w", err)
	}

	return &result, nil
}

// ListMessagesByLabel lists all messages with a specific label
func (gc *GmailClient) ListMessagesByLabel(ctx context.Context, labelID string, opts ListMessagesOptions) (*MessageListResponse, error) {
	if labelID == "" {
		return nil, ErrInvalidLabelID
	}

	opts.LabelIDs = append(opts.LabelIDs, labelID)
	return gc.ListMessages(ctx, opts)
}

// ListAllMessagesByLabel lists all messages with a specific label, handling pagination
func (gc *GmailClient) ListAllMessagesByLabel(ctx context.Context, labelID string, opts ListMessagesOptions) ([]GmailMessage, error) {
	var allMessages []GmailMessage
	pageToken := ""

	for {
		opts.PageToken = pageToken
		result, err := gc.ListMessagesByLabel(ctx, labelID, opts)
		if err != nil {
			return nil, err
		}

		allMessages = append(allMessages, result.Messages...)

		if result.NextPageToken == "" {
			break
		}
		pageToken = result.NextPageToken
	}

	return allMessages, nil
}

// MessageFormat specifies the format for retrieving a message
type MessageFormat string

const (
	// FormatMinimal returns only email message ID and labels
	FormatMinimal MessageFormat = "minimal"
	// FormatFull returns full email message data with body content
	FormatFull MessageFormat = "full"
	// FormatRaw returns the full email message data in RFC 2822 format
	FormatRaw MessageFormat = "raw"
	// FormatMetadata returns only email message metadata
	FormatMetadata MessageFormat = "metadata"
)

// GetMessageOptions contains options for getting a message
type GetMessageOptions struct {
	Format         MessageFormat
	MetadataHeaders []string
}

// GetMessage retrieves a specific message by ID
func (gc *GmailClient) GetMessage(ctx context.Context, messageID string, opts GetMessageOptions) (*GmailMessage, error) {
	if messageID == "" {
		return nil, ErrInvalidMessageID
	}

	params := url.Values{}

	if opts.Format != "" {
		params.Set("format", string(opts.Format))
	} else {
		params.Set("format", string(FormatFull))
	}

	for _, header := range opts.MetadataHeaders {
		params.Add("metadataHeaders", header)
	}

	resp, err := gc.doRequest(ctx, http.MethodGet, gmailMessagesURL+"/"+messageID+"?"+params.Encode(), nil)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, gc.handleError(resp)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	var message GmailMessage
	if err := json.Unmarshal(body, &message); err != nil {
		return nil, fmt.Errorf("parsing response: %w", err)
	}

	return &message, nil
}

// GetMessageContent retrieves the full content of a message
func (gc *GmailClient) GetMessageContent(ctx context.Context, messageID string) (*GmailMessage, error) {
	return gc.GetMessage(ctx, messageID, GetMessageOptions{Format: FormatFull})
}

// GetMessageRaw retrieves the raw RFC 2822 format of a message
func (gc *GmailClient) GetMessageRaw(ctx context.Context, messageID string) (*GmailMessage, error) {
	return gc.GetMessage(ctx, messageID, GetMessageOptions{Format: FormatRaw})
}

// GetMessageMetadata retrieves only the metadata of a message
func (gc *GmailClient) GetMessageMetadata(ctx context.Context, messageID string, headers []string) (*GmailMessage, error) {
	return gc.GetMessage(ctx, messageID, GetMessageOptions{
		Format:          FormatMetadata,
		MetadataHeaders: headers,
	})
}

// GetAttachment retrieves an attachment from a message
func (gc *GmailClient) GetAttachment(ctx context.Context, messageID, attachmentID string) (*GmailAttachment, error) {
	if messageID == "" {
		return nil, ErrInvalidMessageID
	}
	if attachmentID == "" {
		return nil, ErrAttachmentNotFound
	}

	attachmentURL := fmt.Sprintf(gmailAttachmentURL, messageID, attachmentID)

	resp, err := gc.doRequest(ctx, http.MethodGet, attachmentURL, nil)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, gc.handleError(resp)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	var attachment GmailAttachment
	if err := json.Unmarshal(body, &attachment); err != nil {
		return nil, fmt.Errorf("parsing response: %w", err)
	}

	return &attachment, nil
}

// DownloadAttachment downloads and decodes an attachment
func (gc *GmailClient) DownloadAttachment(ctx context.Context, messageID, attachmentID string) ([]byte, error) {
	attachment, err := gc.GetAttachment(ctx, messageID, attachmentID)
	if err != nil {
		return nil, err
	}

	return attachment.DecodedData()
}

// DownloadAttachmentToWriter downloads an attachment and writes it to the provided writer
func (gc *GmailClient) DownloadAttachmentToWriter(ctx context.Context, messageID, attachmentID string, w io.Writer) (int64, error) {
	data, err := gc.DownloadAttachment(ctx, messageID, attachmentID)
	if err != nil {
		return 0, err
	}

	written, err := w.Write(data)
	if err != nil {
		return int64(written), fmt.Errorf("writing attachment: %w", err)
	}

	return int64(written), nil
}

// ListHistoryOptions contains options for listing history
type ListHistoryOptions struct {
	MaxResults       int
	PageToken        string
	LabelID          string
	HistoryTypes     []string
}

// ListHistory lists the history of changes to the mailbox
func (gc *GmailClient) ListHistory(ctx context.Context, startHistoryID string, opts ListHistoryOptions) (*HistoryListResponse, error) {
	if startHistoryID == "" {
		return nil, ErrInvalidHistoryID
	}

	params := url.Values{}
	params.Set("startHistoryId", startHistoryID)

	if opts.MaxResults > 0 {
		params.Set("maxResults", strconv.Itoa(opts.MaxResults))
	}

	if opts.PageToken != "" {
		params.Set("pageToken", opts.PageToken)
	}

	if opts.LabelID != "" {
		params.Set("labelId", opts.LabelID)
	}

	for _, historyType := range opts.HistoryTypes {
		params.Add("historyTypes", historyType)
	}

	resp, err := gc.doRequest(ctx, http.MethodGet, gmailHistoryURL+"?"+params.Encode(), nil)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, gc.handleError(resp)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	var result HistoryListResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parsing response: %w", err)
	}

	return &result, nil
}

// ListAllHistory lists all history since the given history ID, handling pagination
func (gc *GmailClient) ListAllHistory(ctx context.Context, startHistoryID string, opts ListHistoryOptions) ([]History, string, error) {
	var allHistory []History
	pageToken := ""
	var latestHistoryID string

	for {
		opts.PageToken = pageToken
		result, err := gc.ListHistory(ctx, startHistoryID, opts)
		if err != nil {
			return nil, "", err
		}

		allHistory = append(allHistory, result.History...)
		latestHistoryID = result.HistoryID

		if result.NextPageToken == "" {
			break
		}
		pageToken = result.NextPageToken
	}

	return allHistory, latestHistoryID, nil
}

// MessageIterator provides a way to iterate through all messages
type MessageIterator struct {
	client   *GmailClient
	opts     ListMessagesOptions
	buffer   []GmailMessage
	bufIndex int
	done     bool
	ctx      context.Context
}

// NewMessageIterator creates a new message iterator
func (gc *GmailClient) NewMessageIterator(ctx context.Context, opts ListMessagesOptions) *MessageIterator {
	return &MessageIterator{
		client: gc,
		opts:   opts,
		ctx:    ctx,
	}
}

// Next returns the next message ID or nil if iteration is complete
func (mi *MessageIterator) Next() (*GmailMessage, error) {
	if mi.done {
		return nil, nil
	}

	// If buffer is empty or exhausted, fetch more
	if mi.bufIndex >= len(mi.buffer) {
		result, err := mi.client.ListMessages(mi.ctx, mi.opts)
		if err != nil {
			return nil, err
		}

		mi.buffer = result.Messages
		mi.bufIndex = 0

		if result.NextPageToken != "" {
			mi.opts.PageToken = result.NextPageToken
		} else {
			mi.done = true
		}

		if len(mi.buffer) == 0 {
			return nil, nil
		}
	}

	message := mi.buffer[mi.bufIndex]
	mi.bufIndex++
	return &message, nil
}

// AttachmentInfo contains information about a message attachment
type AttachmentInfo struct {
	AttachmentID string
	Filename     string
	MimeType     string
	Size         int
}

// GetAttachments extracts attachment information from a message
func GetAttachments(message *GmailMessage) []AttachmentInfo {
	var attachments []AttachmentInfo
	if message.Payload != nil {
		extractAttachments(message.Payload, &attachments)
	}
	return attachments
}

// extractAttachments recursively extracts attachments from message parts
func extractAttachments(part *MessagePart, attachments *[]AttachmentInfo) {
	if part.Body != nil && part.Body.AttachmentID != "" {
		*attachments = append(*attachments, AttachmentInfo{
			AttachmentID: part.Body.AttachmentID,
			Filename:     part.Filename,
			MimeType:     part.MimeType,
			Size:         part.Body.Size,
		})
	}

	for i := range part.Parts {
		extractAttachments(&part.Parts[i], attachments)
	}
}

// GetMessageBody extracts the body content from a message
func GetMessageBody(message *GmailMessage) (text string, html string, err error) {
	if message.Payload == nil {
		return "", "", nil
	}
	return extractBody(message.Payload)
}

// extractBody recursively extracts text and HTML body from message parts
func extractBody(part *MessagePart) (text string, html string, err error) {
	// Direct body content
	if part.Body != nil && part.Body.Data != "" {
		decoded, err := part.Body.DecodedData()
		if err != nil {
			return "", "", err
		}

		switch part.MimeType {
		case "text/plain":
			return string(decoded), "", nil
		case "text/html":
			return "", string(decoded), nil
		}
	}

	// Check nested parts
	var textContent, htmlContent string
	for i := range part.Parts {
		t, h, err := extractBody(&part.Parts[i])
		if err != nil {
			return "", "", err
		}
		if t != "" {
			textContent = t
		}
		if h != "" {
			htmlContent = h
		}
	}

	return textContent, htmlContent, nil
}

// GmailScopes returns scopes needed for Gmail integration (read-only)
func GmailScopes() []string {
	return []string{
		ScopeOpenID,
		ScopeProfile,
		ScopeEmail,
		ScopeGmailReadOnly,
	}
}

// GmailFullScopes returns full Gmail access scopes
func GmailFullScopes() []string {
	return []string{
		ScopeOpenID,
		ScopeProfile,
		ScopeEmail,
		ScopeGmailFull,
	}
}
