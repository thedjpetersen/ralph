package admin

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
)

// CategoryStatus represents the status of a category
type CategoryStatus string

const (
	CategoryStatusActive   CategoryStatus = "active"
	CategoryStatusInactive CategoryStatus = "inactive"
	CategoryStatusDraft    CategoryStatus = "draft"
)

// CategoryType represents the type of category
type CategoryType string

const (
	CategoryTypeSystem  CategoryType = "system"
	CategoryTypeUser    CategoryType = "user"
	CategoryTypeCustom  CategoryType = "custom"
	CategoryTypeDerived CategoryType = "derived"
)

// Category represents a category in the system
type Category struct {
	ID              string            `json:"id"`
	Name            string            `json:"name"`
	Slug            string            `json:"slug"`
	DisplayName     string            `json:"display_name,omitempty"`
	Description     string            `json:"description,omitempty"`
	Type            CategoryType      `json:"type"`
	Status          CategoryStatus    `json:"status"`
	ParentID        string            `json:"parent_id,omitempty"`
	Icon            string            `json:"icon,omitempty"`
	Color           string            `json:"color,omitempty"`
	SortOrder       int               `json:"sort_order"`
	IsLeaf          bool              `json:"is_leaf"`
	Depth           int               `json:"depth"`
	Path            string            `json:"path"`
	Tags            []string          `json:"tags,omitempty"`
	Metadata        map[string]string `json:"metadata,omitempty"`
	Rules           []CategoryRule    `json:"rules,omitempty"`
	ChildrenCount   int               `json:"children_count"`
	ProductCount    int               `json:"product_count"`
	StoreCount      int               `json:"store_count"`
	TransactionCount int              `json:"transaction_count"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
	CreatedBy       string            `json:"created_by,omitempty"`
	UpdatedBy       string            `json:"updated_by,omitempty"`
}

// CategoryRule represents a rule for auto-categorization
type CategoryRule struct {
	ID         string `json:"id"`
	Type       string `json:"type"` // merchant, keyword, pattern, amount
	Operator   string `json:"operator"` // contains, equals, starts_with, ends_with, regex, gt, lt
	Value      string `json:"value"`
	Priority   int    `json:"priority"`
	IsEnabled  bool   `json:"is_enabled"`
}

// CategoryTree represents a hierarchical view of categories
type CategoryTree struct {
	Category *Category       `json:"category"`
	Children []*CategoryTree `json:"children,omitempty"`
}

// CategoryStats represents statistics for categories
type CategoryStats struct {
	TotalCategories     int            `json:"total_categories"`
	ActiveCategories    int            `json:"active_categories"`
	InactiveCategories  int            `json:"inactive_categories"`
	TypeBreakdown       map[string]int `json:"type_breakdown"`
	DepthBreakdown      map[int]int    `json:"depth_breakdown"`
	TopCategories       []*Category    `json:"top_categories"`
	UncategorizedCount  int            `json:"uncategorized_count"`
}

// ListCategoriesResponse represents a list of categories
type ListCategoriesResponse struct {
	Categories []*Category `json:"categories"`
	Total      int         `json:"total"`
}

// CreateCategoryRequest represents a request to create a category
type CreateCategoryRequest struct {
	Name        string            `json:"name"`
	DisplayName string            `json:"display_name,omitempty"`
	Description string            `json:"description,omitempty"`
	Type        CategoryType      `json:"type,omitempty"`
	ParentID    string            `json:"parent_id,omitempty"`
	Icon        string            `json:"icon,omitempty"`
	Color       string            `json:"color,omitempty"`
	SortOrder   *int              `json:"sort_order,omitempty"`
	Tags        []string          `json:"tags,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
	Rules       []CategoryRule    `json:"rules,omitempty"`
}

// UpdateCategoryRequest represents a request to update a category
type UpdateCategoryRequest struct {
	Name        *string            `json:"name,omitempty"`
	DisplayName *string            `json:"display_name,omitempty"`
	Description *string            `json:"description,omitempty"`
	Type        *CategoryType      `json:"type,omitempty"`
	Status      *CategoryStatus    `json:"status,omitempty"`
	ParentID    *string            `json:"parent_id,omitempty"`
	Icon        *string            `json:"icon,omitempty"`
	Color       *string            `json:"color,omitempty"`
	SortOrder   *int               `json:"sort_order,omitempty"`
	Tags        []string           `json:"tags,omitempty"`
	Metadata    map[string]string  `json:"metadata,omitempty"`
	Rules       []CategoryRule     `json:"rules,omitempty"`
}

