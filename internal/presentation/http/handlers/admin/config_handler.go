package admin

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
)

// ConfigScope represents the scope of a configuration
type ConfigScope string

const (
	ConfigScopeSystem  ConfigScope = "system"
	ConfigScopeFeature ConfigScope = "feature"
	ConfigScopeUser    ConfigScope = "user"
	ConfigScopeIntegration ConfigScope = "integration"
)

// ConfigType represents the type of configuration value
type ConfigType string

const (
	ConfigTypeString  ConfigType = "string"
	ConfigTypeNumber  ConfigType = "number"
	ConfigTypeBoolean ConfigType = "boolean"
	ConfigTypeJSON    ConfigType = "json"
	ConfigTypeSecret  ConfigType = "secret"
)

// SystemConfig represents a system configuration entry
type SystemConfig struct {
	ID           string            `json:"id"`
	Key          string            `json:"key"`
	Value        interface{}       `json:"value"`
	DefaultValue interface{}       `json:"default_value,omitempty"`
	Type         ConfigType        `json:"type"`
	Scope        ConfigScope       `json:"scope"`
	Description  string            `json:"description,omitempty"`
	Category     string            `json:"category,omitempty"`
	IsReadOnly   bool              `json:"is_read_only"`
	IsSecret     bool              `json:"is_secret"`
	Validation   *ConfigValidation `json:"validation,omitempty"`
	Metadata     map[string]string `json:"metadata,omitempty"`
	CreatedAt    time.Time         `json:"created_at"`
	UpdatedAt    time.Time         `json:"updated_at"`
	UpdatedBy    string            `json:"updated_by,omitempty"`
}

// ConfigValidation represents validation rules for a config
type ConfigValidation struct {
	Required  bool        `json:"required,omitempty"`
	MinValue  *float64    `json:"min_value,omitempty"`
	MaxValue  *float64    `json:"max_value,omitempty"`
	MinLength *int        `json:"min_length,omitempty"`
	MaxLength *int        `json:"max_length,omitempty"`
	Pattern   string      `json:"pattern,omitempty"`
	Enum      []string    `json:"enum,omitempty"`
}

// ConfigHistory represents a config change history entry
type ConfigHistory struct {
	ID        string      `json:"id"`
	ConfigID  string      `json:"config_id"`
	ConfigKey string      `json:"config_key"`
	OldValue  interface{} `json:"old_value"`
	NewValue  interface{} `json:"new_value"`
	ChangedBy string      `json:"changed_by,omitempty"`
	ChangedAt time.Time   `json:"changed_at"`
	Reason    string      `json:"reason,omitempty"`
}

// FeatureFlag represents a feature flag
type FeatureFlag struct {
	ID           string            `json:"id"`
	Key          string            `json:"key"`
	Name         string            `json:"name"`
	Description  string            `json:"description,omitempty"`
	IsEnabled    bool              `json:"is_enabled"`
	Percentage   int               `json:"percentage,omitempty"` // For gradual rollout
	UserIDs      []string          `json:"user_ids,omitempty"`   // Specific users
	Conditions   []FlagCondition   `json:"conditions,omitempty"`
	Metadata     map[string]string `json:"metadata,omitempty"`
	CreatedAt    time.Time         `json:"created_at"`
	UpdatedAt    time.Time         `json:"updated_at"`
	EnabledAt    *time.Time        `json:"enabled_at,omitempty"`
	DisabledAt   *time.Time        `json:"disabled_at,omitempty"`
}

// FlagCondition represents a condition for feature flag evaluation
type FlagCondition struct {
	Attribute string `json:"attribute"`
	Operator  string `json:"operator"`
	Value     string `json:"value"`
}

// SystemStats represents system statistics
type SystemStats struct {
	TotalConfigs       int            `json:"total_configs"`
	ConfigsByScope     map[string]int `json:"configs_by_scope"`
	ConfigsByType      map[string]int `json:"configs_by_type"`
	TotalFeatureFlags  int            `json:"total_feature_flags"`
	EnabledFlags       int            `json:"enabled_flags"`
	DisabledFlags      int            `json:"disabled_flags"`
	RecentChanges      int            `json:"recent_changes"`
}

// ListConfigsResponse represents a list of configs
type ListConfigsResponse struct {
	Configs []*SystemConfig `json:"configs"`
	Total   int             `json:"total"`
}

// ListFeatureFlagsResponse represents a list of feature flags
type ListFeatureFlagsResponse struct {
	Flags []*FeatureFlag `json:"flags"`
	Total int            `json:"total"`
}

