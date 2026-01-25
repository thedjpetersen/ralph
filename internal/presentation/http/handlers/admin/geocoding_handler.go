package admin

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
)

// GeocodingStatus represents the status of a geocoding request
type GeocodingStatus string

const (
	GeocodingStatusPending   GeocodingStatus = "pending"
	GeocodingStatusCompleted GeocodingStatus = "completed"
	GeocodingStatusFailed    GeocodingStatus = "failed"
	GeocodingStatusCached    GeocodingStatus = "cached"
)

// GeocodingProvider represents the geocoding provider used
type GeocodingProvider string

const (
	GeocodingProviderGoogle    GeocodingProvider = "google"
	GeocodingProviderMapbox    GeocodingProvider = "mapbox"
	GeocodingProviderNominatim GeocodingProvider = "nominatim"
	GeocodingProviderInternal  GeocodingProvider = "internal"
)

// GeocodingResult represents a geocoding lookup result
type GeocodingResult struct {
	ID           string            `json:"id"`
	Address      string            `json:"address"`
	Latitude     *float64          `json:"latitude,omitempty"`
	Longitude    *float64          `json:"longitude,omitempty"`
	FormattedAddress string        `json:"formatted_address,omitempty"`
	City         string            `json:"city,omitempty"`
	State        string            `json:"state,omitempty"`
	Country      string            `json:"country,omitempty"`
	PostalCode   string            `json:"postal_code,omitempty"`
	Status       GeocodingStatus   `json:"status"`
	Provider     GeocodingProvider `json:"provider"`
	Confidence   float64           `json:"confidence"`
	Metadata     map[string]string `json:"metadata,omitempty"`
	Error        string            `json:"error,omitempty"`
	CreatedAt    time.Time         `json:"created_at"`
	UpdatedAt    time.Time         `json:"updated_at"`
	ExpiresAt    *time.Time        `json:"expires_at,omitempty"`
}

// GeocodingCache represents a cached geocoding entry
type GeocodingCache struct {
	ID          string            `json:"id"`
	QueryHash   string            `json:"query_hash"`
	Address     string            `json:"address"`
	Result      *GeocodingResult  `json:"result"`
	HitCount    int               `json:"hit_count"`
	Provider    GeocodingProvider `json:"provider"`
	CreatedAt   time.Time         `json:"created_at"`
	LastHitAt   time.Time         `json:"last_hit_at"`
	ExpiresAt   time.Time         `json:"expires_at"`
}

// GeocodingStats represents statistics for geocoding operations
type GeocodingStats struct {
	TotalRequests      int                `json:"total_requests"`
	CacheHits          int                `json:"cache_hits"`
	CacheMisses        int                `json:"cache_misses"`
	SuccessfulLookups  int                `json:"successful_lookups"`
	FailedLookups      int                `json:"failed_lookups"`
	CacheHitRate       float64            `json:"cache_hit_rate"`
	ProviderBreakdown  map[string]int     `json:"provider_breakdown"`
	AverageLatencyMs   float64            `json:"average_latency_ms"`
	CacheSize          int                `json:"cache_size"`
	LastPurgeAt        *time.Time         `json:"last_purge_at,omitempty"`
}

// GeocodingConfig represents geocoding configuration
type GeocodingConfig struct {
	DefaultProvider    GeocodingProvider `json:"default_provider"`
	CacheTTLSeconds    int               `json:"cache_ttl_seconds"`
	MaxCacheEntries    int               `json:"max_cache_entries"`
	RateLimitPerMinute int               `json:"rate_limit_per_minute"`
	EnableFallback     bool              `json:"enable_fallback"`
	FallbackProviders  []GeocodingProvider `json:"fallback_providers"`
	MinConfidence      float64           `json:"min_confidence"`
}

// ListGeocodingResultsResponse represents a list of geocoding results
type ListGeocodingResultsResponse struct {
	Results []*GeocodingResult `json:"results"`
	Total   int                `json:"total"`
}

// ListGeocodingCacheResponse represents a list of cache entries
type ListGeocodingCacheResponse struct {
	Entries []*GeocodingCache `json:"entries"`
	Total   int               `json:"total"`
}

// GeocodeRequest represents a request to geocode an address
type GeocodeRequest struct {
	Address  string            `json:"address"`
	Provider GeocodingProvider `json:"provider,omitempty"`
	UseCache bool              `json:"use_cache,omitempty"`
}