// BulkCategoriesRequest represents a request for bulk category operations
type BulkCategoriesRequest struct {
	Categories []CreateCategoryRequest `json:"categories"`
}

// BulkCategoriesResponse represents the response for bulk category operations
type BulkCategoriesResponse struct {
	Categories       []*Category `json:"categories"`
	TotalCategories  int         `json:"total_categories"`
	Created          int         `json:"created"`
	Failed           int         `json:"failed"`
	Errors           []string    `json:"errors,omitempty"`
}

// MoveCategoryRequest represents a request to move a category
type MoveCategoryRequest struct {
	NewParentID string `json:"new_parent_id"`
	SortOrder   *int   `json:"sort_order,omitempty"`
}

// MergeCategoriesRequest represents a request to merge categories
type MergeCategoriesRequest struct {
	SourceIDs  []string `json:"source_ids"`
	TargetID   string   `json:"target_id"`
}

// MergeCategoriesResponse represents the response for merging categories
type MergeCategoriesResponse struct {
	MergedCategory      *Category `json:"merged_category"`
	SourcesMerged       int       `json:"sources_merged"`
	ProductsMoved       int       `json:"products_moved"`
	StoresMoved         int       `json:"stores_moved"`
	TransactionsMoved   int       `json:"transactions_moved"`
}

// CategoryHandler handles HTTP requests for admin category management
type CategoryHandler struct {
	mu         sync.RWMutex
	categories map[string]*Category
	stats      *CategoryStats
}

// NewCategoryHandler creates a new CategoryHandler instance
func NewCategoryHandler() *CategoryHandler {
	h := &CategoryHandler{
		categories: make(map[string]*Category),
		stats: &CategoryStats{
			TypeBreakdown:  make(map[string]int),
			DepthBreakdown: make(map[int]int),
			TopCategories:  []*Category{},
		},
	}
	h.initializeDefaultCategories()
	return h
}