// ListConfigHistoryResponse represents a list of config history
type ListConfigHistoryResponse struct {
	History []*ConfigHistory `json:"history"`
	Total   int              `json:"total"`
}

// CreateConfigRequest represents a request to create a config
type CreateConfigRequest struct {
	Key          string            `json:"key"`
	Value        interface{}       `json:"value"`
	DefaultValue interface{}       `json:"default_value,omitempty"`
	Type         ConfigType        `json:"type"`
	Scope        ConfigScope       `json:"scope,omitempty"`
	Description  string            `json:"description,omitempty"`
	Category     string            `json:"category,omitempty"`
	IsReadOnly   bool              `json:"is_read_only,omitempty"`
	IsSecret     bool              `json:"is_secret,omitempty"`
	Validation   *ConfigValidation `json:"validation,omitempty"`
	Metadata     map[string]string `json:"metadata,omitempty"`
}

// UpdateConfigRequest represents a request to update a config
type UpdateConfigRequest struct {
	Value       interface{}        `json:"value"`
	Description *string            `json:"description,omitempty"`
	Metadata    map[string]string  `json:"metadata,omitempty"`
	Reason      string             `json:"reason,omitempty"`
}

// CreateFeatureFlagRequest represents a request to create a feature flag
type CreateFeatureFlagRequest struct {
	Key         string            `json:"key"`
	Name        string            `json:"name"`
	Description string            `json:"description,omitempty"`
	IsEnabled   bool              `json:"is_enabled,omitempty"`
	Percentage  int               `json:"percentage,omitempty"`
	UserIDs     []string          `json:"user_ids,omitempty"`
	Conditions  []FlagCondition   `json:"conditions,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

// UpdateFeatureFlagRequest represents a request to update a feature flag
type UpdateFeatureFlagRequest struct {
	Name        *string           `json:"name,omitempty"`
	Description *string           `json:"description,omitempty"`
	IsEnabled   *bool             `json:"is_enabled,omitempty"`
	Percentage  *int              `json:"percentage,omitempty"`
	UserIDs     []string          `json:"user_ids,omitempty"`
	Conditions  []FlagCondition   `json:"conditions,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

// BulkConfigsRequest represents a bulk config update request
type BulkConfigsRequest struct {
	Configs []struct {
		Key    string      `json:"key"`
		Value  interface{} `json:"value"`
		Reason string      `json:"reason,omitempty"`
	} `json:"configs"`
}

// BulkConfigsResponse represents a bulk config update response
type BulkConfigsResponse struct {
	Updated int      `json:"updated"`
	Failed  int      `json:"failed"`
	Errors  []string `json:"errors,omitempty"`
}

// ConfigHandler handles HTTP requests for admin system configuration
type ConfigHandler struct {
	mu       sync.RWMutex
	configs  map[string]*SystemConfig
	flags    map[string]*FeatureFlag
	history  []*ConfigHistory
	stats    *SystemStats
}

// NewConfigHandler creates a new ConfigHandler instance
func NewConfigHandler() *ConfigHandler {
	h := &ConfigHandler{
		configs: make(map[string]*SystemConfig),
		flags:   make(map[string]*FeatureFlag),
		history: make([]*ConfigHistory, 0),
		stats: &SystemStats{
			ConfigsByScope: make(map[string]int),
			ConfigsByType:  make(map[string]int),
		},
	}
	h.initializeDefaultConfigs()
	return h
}

// initializeDefaultConfigs creates default system configurations
func (h *ConfigHandler) initializeDefaultConfigs() {
	now := time.Now()

	defaultConfigs := []struct {
		Key          string
		Value        interface{}
		Type         ConfigType
		Scope        ConfigScope
		Description  string
		Category     string
	}{
		{"system.maintenance_mode", false, ConfigTypeBoolean, ConfigScopeSystem, "Enable maintenance mode", "system"},
		{"system.max_upload_size", 10485760, ConfigTypeNumber, ConfigScopeSystem, "Maximum upload size in bytes", "system"},
		{"system.session_timeout", 3600, ConfigTypeNumber, ConfigScopeSystem, "Session timeout in seconds", "system"},
		{"ocr.default_engine", "tesseract", ConfigTypeString, ConfigScopeFeature, "Default OCR engine", "ocr"},
		{"ocr.enabled", true, ConfigTypeBoolean, ConfigScopeFeature, "Enable OCR processing", "ocr"},
		{"geocoding.enabled", true, ConfigTypeBoolean, ConfigScopeFeature, "Enable geocoding", "geocoding"},
		{"geocoding.default_provider", "google", ConfigTypeString, ConfigScopeFeature, "Default geocoding provider", "geocoding"},
		{"email.sync_enabled", true, ConfigTypeBoolean, ConfigScopeIntegration, "Enable email sync", "integration"},
		{"drive.sync_enabled", true, ConfigTypeBoolean, ConfigScopeIntegration, "Enable Google Drive sync", "integration"},
		{"notifications.email_enabled", true, ConfigTypeBoolean, ConfigScopeFeature, "Enable email notifications", "notifications"},
	}

	for _, cfg := range defaultConfigs {
		id := uuid.New().String()
		config := &SystemConfig{
			ID:           id,
			Key:          cfg.Key,
			Value:        cfg.Value,
			DefaultValue: cfg.Value,
			Type:         cfg.Type,
			Scope:        cfg.Scope,
			Description:  cfg.Description,
			Category:     cfg.Category,
			IsReadOnly:   false,
			IsSecret:     false,
			CreatedAt:    now,
			UpdatedAt:    now,
		}
		h.configs[cfg.Key] = config
	}

	// Initialize some default feature flags
	defaultFlags := []struct {
		Key         string
		Name        string
		Description string
		IsEnabled   bool
	}{
		{"new_dashboard", "New Dashboard", "Enable the new dashboard UI", false},
		{"receipt_ai", "Receipt AI", "Enable AI-powered receipt processing", true},
		{"bulk_operations", "Bulk Operations", "Enable bulk operations in admin", true},
		{"advanced_search", "Advanced Search", "Enable advanced search features", false},
	}

	for _, flag := range defaultFlags {
		id := uuid.New().String()
		f := &FeatureFlag{
			ID:          id,
			Key:         flag.Key,
			Name:        flag.Name,
			Description: flag.Description,
			IsEnabled:   flag.IsEnabled,
			Percentage:  100,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		if flag.IsEnabled {
			f.EnabledAt = &now
		}
		h.flags[flag.Key] = f
	}

	h.updateStats()
}

// HandleListConfigs handles GET /api/admin/config
func (h *ConfigHandler) HandleListConfigs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	scope := r.URL.Query().Get("scope")
	category := r.URL.Query().Get("category")

	h.mu.RLock()
	configs := make([]*SystemConfig, 0)
	for _, config := range h.configs {
		if scope != "" && string(config.Scope) != scope {
			continue
		}
		if category != "" && config.Category != category {
			continue
		}
		// Mask secret values
		configCopy := *config
		if config.IsSecret {
			configCopy.Value = "********"
		}
		configs = append(configs, &configCopy)
	}
	h.mu.RUnlock()

	resp := ListConfigsResponse{
		Configs: configs,
		Total:   len(configs),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleGetConfig handles GET /api/admin/config/{key}
func (h *ConfigHandler) HandleGetConfig(w http.ResponseWriter, r *http.Request, key string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	config, exists := h.configs[key]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Config not found")
		return
	}

	configCopy := *config
	if config.IsSecret {
		configCopy.Value = "********"
	}

	h.writeJSON(w, http.StatusOK, configCopy)
}

// HandleCreateConfig handles POST /api/admin/config
func (h *ConfigHandler) HandleCreateConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req CreateConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.Key == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "key is required")
		return
	}
	if req.Type == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "type is required")
		return
	}

	h.mu.Lock()
	if _, exists := h.configs[req.Key]; exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusConflict, "conflict", "Config with this key already exists")
		return
	}

	scope := ConfigScopeSystem
	if req.Scope != "" {
		scope = req.Scope
	}

	now := time.Now()
	config := &SystemConfig{
		ID:           uuid.New().String(),
		Key:          req.Key,
		Value:        req.Value,
		DefaultValue: req.DefaultValue,
		Type:         req.Type,
		Scope:        scope,
		Description:  req.Description,
		Category:     req.Category,
		IsReadOnly:   req.IsReadOnly,
		IsSecret:     req.IsSecret,
		Validation:   req.Validation,
		Metadata:     req.Metadata,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	h.configs[req.Key] = config
	h.updateStats()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusCreated, config)
}