// BulkGeocodeRequest represents a request to geocode multiple addresses
type BulkGeocodeRequest struct {
	Addresses []string          `json:"addresses"`
	Provider  GeocodingProvider `json:"provider,omitempty"`
	UseCache  bool              `json:"use_cache,omitempty"`
}

// BulkGeocodeResponse represents the response for bulk geocoding
type BulkGeocodeResponse struct {
	Results       []*GeocodingResult `json:"results"`
	TotalRequests int                `json:"total_requests"`
	Successful    int                `json:"successful"`
	Failed        int                `json:"failed"`
	FromCache     int                `json:"from_cache"`
}

// UpdateGeocodingConfigRequest represents a request to update config
type UpdateGeocodingConfigRequest struct {
	DefaultProvider    *GeocodingProvider   `json:"default_provider,omitempty"`
	CacheTTLSeconds    *int                 `json:"cache_ttl_seconds,omitempty"`
	MaxCacheEntries    *int                 `json:"max_cache_entries,omitempty"`
	RateLimitPerMinute *int                 `json:"rate_limit_per_minute,omitempty"`
	EnableFallback     *bool                `json:"enable_fallback,omitempty"`
	FallbackProviders  []GeocodingProvider  `json:"fallback_providers,omitempty"`
	MinConfidence      *float64             `json:"min_confidence,omitempty"`
}

// GeocodingHandler handles HTTP requests for admin geocoding management
type GeocodingHandler struct {
	mu      sync.RWMutex
	results map[string]*GeocodingResult
	cache   map[string]*GeocodingCache
	config  *GeocodingConfig
	stats   *GeocodingStats
}

// NewGeocodingHandler creates a new GeocodingHandler instance
func NewGeocodingHandler() *GeocodingHandler {
	return &GeocodingHandler{
		results: make(map[string]*GeocodingResult),
		cache:   make(map[string]*GeocodingCache),
		config: &GeocodingConfig{
			DefaultProvider:    GeocodingProviderGoogle,
			CacheTTLSeconds:    86400, // 24 hours
			MaxCacheEntries:    10000,
			RateLimitPerMinute: 60,
			EnableFallback:     true,
			FallbackProviders:  []GeocodingProvider{GeocodingProviderMapbox, GeocodingProviderNominatim},
			MinConfidence:      0.7,
		},
		stats: &GeocodingStats{
			ProviderBreakdown: make(map[string]int),
		},
	}
}

// HandleList handles GET /api/admin/geocoding
func (h *GeocodingHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	// Get optional filters
	status := r.URL.Query().Get("status")
	provider := r.URL.Query().Get("provider")

	h.mu.RLock()
	results := make([]*GeocodingResult, 0)
	for _, result := range h.results {
		if status != "" && string(result.Status) != status {
			continue
		}
		if provider != "" && string(result.Provider) != provider {
			continue
		}
		results = append(results, result)
	}
	h.mu.RUnlock()

	resp := ListGeocodingResultsResponse{
		Results: results,
		Total:   len(results),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleGet handles GET /api/admin/geocoding/{id}
func (h *GeocodingHandler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	result, exists := h.results[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Geocoding result not found")
		return
	}

	h.writeJSON(w, http.StatusOK, result)
}

// HandleGeocode handles POST /api/admin/geocoding
func (h *GeocodingHandler) HandleGeocode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req GeocodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.Address == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "address is required")
		return
	}

	provider := h.config.DefaultProvider
	if req.Provider != "" {
		provider = req.Provider
	}

	// Simulate geocoding (in production, this would call actual geocoding services)
	now := time.Now()
	lat := 40.7128
	lng := -74.0060
	result := &GeocodingResult{
		ID:               uuid.New().String(),
		Address:          req.Address,
		Latitude:         &lat,
		Longitude:        &lng,
		FormattedAddress: req.Address,
		City:             "New York",
		State:            "NY",
		Country:          "USA",
		PostalCode:       "10001",
		Status:           GeocodingStatusCompleted,
		Provider:         provider,
		Confidence:       0.95,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	h.mu.Lock()
	h.results[result.ID] = result
	h.stats.TotalRequests++
	h.stats.SuccessfulLookups++
	h.stats.ProviderBreakdown[string(provider)]++
	h.mu.Unlock()

	h.writeJSON(w, http.StatusCreated, result)
}