// initializeDefaultCategories creates default system categories
func (h *CategoryHandler) initializeDefaultCategories() {
	now := time.Now()
	defaultCategories := []struct {
		Name  string
		Icon  string
		Color string
	}{
		{"Food & Dining", "utensils", "#FF6B6B"},
		{"Shopping", "shopping-cart", "#4ECDC4"},
		{"Transportation", "car", "#45B7D1"},
		{"Entertainment", "film", "#96CEB4"},
		{"Bills & Utilities", "file-invoice", "#FFEAA7"},
		{"Health & Medical", "heart-pulse", "#DDA0DD"},
		{"Travel", "plane", "#98D8C8"},
		{"Business", "briefcase", "#B8860B"},
		{"Personal Care", "spa", "#FFB6C1"},
		{"Other", "ellipsis-h", "#808080"},
	}

	for i, cat := range defaultCategories {
		id := uuid.New().String()
		category := &Category{
			ID:          id,
			Name:        cat.Name,
			Slug:        slugify(cat.Name),
			DisplayName: cat.Name,
			Type:        CategoryTypeSystem,
			Status:      CategoryStatusActive,
			Icon:        cat.Icon,
			Color:       cat.Color,
			SortOrder:   i,
			IsLeaf:      true,
			Depth:       0,
			Path:        "/" + slugify(cat.Name),
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		h.categories[id] = category
	}
	h.updateStats()
}

// HandleList handles GET /api/admin/categories
func (h *CategoryHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	// Get optional filters
	status := r.URL.Query().Get("status")
	categoryType := r.URL.Query().Get("type")
	parentID := r.URL.Query().Get("parent_id")

	h.mu.RLock()
	categories := make([]*Category, 0)
	for _, category := range h.categories {
		if status != "" && string(category.Status) != status {
			continue
		}
		if categoryType != "" && string(category.Type) != categoryType {
			continue
		}
		if parentID != "" && category.ParentID != parentID {
			continue
		}
		categories = append(categories, category)
	}
	h.mu.RUnlock()

	resp := ListCategoriesResponse{
		Categories: categories,
		Total:      len(categories),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleGet handles GET /api/admin/categories/{id}
func (h *CategoryHandler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	category, exists := h.categories[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Category not found")
		return
	}

	h.writeJSON(w, http.StatusOK, category)
}

// HandleCreate handles POST /api/admin/categories
func (h *CategoryHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req CreateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.Name == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "name is required")
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	// Check for duplicate slug
	slug := slugify(req.Name)
	for _, c := range h.categories {
		if c.Slug == slug && c.ParentID == req.ParentID {
			h.writeError(w, http.StatusConflict, "conflict", "Category with this name already exists at this level")
			return
		}
	}

	// Determine depth and path
	depth := 0
	path := "/" + slug
	if req.ParentID != "" {
		parent, exists := h.categories[req.ParentID]
		if !exists {
			h.writeError(w, http.StatusBadRequest, "validation_error", "parent category not found")
			return
		}
		depth = parent.Depth + 1
		path = parent.Path + "/" + slug
		parent.IsLeaf = false
		parent.ChildrenCount++
	}

	categoryType := CategoryTypeCustom
	if req.Type != "" {
		categoryType = req.Type
	}

	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}

	now := time.Now()
	category := &Category{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Slug:        slug,
		DisplayName: req.DisplayName,
		Description: req.Description,
		Type:        categoryType,
		Status:      CategoryStatusDraft,
		ParentID:    req.ParentID,
		Icon:        req.Icon,
		Color:       req.Color,
		SortOrder:   sortOrder,
		IsLeaf:      true,
		Depth:       depth,
		Path:        path,
		Tags:        req.Tags,
		Metadata:    req.Metadata,
		Rules:       req.Rules,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	h.categories[category.ID] = category
	h.updateStats()

	h.writeJSON(w, http.StatusCreated, category)
}

// HandleUpdate handles PUT/PATCH /api/admin/categories/{id}
func (h *CategoryHandler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req UpdateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	category, exists := h.categories[id]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Category not found")
		return
	}

	if req.Name != nil && *req.Name != category.Name {
		newSlug := slugify(*req.Name)
		for _, c := range h.categories {
			if c.ID != id && c.Slug == newSlug && c.ParentID == category.ParentID {
				h.writeError(w, http.StatusConflict, "conflict", "Category with this name already exists at this level")
				return
			}
		}
		category.Name = *req.Name
		category.Slug = newSlug
		// Update path
		if category.ParentID != "" {
			if parent, ok := h.categories[category.ParentID]; ok {
				category.Path = parent.Path + "/" + newSlug
			}
		} else {
			category.Path = "/" + newSlug
		}
	}

	if req.DisplayName != nil {
		category.DisplayName = *req.DisplayName
	}
	if req.Description != nil {
		category.Description = *req.Description
	}
	if req.Type != nil {
		category.Type = *req.Type
	}
	if req.Status != nil {
		category.Status = *req.Status
	}
	if req.Icon != nil {
		category.Icon = *req.Icon
	}
	if req.Color != nil {
		category.Color = *req.Color
	}
	if req.SortOrder != nil {
		category.SortOrder = *req.SortOrder
	}
	if req.Tags != nil {
		category.Tags = req.Tags
	}
	if req.Metadata != nil {
		category.Metadata = req.Metadata
	}
	if req.Rules != nil {
		category.Rules = req.Rules
	}

	category.UpdatedAt = time.Now()
	h.updateStats()

	h.writeJSON(w, http.StatusOK, category)
}

// HandleDelete handles DELETE /api/admin/categories/{id}
func (h *CategoryHandler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	category, exists := h.categories[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Category not found")
		return
	}

	// Check for children
	for _, c := range h.categories {
		if c.ParentID == id {
			h.mu.Unlock()
			h.writeError(w, http.StatusConflict, "conflict", "Cannot delete category with children")
			return
		}
	}

	// System categories cannot be deleted
	if category.Type == CategoryTypeSystem {
		h.mu.Unlock()
		h.writeError(w, http.StatusForbidden, "forbidden", "System categories cannot be deleted")
		return
	}

	// Update parent
	if category.ParentID != "" {
		if parent, ok := h.categories[category.ParentID]; ok {
			parent.ChildrenCount--
			if parent.ChildrenCount == 0 {
				parent.IsLeaf = true
			}
		}
	}

	delete(h.categories, id)
	h.updateStats()
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// HandleBulkCreate handles POST /api/admin/categories/bulk
func (h *CategoryHandler) HandleBulkCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req BulkCategoriesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if len(req.Categories) == 0 {
		h.writeError(w, http.StatusBadRequest, "validation_error", "categories is required")
		return
	}

	if len(req.Categories) > 100 {
		h.writeError(w, http.StatusBadRequest, "validation_error", "maximum 100 categories per bulk request")
		return
	}

	categories := make([]*Category, 0, len(req.Categories))
	created := 0
	failed := 0
	errors := make([]string, 0)
	now := time.Now()

	h.mu.Lock()
	for i, catReq := range req.Categories {
		if catReq.Name == "" {
			failed++
			errors = append(errors, "category at index "+string(rune('0'+i))+": name is required")
			continue
		}

		slug := slugify(catReq.Name)
		duplicate := false
		for _, c := range h.categories {
			if c.Slug == slug && c.ParentID == catReq.ParentID {
				duplicate = true
				break
			}
		}
		if duplicate {
			failed++
			errors = append(errors, "category at index "+string(rune('0'+i))+": duplicate name")
			continue
		}

		depth := 0
		path := "/" + slug
		if catReq.ParentID != "" {
			parent, exists := h.categories[catReq.ParentID]
			if !exists {
				failed++
				errors = append(errors, "category at index "+string(rune('0'+i))+": parent not found")
				continue
			}
			depth = parent.Depth + 1
			path = parent.Path + "/" + slug
			parent.IsLeaf = false
			parent.ChildrenCount++
		}

		categoryType := CategoryTypeCustom
		if catReq.Type != "" {
			categoryType = catReq.Type
		}

		sortOrder := 0
		if catReq.SortOrder != nil {
			sortOrder = *catReq.SortOrder
		}

		category := &Category{
			ID:          uuid.New().String(),
			Name:        catReq.Name,
			Slug:        slug,
			DisplayName: catReq.DisplayName,
			Description: catReq.Description,
			Type:        categoryType,
			Status:      CategoryStatusDraft,
			ParentID:    catReq.ParentID,
			Icon:        catReq.Icon,
			Color:       catReq.Color,
			SortOrder:   sortOrder,
			IsLeaf:      true,
			Depth:       depth,
			Path:        path,
			Tags:        catReq.Tags,
			Metadata:    catReq.Metadata,
			Rules:       catReq.Rules,
			CreatedAt:   now,
			UpdatedAt:   now,
		}

		h.categories[category.ID] = category
		categories = append(categories, category)
		created++
	}
	h.updateStats()
	h.mu.Unlock()

	resp := BulkCategoriesResponse{
		Categories:      categories,
		TotalCategories: len(req.Categories),
		Created:         created,
		Failed:          failed,
		Errors:          errors,
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleMove handles POST /api/admin/categories/{id}/move
func (h *CategoryHandler) HandleMove(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req MoveCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	category, exists := h.categories[id]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Category not found")
		return
	}

	// Verify new parent exists if specified
	var newParent *Category
	if req.NewParentID != "" {
		var parentExists bool
		newParent, parentExists = h.categories[req.NewParentID]
		if !parentExists {
			h.writeError(w, http.StatusBadRequest, "validation_error", "new parent category not found")
			return
		}
		// Prevent circular reference
		if req.NewParentID == id {
			h.writeError(w, http.StatusBadRequest, "validation_error", "category cannot be its own parent")
			return
		}
	}

	// Update old parent
	if category.ParentID != "" {
		if oldParent, ok := h.categories[category.ParentID]; ok {
			oldParent.ChildrenCount--
			if oldParent.ChildrenCount == 0 {
				oldParent.IsLeaf = true
			}
		}
	}

	// Update category
	category.ParentID = req.NewParentID
	if newParent != nil {
		category.Depth = newParent.Depth + 1
		category.Path = newParent.Path + "/" + category.Slug
		newParent.IsLeaf = false
		newParent.ChildrenCount++
	} else {
		category.Depth = 0
		category.Path = "/" + category.Slug
	}

	if req.SortOrder != nil {
		category.SortOrder = *req.SortOrder
	}

	category.UpdatedAt = time.Now()

	h.writeJSON(w, http.StatusOK, category)
}

// HandleMerge handles POST /api/admin/categories/merge
func (h *CategoryHandler) HandleMerge(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req MergeCategoriesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if len(req.SourceIDs) == 0 {
		h.writeError(w, http.StatusBadRequest, "validation_error", "source_ids is required")
		return
	}
	if req.TargetID == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "target_id is required")
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	target, exists := h.categories[req.TargetID]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Target category not found")
		return
	}

	productsMoved := 0
	storesMoved := 0
	transactionsMoved := 0

	for _, sourceID := range req.SourceIDs {
		if sourceID == req.TargetID {
			continue
		}
		source, exists := h.categories[sourceID]
		if !exists {
			continue
		}

		// Move counts
		productsMoved += source.ProductCount
		storesMoved += source.StoreCount
		transactionsMoved += source.TransactionCount

		target.ProductCount += source.ProductCount
		target.StoreCount += source.StoreCount
		target.TransactionCount += source.TransactionCount

		// Merge rules
		target.Rules = append(target.Rules, source.Rules...)

		// Update parent of source
		if source.ParentID != "" {
			if parent, ok := h.categories[source.ParentID]; ok {
				parent.ChildrenCount--
				if parent.ChildrenCount == 0 {
					parent.IsLeaf = true
				}
			}
		}

		delete(h.categories, sourceID)
	}

	target.UpdatedAt = time.Now()
	h.updateStats()

	resp := MergeCategoriesResponse{
		MergedCategory:    target,
		SourcesMerged:     len(req.SourceIDs),
		ProductsMoved:     productsMoved,
		StoresMoved:       storesMoved,
		TransactionsMoved: transactionsMoved,
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleActivate handles POST /api/admin/categories/{id}/activate
func (h *CategoryHandler) HandleActivate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.Lock()
	category, exists := h.categories[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Category not found")
		return
	}

	if category.Status == CategoryStatusActive {
		h.mu.Unlock()
		h.writeError(w, http.StatusConflict, "conflict", "Category is already active")
		return
	}

	category.Status = CategoryStatusActive
	category.UpdatedAt = time.Now()
	h.updateStats()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, category)
}

