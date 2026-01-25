package admin

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
)

// StoreStatus represents the status of a store
type StoreStatus string

const (
	StoreStatusActive   StoreStatus = "active"
	StoreStatusInactive StoreStatus = "inactive"
	StoreStatusPending  StoreStatus = "pending"
	StoreStatusRejected StoreStatus = "rejected"
)

// StoreType represents the type of store
type StoreType string

const (
	StoreTypeRetail      StoreType = "retail"
	StoreTypeOnline      StoreType = "online"
	StoreTypeRestaurant  StoreType = "restaurant"
	StoreTypeGrocery     StoreType = "grocery"
	StoreTypeGas         StoreType = "gas"
	StoreTypeService     StoreType = "service"
	StoreTypeOther       StoreType = "other"
)

// Store represents a merchant/store in the system
type Store struct {
	ID              string            `json:"id"`
	Name            string            `json:"name"`
	NormalizedName  string            `json:"normalized_name"`
	DisplayName     string            `json:"display_name,omitempty"`
	Type            StoreType         `json:"type"`
	Status          StoreStatus       `json:"status"`
	Description     string            `json:"description,omitempty"`
	Website         string            `json:"website,omitempty"`
	Phone           string            `json:"phone,omitempty"`
	Email           string            `json:"email,omitempty"`
	Address         *StoreAddress     `json:"address,omitempty"`
	Logo            string            `json:"logo,omitempty"`
	CategoryID      string            `json:"category_id,omitempty"`
	Tags            []string          `json:"tags,omitempty"`
	Aliases         []string          `json:"aliases,omitempty"`
	Metadata        map[string]string `json:"metadata,omitempty"`
	ReceiptPatterns []string          `json:"receipt_patterns,omitempty"`
	MatchCount      int               `json:"match_count"`
	MergeCount      int               `json:"merge_count"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
	CreatedBy       string            `json:"created_by,omitempty"`
	UpdatedBy       string            `json:"updated_by,omitempty"`
}

// StoreAddress represents a store's physical address
type StoreAddress struct {
	Street1    string   `json:"street1,omitempty"`
	Street2    string   `json:"street2,omitempty"`
	City       string   `json:"city,omitempty"`
	State      string   `json:"state,omitempty"`
	PostalCode string   `json:"postal_code,omitempty"`
	Country    string   `json:"country,omitempty"`
	Latitude   *float64 `json:"latitude,omitempty"`
	Longitude  *float64 `json:"longitude,omitempty"`
}

// StoreStats represents statistics for stores
type StoreStats struct {
	TotalStores       int            `json:"total_stores"`
	ActiveStores      int            `json:"active_stores"`
	InactiveStores    int            `json:"inactive_stores"`
	PendingStores     int            `json:"pending_stores"`
	TypeBreakdown     map[string]int `json:"type_breakdown"`
	CategoryBreakdown map[string]int `json:"category_breakdown"`
	TopStores         []*Store       `json:"top_stores"`
	RecentlyAdded     []*Store       `json:"recently_added"`
}

// ListStoresResponse represents a list of stores
type ListStoresResponse struct {
	Stores []*Store `json:"stores"`
	Total  int      `json:"total"`
}

// CreateStoreRequest represents a request to create a store
type CreateStoreRequest struct {
	Name            string            `json:"name"`
	DisplayName     string            `json:"display_name,omitempty"`
	Type            StoreType         `json:"type"`
	Description     string            `json:"description,omitempty"`
	Website         string            `json:"website,omitempty"`
	Phone           string            `json:"phone,omitempty"`
	Email           string            `json:"email,omitempty"`
	Address         *StoreAddress     `json:"address,omitempty"`
	Logo            string            `json:"logo,omitempty"`
	CategoryID      string            `json:"category_id,omitempty"`
	Tags            []string          `json:"tags,omitempty"`
	Aliases         []string          `json:"aliases,omitempty"`
	Metadata        map[string]string `json:"metadata,omitempty"`
	ReceiptPatterns []string          `json:"receipt_patterns,omitempty"`
}

// UpdateStoreRequest represents a request to update a store
type UpdateStoreRequest struct {
	Name            *string            `json:"name,omitempty"`
	DisplayName     *string            `json:"display_name,omitempty"`
	Type            *StoreType         `json:"type,omitempty"`
	Status          *StoreStatus       `json:"status,omitempty"`
	Description     *string            `json:"description,omitempty"`
	Website         *string            `json:"website,omitempty"`
	Phone           *string            `json:"phone,omitempty"`
	Email           *string            `json:"email,omitempty"`
	Address         *StoreAddress      `json:"address,omitempty"`
	Logo            *string            `json:"logo,omitempty"`
	CategoryID      *string            `json:"category_id,omitempty"`
	Tags            []string           `json:"tags,omitempty"`
	Aliases         []string           `json:"aliases,omitempty"`
	Metadata        map[string]string  `json:"metadata,omitempty"`
	ReceiptPatterns []string           `json:"receipt_patterns,omitempty"`
}

// BulkStoresRequest represents a request for bulk store operations
type BulkStoresRequest struct {
	Stores []CreateStoreRequest `json:"stores"`
}

// BulkStoresResponse represents the response for bulk store operations
type BulkStoresResponse struct {
	Stores      []*Store `json:"stores"`
	TotalStores int      `json:"total_stores"`
	Created     int      `json:"created"`
	Failed      int      `json:"failed"`
	Errors      []string `json:"errors,omitempty"`
}

// MergeStoresRequest represents a request to merge stores
type MergeStoresRequest struct {
	SourceIDs  []string `json:"source_ids"`
	TargetID   string   `json:"target_id,omitempty"`
	TargetData *Store   `json:"target_data,omitempty"`
}

// MergeStoresResponse represents the response for merging stores
type MergeStoresResponse struct {
	MergedStore    *Store   `json:"merged_store"`
	SourcesMerged  int      `json:"sources_merged"`
	ReceiptsMoved  int      `json:"receipts_moved"`
	PatternsMerged int      `json:"patterns_merged"`
}

// StoreSearchRequest represents a store search request
type StoreSearchRequest struct {
	Query      string     `json:"query"`
	Type       *StoreType `json:"type,omitempty"`
	CategoryID string     `json:"category_id,omitempty"`
	Status     *StoreStatus `json:"status,omitempty"`
	Limit      int        `json:"limit,omitempty"`
}

// StoreHandler handles HTTP requests for admin store management
type StoreHandler struct {
	mu     sync.RWMutex
	stores map[string]*Store
	stats  *StoreStats
}

// NewStoreHandler creates a new StoreHandler instance
func NewStoreHandler() *StoreHandler {
	return &StoreHandler{
		stores: make(map[string]*Store),
		stats: &StoreStats{
			TypeBreakdown:     make(map[string]int),
			CategoryBreakdown: make(map[string]int),
			TopStores:         []*Store{},
			RecentlyAdded:     []*Store{},
		},
	}
}

// HandleList handles GET /api/admin/stores
func (h *StoreHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	// Get optional filters
	status := r.URL.Query().Get("status")
	storeType := r.URL.Query().Get("type")
	categoryID := r.URL.Query().Get("category_id")

	h.mu.RLock()
	stores := make([]*Store, 0)
	for _, store := range h.stores {
		if status != "" && string(store.Status) != status {
			continue
		}
		if storeType != "" && string(store.Type) != storeType {
			continue
		}
		if categoryID != "" && store.CategoryID != categoryID {
			continue
		}
		stores = append(stores, store)
	}
	h.mu.RUnlock()

	resp := ListStoresResponse{
		Stores: stores,
		Total:  len(stores),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleGet handles GET /api/admin/stores/{id}
func (h *StoreHandler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	store, exists := h.stores[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Store not found")
		return
	}

	h.writeJSON(w, http.StatusOK, store)
}

// HandleCreate handles POST /api/admin/stores
func (h *StoreHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req CreateStoreRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.Name == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "name is required")
		return
	}
	if req.Type == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "type is required")
		return
	}

	// Check for duplicate name
	normalizedName := normalizeStoreName(req.Name)
	h.mu.RLock()
	for _, s := range h.stores {
		if s.NormalizedName == normalizedName {
			h.mu.RUnlock()
			h.writeError(w, http.StatusConflict, "conflict", "Store with this name already exists")
			return
		}
	}
	h.mu.RUnlock()

	now := time.Now()
	store := &Store{
		ID:              uuid.New().String(),
		Name:            req.Name,
		NormalizedName:  normalizedName,
		DisplayName:     req.DisplayName,
		Type:            req.Type,
		Status:          StoreStatusPending,
		Description:     req.Description,
		Website:         req.Website,
		Phone:           req.Phone,
		Email:           req.Email,
		Address:         req.Address,
		Logo:            req.Logo,
		CategoryID:      req.CategoryID,
		Tags:            req.Tags,
		Aliases:         req.Aliases,
		Metadata:        req.Metadata,
		ReceiptPatterns: req.ReceiptPatterns,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	h.mu.Lock()
	h.stores[store.ID] = store
	h.updateStats()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusCreated, store)
}

// HandleUpdate handles PUT/PATCH /api/admin/stores/{id}
func (h *StoreHandler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req UpdateStoreRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	store, exists := h.stores[id]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Store not found")
		return
	}

	// Check for duplicate name if changing name
	if req.Name != nil && *req.Name != store.Name {
		normalizedName := normalizeStoreName(*req.Name)
		for _, s := range h.stores {
			if s.ID != id && s.NormalizedName == normalizedName {
				h.writeError(w, http.StatusConflict, "conflict", "Store with this name already exists")
				return
			}
		}
		store.Name = *req.Name
		store.NormalizedName = normalizedName
	}

	if req.DisplayName != nil {
		store.DisplayName = *req.DisplayName
	}
	if req.Type != nil {
		store.Type = *req.Type
	}
	if req.Status != nil {
		store.Status = *req.Status
	}
	if req.Description != nil {
		store.Description = *req.Description
	}
	if req.Website != nil {
		store.Website = *req.Website
	}
	if req.Phone != nil {
		store.Phone = *req.Phone
	}
	if req.Email != nil {
		store.Email = *req.Email
	}
	if req.Address != nil {
		store.Address = req.Address
	}
	if req.Logo != nil {
		store.Logo = *req.Logo
	}
	if req.CategoryID != nil {
		store.CategoryID = *req.CategoryID
	}
	if req.Tags != nil {
		store.Tags = req.Tags
	}
	if req.Aliases != nil {
		store.Aliases = req.Aliases
	}
	if req.Metadata != nil {
		store.Metadata = req.Metadata
	}
	if req.ReceiptPatterns != nil {
		store.ReceiptPatterns = req.ReceiptPatterns
	}

	store.UpdatedAt = time.Now()
	h.updateStats()

	h.writeJSON(w, http.StatusOK, store)
}

// HandleDelete handles DELETE /api/admin/stores/{id}
func (h *StoreHandler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	_, exists := h.stores[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Store not found")
		return
	}
	delete(h.stores, id)
	h.updateStats()
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// HandleBulkCreate handles POST /api/admin/stores/bulk
func (h *StoreHandler) HandleBulkCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req BulkStoresRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if len(req.Stores) == 0 {
		h.writeError(w, http.StatusBadRequest, "validation_error", "stores is required")
		return
	}

	if len(req.Stores) > 100 {
		h.writeError(w, http.StatusBadRequest, "validation_error", "maximum 100 stores per bulk request")
		return
	}

	stores := make([]*Store, 0, len(req.Stores))
	created := 0
	failed := 0
	errors := make([]string, 0)
	now := time.Now()

	h.mu.Lock()
	for i, storeReq := range req.Stores {
		if storeReq.Name == "" || storeReq.Type == "" {
			failed++
			errors = append(errors, "store at index "+string(rune('0'+i))+": name and type are required")
			continue
		}

		normalizedName := normalizeStoreName(storeReq.Name)
		duplicate := false
		for _, s := range h.stores {
			if s.NormalizedName == normalizedName {
				duplicate = true
				break
			}
		}
		if duplicate {
			failed++
			errors = append(errors, "store at index "+string(rune('0'+i))+": duplicate name")
			continue
		}

		store := &Store{
			ID:              uuid.New().String(),
			Name:            storeReq.Name,
			NormalizedName:  normalizedName,
			DisplayName:     storeReq.DisplayName,
			Type:            storeReq.Type,
			Status:          StoreStatusPending,
			Description:     storeReq.Description,
			Website:         storeReq.Website,
			Phone:           storeReq.Phone,
			Email:           storeReq.Email,
			Address:         storeReq.Address,
			Logo:            storeReq.Logo,
			CategoryID:      storeReq.CategoryID,
			Tags:            storeReq.Tags,
			Aliases:         storeReq.Aliases,
			Metadata:        storeReq.Metadata,
			ReceiptPatterns: storeReq.ReceiptPatterns,
			CreatedAt:       now,
			UpdatedAt:       now,
		}

		h.stores[store.ID] = store
		stores = append(stores, store)
		created++
	}
	h.updateStats()
	h.mu.Unlock()

	resp := BulkStoresResponse{
		Stores:      stores,
		TotalStores: len(req.Stores),
		Created:     created,
		Failed:      failed,
		Errors:      errors,
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleMerge handles POST /api/admin/stores/merge
func (h *StoreHandler) HandleMerge(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req MergeStoresRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if len(req.SourceIDs) < 2 {
		h.writeError(w, http.StatusBadRequest, "validation_error", "at least 2 source_ids are required")
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	// Verify all source stores exist
	sourceStores := make([]*Store, 0, len(req.SourceIDs))
	for _, id := range req.SourceIDs {
		store, exists := h.stores[id]
		if !exists {
			h.writeError(w, http.StatusNotFound, "not_found", "Store not found: "+id)
			return
		}
		sourceStores = append(sourceStores, store)
	}

	// Determine target store
	var targetStore *Store
	if req.TargetID != "" {
		var exists bool
		targetStore, exists = h.stores[req.TargetID]
		if !exists {
			h.writeError(w, http.StatusNotFound, "not_found", "Target store not found")
			return
		}
	} else if req.TargetData != nil {
		targetStore = req.TargetData
		targetStore.ID = uuid.New().String()
		targetStore.CreatedAt = time.Now()
	} else {
		// Use first source as target
		targetStore = sourceStores[0]
	}

	// Merge aliases and patterns from all sources
	aliasSet := make(map[string]bool)
	patternSet := make(map[string]bool)
	totalMatchCount := 0

	for _, store := range sourceStores {
		for _, alias := range store.Aliases {
			aliasSet[alias] = true
		}
		aliasSet[store.Name] = true
		for _, pattern := range store.ReceiptPatterns {
			patternSet[pattern] = true
		}
		totalMatchCount += store.MatchCount
	}

	aliases := make([]string, 0, len(aliasSet))
	for alias := range aliasSet {
		if alias != targetStore.Name {
			aliases = append(aliases, alias)
		}
	}

	patterns := make([]string, 0, len(patternSet))
	for pattern := range patternSet {
		patterns = append(patterns, pattern)
	}

	targetStore.Aliases = aliases
	targetStore.ReceiptPatterns = patterns
	targetStore.MatchCount = totalMatchCount
	targetStore.MergeCount++
	targetStore.UpdatedAt = time.Now()

	// Delete source stores (except target if it was a source)
	for _, id := range req.SourceIDs {
		if id != targetStore.ID {
			delete(h.stores, id)
		}
	}

	// Add/update target store
	h.stores[targetStore.ID] = targetStore
	h.updateStats()

	resp := MergeStoresResponse{
		MergedStore:    targetStore,
		SourcesMerged:  len(req.SourceIDs),
		ReceiptsMoved:  0, // Would be actual count in production
		PatternsMerged: len(patterns),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleActivate handles POST /api/admin/stores/{id}/activate
func (h *StoreHandler) HandleActivate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.Lock()
	store, exists := h.stores[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Store not found")
		return
	}

	if store.Status == StoreStatusActive {
		h.mu.Unlock()
		h.writeError(w, http.StatusConflict, "conflict", "Store is already active")
		return
	}

	store.Status = StoreStatusActive
	store.UpdatedAt = time.Now()
	h.updateStats()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, store)
}

// HandleDeactivate handles POST /api/admin/stores/{id}/deactivate
func (h *StoreHandler) HandleDeactivate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.Lock()
	store, exists := h.stores[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Store not found")
		return
	}

	if store.Status == StoreStatusInactive {
		h.mu.Unlock()
		h.writeError(w, http.StatusConflict, "conflict", "Store is already inactive")
		return
	}

	store.Status = StoreStatusInactive
	store.UpdatedAt = time.Now()
	h.updateStats()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, store)
}

// HandleSearch handles POST /api/admin/stores/search
func (h *StoreHandler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req StoreSearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	limit := 20
	if req.Limit > 0 && req.Limit <= 100 {
		limit = req.Limit
	}

	h.mu.RLock()
	stores := make([]*Store, 0)
	for _, store := range h.stores {
		if req.Query != "" && !storeMatchesQuery(store, req.Query) {
			continue
		}
		if req.Type != nil && store.Type != *req.Type {
			continue
		}
		if req.CategoryID != "" && store.CategoryID != req.CategoryID {
			continue
		}
		if req.Status != nil && store.Status != *req.Status {
			continue
		}
		stores = append(stores, store)
		if len(stores) >= limit {
			break
		}
	}
	h.mu.RUnlock()

	resp := ListStoresResponse{
		Stores: stores,
		Total:  len(stores),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleGetStats handles GET /api/admin/stores/stats
func (h *StoreHandler) HandleGetStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	stats := *h.stats
	h.mu.RUnlock()

	h.writeJSON(w, http.StatusOK, stats)
}

// updateStats recalculates store statistics
// Must be called with mutex held
func (h *StoreHandler) updateStats() {
	h.stats.TotalStores = len(h.stores)
	h.stats.ActiveStores = 0
	h.stats.InactiveStores = 0
	h.stats.PendingStores = 0
	h.stats.TypeBreakdown = make(map[string]int)
	h.stats.CategoryBreakdown = make(map[string]int)

	for _, store := range h.stores {
		switch store.Status {
		case StoreStatusActive:
			h.stats.ActiveStores++
		case StoreStatusInactive:
			h.stats.InactiveStores++
		case StoreStatusPending:
			h.stats.PendingStores++
		}
		h.stats.TypeBreakdown[string(store.Type)]++
		if store.CategoryID != "" {
			h.stats.CategoryBreakdown[store.CategoryID]++
		}
	}
}

// normalizeStoreName normalizes a store name for comparison
func normalizeStoreName(name string) string {
	// Simple normalization - in production would be more sophisticated
	result := ""
	for _, c := range name {
		if c >= 'A' && c <= 'Z' {
			result += string(c - 'A' + 'a')
		} else if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') {
			result += string(c)
		}
	}
	return result
}

// storeMatchesQuery checks if a store matches a search query
func storeMatchesQuery(store *Store, query string) bool {
	normalizedQuery := normalizeStoreName(query)
	if containsNormalized(store.NormalizedName, normalizedQuery) {
		return true
	}
	if containsNormalized(store.DisplayName, normalizedQuery) {
		return true
	}
	for _, alias := range store.Aliases {
		if containsNormalized(alias, normalizedQuery) {
			return true
		}
	}
	return false
}

// containsNormalized checks if a string contains another after normalization
func containsNormalized(s, substr string) bool {
	normalized := normalizeStoreName(s)
	for i := 0; i <= len(normalized)-len(substr); i++ {
		if normalized[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// writeJSON writes a JSON response
func (h *StoreHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *StoreHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}