// HandleUpdateConfig handles PUT /api/admin/config/{key}
func (h *ConfigHandler) HandleUpdateConfig(w http.ResponseWriter, r *http.Request, key string) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req UpdateConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	config, exists := h.configs[key]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Config not found")
		return
	}

	if config.IsReadOnly {
		h.mu.Unlock()
		h.writeError(w, http.StatusForbidden, "forbidden", "Config is read-only")
		return
	}

	// Record history
	historyEntry := &ConfigHistory{
		ID:        uuid.New().String(),
		ConfigID:  config.ID,
		ConfigKey: config.Key,
		OldValue:  config.Value,
		NewValue:  req.Value,
		ChangedAt: time.Now(),
		Reason:    req.Reason,
	}
	h.history = append(h.history, historyEntry)

	// Update config
	config.Value = req.Value
	if req.Description != nil {
		config.Description = *req.Description
	}
	if req.Metadata != nil {
		config.Metadata = req.Metadata
	}
	config.UpdatedAt = time.Now()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, config)
}

// HandleDeleteConfig handles DELETE /api/admin/config/{key}
func (h *ConfigHandler) HandleDeleteConfig(w http.ResponseWriter, r *http.Request, key string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	config, exists := h.configs[key]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Config not found")
		return
	}

	if config.Scope == ConfigScopeSystem {
		h.mu.Unlock()
		h.writeError(w, http.StatusForbidden, "forbidden", "System configs cannot be deleted")
		return
	}

	delete(h.configs, key)
	h.updateStats()
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// HandleBulkUpdateConfigs handles PUT /api/admin/config/bulk
func (h *ConfigHandler) HandleBulkUpdateConfigs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/POST methods are allowed")
		return
	}

	var req BulkConfigsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if len(req.Configs) == 0 {
		h.writeError(w, http.StatusBadRequest, "validation_error", "configs is required")
		return
	}

	h.mu.Lock()
	updated := 0
	failed := 0
	errors := make([]string, 0)
	now := time.Now()

	for _, cfg := range req.Configs {
		config, exists := h.configs[cfg.Key]
		if !exists {
			failed++
			errors = append(errors, "config not found: "+cfg.Key)
			continue
		}
		if config.IsReadOnly {
			failed++
			errors = append(errors, "config is read-only: "+cfg.Key)
			continue
		}

		// Record history
		historyEntry := &ConfigHistory{
			ID:        uuid.New().String(),
			ConfigID:  config.ID,
			ConfigKey: config.Key,
			OldValue:  config.Value,
			NewValue:  cfg.Value,
			ChangedAt: now,
			Reason:    cfg.Reason,
		}
		h.history = append(h.history, historyEntry)

		config.Value = cfg.Value
		config.UpdatedAt = now
		updated++
	}
	h.mu.Unlock()

	resp := BulkConfigsResponse{
		Updated: updated,
		Failed:  failed,
		Errors:  errors,
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleResetConfig handles POST /api/admin/config/{key}/reset
func (h *ConfigHandler) HandleResetConfig(w http.ResponseWriter, r *http.Request, key string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.Lock()
	config, exists := h.configs[key]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Config not found")
		return
	}

	if config.DefaultValue == nil {
		h.mu.Unlock()
		h.writeError(w, http.StatusBadRequest, "validation_error", "Config has no default value")
		return
	}

	// Record history
	historyEntry := &ConfigHistory{
		ID:        uuid.New().String(),
		ConfigID:  config.ID,
		ConfigKey: config.Key,
		OldValue:  config.Value,
		NewValue:  config.DefaultValue,
		ChangedAt: time.Now(),
		Reason:    "Reset to default",
	}
	h.history = append(h.history, historyEntry)

	config.Value = config.DefaultValue
	config.UpdatedAt = time.Now()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, config)
}