// HandleDeactivate handles POST /api/admin/categories/{id}/deactivate
func (h *CategoryHandler) HandleDeactivate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.Lock()
	category, exists := h.categories[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Category not found")
		return
	}

	if category.Status == CategoryStatusInactive {
		h.mu.Unlock()
		h.writeError(w, http.StatusConflict, "conflict", "Category is already inactive")
		return
	}

	category.Status = CategoryStatusInactive
	category.UpdatedAt = time.Now()
	h.updateStats()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, category)
}

// HandleGetTree handles GET /api/admin/categories/tree
func (h *CategoryHandler) HandleGetTree(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	tree := h.buildTree("")
	h.mu.RUnlock()

	h.writeJSON(w, http.StatusOK, map[string]any{
		"tree": tree,
	})
}

// HandleGetStats handles GET /api/admin/categories/stats
func (h *CategoryHandler) HandleGetStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	stats := *h.stats
	h.mu.RUnlock()

	h.writeJSON(w, http.StatusOK, stats)
}

// buildTree builds a category tree starting from a parent ID
func (h *CategoryHandler) buildTree(parentID string) []*CategoryTree {
	var result []*CategoryTree

	for _, category := range h.categories {
		if category.ParentID == parentID {
			tree := &CategoryTree{
				Category: category,
				Children: h.buildTree(category.ID),
			}
			result = append(result, tree)
		}
	}

	return result
}