// HandleBulkGeocode handles POST /api/admin/geocoding/bulk
func (h *GeocodingHandler) HandleBulkGeocode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req BulkGeocodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if len(req.Addresses) == 0 {
		h.writeError(w, http.StatusBadRequest, "validation_error", "addresses is required")
		return
	}

	if len(req.Addresses) > 100 {
		h.writeError(w, http.StatusBadRequest, "validation_error", "maximum 100 addresses per bulk request")
		return
	}

	provider := h.config.DefaultProvider
	if req.Provider != "" {
		provider = req.Provider
	}

	results := make([]*GeocodingResult, 0, len(req.Addresses))
	now := time.Now()
	successful := 0
	failed := 0
	fromCache := 0

	h.mu.Lock()
	for _, address := range req.Addresses {
		lat := 40.7128
		lng := -74.0060
		result := &GeocodingResult{
			ID:               uuid.New().String(),
			Address:          address,
			Latitude:         &lat,
			Longitude:        &lng,
			FormattedAddress: address,
			Status:           GeocodingStatusCompleted,
			Provider:         provider,
			Confidence:       0.95,
			CreatedAt:        now,
			UpdatedAt:        now,
		}
		h.results[result.ID] = result
		results = append(results, result)
		successful++
		h.stats.TotalRequests++
		h.stats.SuccessfulLookups++
	}
	h.mu.Unlock()

	resp := BulkGeocodeResponse{
		Results:       results,
		TotalRequests: len(req.Addresses),
		Successful:    successful,
		Failed:        failed,
		FromCache:     fromCache,
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleDelete handles DELETE /api/admin/geocoding/{id}
func (h *GeocodingHandler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	_, exists := h.results[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Geocoding result not found")
		return
	}
	delete(h.results, id)
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// HandleGetStats handles GET /api/admin/geocoding/stats
func (h *GeocodingHandler) HandleGetStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	stats := *h.stats
	stats.CacheSize = len(h.cache)
	if stats.TotalRequests > 0 {
		stats.CacheHitRate = float64(stats.CacheHits) / float64(stats.TotalRequests)
	}
	h.mu.RUnlock()

	h.writeJSON(w, http.StatusOK, stats)
}

// HandleGetCache handles GET /api/admin/geocoding/cache
func (h *GeocodingHandler) HandleGetCache(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	entries := make([]*GeocodingCache, 0, len(h.cache))
	for _, entry := range h.cache {
		entries = append(entries, entry)
	}
	h.mu.RUnlock()

	resp := ListGeocodingCacheResponse{
		Entries: entries,
		Total:   len(entries),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandlePurgeCache handles POST /api/admin/geocoding/cache/purge
func (h *GeocodingHandler) HandlePurgeCache(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	// Get optional expired_only filter
	expiredOnly := r.URL.Query().Get("expired_only") == "true"

	h.mu.Lock()
	purgedCount := 0
	now := time.Now()

	if expiredOnly {
		for id, entry := range h.cache {
			if entry.ExpiresAt.Before(now) {
				delete(h.cache, id)
				purgedCount++
			}
		}
	} else {
		purgedCount = len(h.cache)
		h.cache = make(map[string]*GeocodingCache)
	}

	h.stats.LastPurgeAt = &now
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, map[string]any{
		"message":       "Cache purged",
		"purged_count":  purgedCount,
		"expired_only":  expiredOnly,
	})
}

// HandleGetConfig handles GET /api/admin/geocoding/config
func (h *GeocodingHandler) HandleGetConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	config := *h.config
	h.mu.RUnlock()

	h.writeJSON(w, http.StatusOK, config)
}

// HandleUpdateConfig handles PUT /api/admin/geocoding/config
func (h *GeocodingHandler) HandleUpdateConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req UpdateGeocodingConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	if req.DefaultProvider != nil {
		h.config.DefaultProvider = *req.DefaultProvider
	}
	if req.CacheTTLSeconds != nil {
		h.config.CacheTTLSeconds = *req.CacheTTLSeconds
	}
	if req.MaxCacheEntries != nil {
		h.config.MaxCacheEntries = *req.MaxCacheEntries
	}
	if req.RateLimitPerMinute != nil {
		h.config.RateLimitPerMinute = *req.RateLimitPerMinute
	}
	if req.EnableFallback != nil {
		h.config.EnableFallback = *req.EnableFallback
	}
	if req.FallbackProviders != nil {
		h.config.FallbackProviders = req.FallbackProviders
	}
	if req.MinConfidence != nil {
		h.config.MinConfidence = *req.MinConfidence
	}

	h.writeJSON(w, http.StatusOK, h.config)
}

// writeJSON writes a JSON response
func (h *GeocodingHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *GeocodingHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}