// HandleGetHistory handles GET /api/admin/config/history
func (h *ConfigHandler) HandleGetHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	configKey := r.URL.Query().Get("key")

	h.mu.RLock()
	history := make([]*ConfigHistory, 0)
	for _, entry := range h.history {
		if configKey != "" && entry.ConfigKey != configKey {
			continue
		}
		history = append(history, entry)
	}
	h.mu.RUnlock()

	resp := ListConfigHistoryResponse{
		History: history,
		Total:   len(history),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleListFlags handles GET /api/admin/config/flags
func (h *ConfigHandler) HandleListFlags(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	flags := make([]*FeatureFlag, 0, len(h.flags))
	for _, flag := range h.flags {
		flags = append(flags, flag)
	}
	h.mu.RUnlock()

	resp := ListFeatureFlagsResponse{
		Flags: flags,
		Total: len(flags),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleGetFlag handles GET /api/admin/config/flags/{key}
func (h *ConfigHandler) HandleGetFlag(w http.ResponseWriter, r *http.Request, key string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	flag, exists := h.flags[key]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Feature flag not found")
		return
	}

	h.writeJSON(w, http.StatusOK, flag)
}

// HandleCreateFlag handles POST /api/admin/config/flags
func (h *ConfigHandler) HandleCreateFlag(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req CreateFeatureFlagRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.Key == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "key is required")
		return
	}
	if req.Name == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "name is required")
		return
	}

	h.mu.Lock()
	if _, exists := h.flags[req.Key]; exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusConflict, "conflict", "Feature flag with this key already exists")
		return
	}

	now := time.Now()
	flag := &FeatureFlag{
		ID:          uuid.New().String(),
		Key:         req.Key,
		Name:        req.Name,
		Description: req.Description,
		IsEnabled:   req.IsEnabled,
		Percentage:  req.Percentage,
		UserIDs:     req.UserIDs,
		Conditions:  req.Conditions,
		Metadata:    req.Metadata,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if req.IsEnabled {
		flag.EnabledAt = &now
	}
	if flag.Percentage == 0 {
		flag.Percentage = 100
	}

	h.flags[req.Key] = flag
	h.updateStats()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusCreated, flag)
}