// updateStats recalculates category statistics
func (h *CategoryHandler) updateStats() {
	h.stats.TotalCategories = len(h.categories)
	h.stats.ActiveCategories = 0
	h.stats.InactiveCategories = 0
	h.stats.TypeBreakdown = make(map[string]int)
	h.stats.DepthBreakdown = make(map[int]int)

	for _, category := range h.categories {
		switch category.Status {
		case CategoryStatusActive:
			h.stats.ActiveCategories++
		case CategoryStatusInactive:
			h.stats.InactiveCategories++
		}
		h.stats.TypeBreakdown[string(category.Type)]++
		h.stats.DepthBreakdown[category.Depth]++
	}
}

// slugify converts a name to a URL-friendly slug
func slugify(name string) string {
	result := ""
	lastWasDash := false
	for _, c := range name {
		if c >= 'A' && c <= 'Z' {
			result += string(c - 'A' + 'a')
			lastWasDash = false
		} else if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') {
			result += string(c)
			lastWasDash = false
		} else if c == ' ' || c == '-' || c == '_' {
			if !lastWasDash && len(result) > 0 {
				result += "-"
				lastWasDash = true
			}
		}
	}
	// Trim trailing dash
	if len(result) > 0 && result[len(result)-1] == '-' {
		result = result[:len(result)-1]
	}
	return result
}

// writeJSON writes a JSON response
func (h *CategoryHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *CategoryHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}