// HandleUpdateFlag handles PUT /api/admin/config/flags/{key}
func (h *ConfigHandler) HandleUpdateFlag(w http.ResponseWriter, r *http.Request, key string) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req UpdateFeatureFlagRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	flag, exists := h.flags[key]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Feature flag not found")
		return
	}

	now := time.Now()

	if req.Name != nil {
		flag.Name = *req.Name
	}
	if req.Description != nil {
		flag.Description = *req.Description
	}
	if req.IsEnabled != nil {
		if *req.IsEnabled && !flag.IsEnabled {
			flag.EnabledAt = &now
			flag.DisabledAt = nil
		} else if !*req.IsEnabled && flag.IsEnabled {
			flag.DisabledAt = &now
		}
		flag.IsEnabled = *req.IsEnabled
	}
	if req.Percentage != nil {
		flag.Percentage = *req.Percentage
	}
	if req.UserIDs != nil {
		flag.UserIDs = req.UserIDs
	}
	if req.Conditions != nil {
		flag.Conditions = req.Conditions
	}
	if req.Metadata != nil {
		flag.Metadata = req.Metadata
	}

	flag.UpdatedAt = now
	h.updateStats()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, flag)
}

// HandleDeleteFlag handles DELETE /api/admin/config/flags/{key}
func (h *ConfigHandler) HandleDeleteFlag(w http.ResponseWriter, r *http.Request, key string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	_, exists := h.flags[key]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Feature flag not found")
		return
	}

	delete(h.flags, key)
	h.updateStats()
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// HandleToggleFlag handles POST /api/admin/config/flags/{key}/toggle
func (h *ConfigHandler) HandleToggleFlag(w http.ResponseWriter, r *http.Request, key string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.Lock()
	flag, exists := h.flags[key]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Feature flag not found")
		return
	}

	now := time.Now()
	flag.IsEnabled = !flag.IsEnabled
	if flag.IsEnabled {
		flag.EnabledAt = &now
		flag.DisabledAt = nil
	} else {
		flag.DisabledAt = &now
	}
	flag.UpdatedAt = now
	h.updateStats()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, flag)
}

// HandleGetStats handles GET /api/admin/config/stats
func (h *ConfigHandler) HandleGetStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	stats := *h.stats
	h.mu.RUnlock()

	h.writeJSON(w, http.StatusOK, stats)
}

// updateStats recalculates configuration statistics
func (h *ConfigHandler) updateStats() {
	h.stats.TotalConfigs = len(h.configs)
	h.stats.ConfigsByScope = make(map[string]int)
	h.stats.ConfigsByType = make(map[string]int)
	h.stats.TotalFeatureFlags = len(h.flags)
	h.stats.EnabledFlags = 0
	h.stats.DisabledFlags = 0
	h.stats.RecentChanges = 0

	for _, config := range h.configs {
		h.stats.ConfigsByScope[string(config.Scope)]++
		h.stats.ConfigsByType[string(config.Type)]++
	}

	for _, flag := range h.flags {
		if flag.IsEnabled {
			h.stats.EnabledFlags++
		} else {
			h.stats.DisabledFlags++
		}
	}

	// Count recent changes (last 24 hours)
	cutoff := time.Now().Add(-24 * time.Hour)
	for _, entry := range h.history {
		if entry.ChangedAt.After(cutoff) {
			h.stats.RecentChanges++
		}
	}
}

// writeJSON writes a JSON response
func (h *ConfigHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *ConfigHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}
