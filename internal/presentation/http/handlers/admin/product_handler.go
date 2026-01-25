package admin

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
)

// ProductStatus represents the status of a product
type ProductStatus string

const (
	ProductStatusActive   ProductStatus = "active"
	ProductStatusInactive ProductStatus = "inactive"
	ProductStatusDraft    ProductStatus = "draft"
	ProductStatusArchived ProductStatus = "archived"
)

// ProductType represents the type of product
type ProductType string

const (
	ProductTypePhysical     ProductType = "physical"
	ProductTypeDigital      ProductType = "digital"
	ProductTypeService      ProductType = "service"
	ProductTypeSubscription ProductType = "subscription"
)

// Product represents a product/item in the system
type Product struct {
	ID              string            `json:"id"`
	Name            string            `json:"name"`
	NormalizedName  string            `json:"normalized_name"`
	DisplayName     string            `json:"display_name,omitempty"`
	Description     string            `json:"description,omitempty"`
	Type            ProductType       `json:"type"`
	Status          ProductStatus     `json:"status"`
	CategoryID      string            `json:"category_id,omitempty"`
	StoreID         string            `json:"store_id,omitempty"`
	SKU             string            `json:"sku,omitempty"`
	Barcode         string            `json:"barcode,omitempty"`
	Brand           string            `json:"brand,omitempty"`
	Price           *float64          `json:"price,omitempty"`
	Currency        string            `json:"currency,omitempty"`
	Unit            string            `json:"unit,omitempty"`
	ImageURL        string            `json:"image_url,omitempty"`
	Tags            []string          `json:"tags,omitempty"`
	Aliases         []string          `json:"aliases,omitempty"`
	Metadata        map[string]string `json:"metadata,omitempty"`
	ReceiptPatterns []string          `json:"receipt_patterns,omitempty"`
	MatchCount      int               `json:"match_count"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
	CreatedBy       string            `json:"created_by,omitempty"`
	UpdatedBy       string            `json:"updated_by,omitempty"`
}

// ProductStats represents statistics for products
type ProductStats struct {
	TotalProducts     int            `json:"total_products"`
	ActiveProducts    int            `json:"active_products"`
	InactiveProducts  int            `json:"inactive_products"`
	DraftProducts     int            `json:"draft_products"`
	TypeBreakdown     map[string]int `json:"type_breakdown"`
	CategoryBreakdown map[string]int `json:"category_breakdown"`
	StoreBreakdown    map[string]int `json:"store_breakdown"`
	TopProducts       []*Product     `json:"top_products"`
}

// ListProductsResponse represents a list of products
type ListProductsResponse struct {
	Products []*Product `json:"products"`
	Total    int        `json:"total"`
}

// CreateProductRequest represents a request to create a product
type CreateProductRequest struct {
	Name            string            `json:"name"`
	DisplayName     string            `json:"display_name,omitempty"`
	Description     string            `json:"description,omitempty"`
	Type            ProductType       `json:"type"`
	CategoryID      string            `json:"category_id,omitempty"`
	StoreID         string            `json:"store_id,omitempty"`
	SKU             string            `json:"sku,omitempty"`
	Barcode         string            `json:"barcode,omitempty"`
	Brand           string            `json:"brand,omitempty"`
	Price           *float64          `json:"price,omitempty"`
	Currency        string            `json:"currency,omitempty"`
	Unit            string            `json:"unit,omitempty"`
	ImageURL        string            `json:"image_url,omitempty"`
	Tags            []string          `json:"tags,omitempty"`
	Aliases         []string          `json:"aliases,omitempty"`
	Metadata        map[string]string `json:"metadata,omitempty"`
	ReceiptPatterns []string          `json:"receipt_patterns,omitempty"`
}

// UpdateProductRequest represents a request to update a product
type UpdateProductRequest struct {
	Name            *string            `json:"name,omitempty"`
	DisplayName     *string            `json:"display_name,omitempty"`
	Description     *string            `json:"description,omitempty"`
	Type            *ProductType       `json:"type,omitempty"`
	Status          *ProductStatus     `json:"status,omitempty"`
	CategoryID      *string            `json:"category_id,omitempty"`
	StoreID         *string            `json:"store_id,omitempty"`
	SKU             *string            `json:"sku,omitempty"`
	Barcode         *string            `json:"barcode,omitempty"`
	Brand           *string            `json:"brand,omitempty"`
	Price           *float64           `json:"price,omitempty"`
	Currency        *string            `json:"currency,omitempty"`
	Unit            *string            `json:"unit,omitempty"`
	ImageURL        *string            `json:"image_url,omitempty"`
	Tags            []string           `json:"tags,omitempty"`
	Aliases         []string           `json:"aliases,omitempty"`
	Metadata        map[string]string  `json:"metadata,omitempty"`
	ReceiptPatterns []string           `json:"receipt_patterns,omitempty"`
}

// BulkProductsRequest represents a request for bulk product operations
type BulkProductsRequest struct {
	Products []CreateProductRequest `json:"products"`
}

// BulkProductsResponse represents the response for bulk product operations
type BulkProductsResponse struct {
	Products      []*Product `json:"products"`
	TotalProducts int        `json:"total_products"`
	Created       int        `json:"created"`
	Failed        int        `json:"failed"`
	Errors        []string   `json:"errors,omitempty"`
}

// BulkUpdateProductsRequest represents a bulk update request
type BulkUpdateProductsRequest struct {
	ProductIDs []string             `json:"product_ids"`
	Update     UpdateProductRequest `json:"update"`
}

// BulkDeleteProductsRequest represents a bulk delete request
type BulkDeleteProductsRequest struct {
	ProductIDs []string `json:"product_ids"`
}

// BulkDeleteProductsResponse represents a bulk delete response
type BulkDeleteProductsResponse struct {
	DeletedCount int      `json:"deleted_count"`
	FailedIDs    []string `json:"failed_ids,omitempty"`
}

// MergeProductsRequest represents a request to merge products
type MergeProductsRequest struct {
	SourceIDs  []string `json:"source_ids"`
	TargetID   string   `json:"target_id,omitempty"`
	TargetData *Product `json:"target_data,omitempty"`
}

// MergeProductsResponse represents the response for merging products
type MergeProductsResponse struct {
	MergedProduct  *Product `json:"merged_product"`
	SourcesMerged  int      `json:"sources_merged"`
	PatternsMerged int      `json:"patterns_merged"`
}

// ProductSearchRequest represents a product search request
type ProductSearchRequest struct {
	Query      string         `json:"query"`
	Type       *ProductType   `json:"type,omitempty"`
	CategoryID string         `json:"category_id,omitempty"`
	StoreID    string         `json:"store_id,omitempty"`
	Status     *ProductStatus `json:"status,omitempty"`
	MinPrice   *float64       `json:"min_price,omitempty"`
	MaxPrice   *float64       `json:"max_price,omitempty"`
	Limit      int            `json:"limit,omitempty"`
}

// ProductHandler handles HTTP requests for admin product management
type ProductHandler struct {
	mu       sync.RWMutex
	products map[string]*Product
	stats    *ProductStats
}

// NewProductHandler creates a new ProductHandler instance
func NewProductHandler() *ProductHandler {
	return &ProductHandler{
		products: make(map[string]*Product),
		stats: &ProductStats{
			TypeBreakdown:     make(map[string]int),
			CategoryBreakdown: make(map[string]int),
			StoreBreakdown:    make(map[string]int),
			TopProducts:       []*Product{},
		},
	}
}

// HandleList handles GET /api/admin/products
func (h *ProductHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	// Get optional filters
	status := r.URL.Query().Get("status")
	productType := r.URL.Query().Get("type")
	categoryID := r.URL.Query().Get("category_id")
	storeID := r.URL.Query().Get("store_id")

	h.mu.RLock()
	products := make([]*Product, 0)
	for _, product := range h.products {
		if status != "" && string(product.Status) != status {
			continue
		}
		if productType != "" && string(product.Type) != productType {
			continue
		}
		if categoryID != "" && product.CategoryID != categoryID {
			continue
		}
		if storeID != "" && product.StoreID != storeID {
			continue
		}
		products = append(products, product)
	}
	h.mu.RUnlock()

	resp := ListProductsResponse{
		Products: products,
		Total:    len(products),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleGet handles GET /api/admin/products/{id}
func (h *ProductHandler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	product, exists := h.products[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Product not found")
		return
	}

	h.writeJSON(w, http.StatusOK, product)
}

// HandleCreate handles POST /api/admin/products
func (h *ProductHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req CreateProductRequest
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

	now := time.Now()
	product := &Product{
		ID:              uuid.New().String(),
		Name:            req.Name,
		NormalizedName:  normalizeProductName(req.Name),
		DisplayName:     req.DisplayName,
		Description:     req.Description,
		Type:            req.Type,
		Status:          ProductStatusDraft,
		CategoryID:      req.CategoryID,
		StoreID:         req.StoreID,
		SKU:             req.SKU,
		Barcode:         req.Barcode,
		Brand:           req.Brand,
		Price:           req.Price,
		Currency:        req.Currency,
		Unit:            req.Unit,
		ImageURL:        req.ImageURL,
		Tags:            req.Tags,
		Aliases:         req.Aliases,
		Metadata:        req.Metadata,
		ReceiptPatterns: req.ReceiptPatterns,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	h.mu.Lock()
	h.products[product.ID] = product
	h.updateStats()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusCreated, product)
}

// HandleUpdate handles PUT/PATCH /api/admin/products/{id}
func (h *ProductHandler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req UpdateProductRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	product, exists := h.products[id]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Product not found")
		return
	}

	if req.Name != nil {
		product.Name = *req.Name
		product.NormalizedName = normalizeProductName(*req.Name)
	}
	if req.DisplayName != nil {
		product.DisplayName = *req.DisplayName
	}
	if req.Description != nil {
		product.Description = *req.Description
	}
	if req.Type != nil {
		product.Type = *req.Type
	}
	if req.Status != nil {
		product.Status = *req.Status
	}
	if req.CategoryID != nil {
		product.CategoryID = *req.CategoryID
	}
	if req.StoreID != nil {
		product.StoreID = *req.StoreID
	}
	if req.SKU != nil {
		product.SKU = *req.SKU
	}
	if req.Barcode != nil {
		product.Barcode = *req.Barcode
	}
	if req.Brand != nil {
		product.Brand = *req.Brand
	}
	if req.Price != nil {
		product.Price = req.Price
	}
	if req.Currency != nil {
		product.Currency = *req.Currency
	}
	if req.Unit != nil {
		product.Unit = *req.Unit
	}
	if req.ImageURL != nil {
		product.ImageURL = *req.ImageURL
	}
	if req.Tags != nil {
		product.Tags = req.Tags
	}
	if req.Aliases != nil {
		product.Aliases = req.Aliases
	}
	if req.Metadata != nil {
		product.Metadata = req.Metadata
	}
	if req.ReceiptPatterns != nil {
		product.ReceiptPatterns = req.ReceiptPatterns
	}

	product.UpdatedAt = time.Now()
	h.updateStats()

	h.writeJSON(w, http.StatusOK, product)
}

// HandleDelete handles DELETE /api/admin/products/{id}
func (h *ProductHandler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	_, exists := h.products[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Product not found")
		return
	}
	delete(h.products, id)
	h.updateStats()
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// HandleBulkCreate handles POST /api/admin/products/bulk
func (h *ProductHandler) HandleBulkCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req BulkProductsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if len(req.Products) == 0 {
		h.writeError(w, http.StatusBadRequest, "validation_error", "products is required")
		return
	}

	if len(req.Products) > 100 {
		h.writeError(w, http.StatusBadRequest, "validation_error", "maximum 100 products per bulk request")
		return
	}

	products := make([]*Product, 0, len(req.Products))
	created := 0
	failed := 0
	errors := make([]string, 0)
	now := time.Now()

	h.mu.Lock()
	for i, prodReq := range req.Products {
		if prodReq.Name == "" || prodReq.Type == "" {
			failed++
			errors = append(errors, "product at index "+string(rune('0'+i))+": name and type are required")
			continue
		}

		product := &Product{
			ID:              uuid.New().String(),
			Name:            prodReq.Name,
			NormalizedName:  normalizeProductName(prodReq.Name),
			DisplayName:     prodReq.DisplayName,
			Description:     prodReq.Description,
			Type:            prodReq.Type,
			Status:          ProductStatusDraft,
			CategoryID:      prodReq.CategoryID,
			StoreID:         prodReq.StoreID,
			SKU:             prodReq.SKU,
			Barcode:         prodReq.Barcode,
			Brand:           prodReq.Brand,
			Price:           prodReq.Price,
			Currency:        prodReq.Currency,
			Unit:            prodReq.Unit,
			ImageURL:        prodReq.ImageURL,
			Tags:            prodReq.Tags,
			Aliases:         prodReq.Aliases,
			Metadata:        prodReq.Metadata,
			ReceiptPatterns: prodReq.ReceiptPatterns,
			CreatedAt:       now,
			UpdatedAt:       now,
		}

		h.products[product.ID] = product
		products = append(products, product)
		created++
	}
	h.updateStats()
	h.mu.Unlock()

	resp := BulkProductsResponse{
		Products:      products,
		TotalProducts: len(req.Products),
		Created:       created,
		Failed:        failed,
		Errors:        errors,
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleBulkUpdate handles PUT /api/admin/products/bulk
func (h *ProductHandler) HandleBulkUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req BulkUpdateProductsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if len(req.ProductIDs) == 0 {
		h.writeError(w, http.StatusBadRequest, "validation_error", "product_ids is required")
		return
	}

	h.mu.Lock()
	updatedProducts := make([]*Product, 0, len(req.ProductIDs))
	now := time.Now()

	for _, id := range req.ProductIDs {
		product, exists := h.products[id]
		if !exists {
			continue
		}

		if req.Update.Status != nil {
			product.Status = *req.Update.Status
		}
		if req.Update.CategoryID != nil {
			product.CategoryID = *req.Update.CategoryID
		}
		if req.Update.Tags != nil {
			product.Tags = req.Update.Tags
		}

		product.UpdatedAt = now
		updatedProducts = append(updatedProducts, product)
	}
	h.updateStats()
	h.mu.Unlock()

	resp := ListProductsResponse{
		Products: updatedProducts,
		Total:    len(updatedProducts),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleBulkDelete handles DELETE /api/admin/products/bulk
func (h *ProductHandler) HandleBulkDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE/POST methods are allowed")
		return
	}

	var req BulkDeleteProductsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if len(req.ProductIDs) == 0 {
		h.writeError(w, http.StatusBadRequest, "validation_error", "product_ids is required")
		return
	}

	h.mu.Lock()
	deletedCount := 0
	failedIDs := make([]string, 0)

	for _, id := range req.ProductIDs {
		if _, exists := h.products[id]; exists {
			delete(h.products, id)
			deletedCount++
		} else {
			failedIDs = append(failedIDs, id)
		}
	}
	h.updateStats()
	h.mu.Unlock()

	resp := BulkDeleteProductsResponse{
		DeletedCount: deletedCount,
		FailedIDs:    failedIDs,
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleMerge handles POST /api/admin/products/merge
func (h *ProductHandler) HandleMerge(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req MergeProductsRequest
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

	// Verify all source products exist
	sourceProducts := make([]*Product, 0, len(req.SourceIDs))
	for _, id := range req.SourceIDs {
		product, exists := h.products[id]
		if !exists {
			h.writeError(w, http.StatusNotFound, "not_found", "Product not found: "+id)
			return
		}
		sourceProducts = append(sourceProducts, product)
	}

	// Determine target product
	var targetProduct *Product
	if req.TargetID != "" {
		var exists bool
		targetProduct, exists = h.products[req.TargetID]
		if !exists {
			h.writeError(w, http.StatusNotFound, "not_found", "Target product not found")
			return
		}
	} else if req.TargetData != nil {
		targetProduct = req.TargetData
		targetProduct.ID = uuid.New().String()
		targetProduct.CreatedAt = time.Now()
	} else {
		targetProduct = sourceProducts[0]
	}

	// Merge aliases and patterns
	aliasSet := make(map[string]bool)
	patternSet := make(map[string]bool)
	totalMatchCount := 0

	for _, product := range sourceProducts {
		for _, alias := range product.Aliases {
			aliasSet[alias] = true
		}
		aliasSet[product.Name] = true
		for _, pattern := range product.ReceiptPatterns {
			patternSet[pattern] = true
		}
		totalMatchCount += product.MatchCount
	}

	aliases := make([]string, 0, len(aliasSet))
	for alias := range aliasSet {
		if alias != targetProduct.Name {
			aliases = append(aliases, alias)
		}
	}

	patterns := make([]string, 0, len(patternSet))
	for pattern := range patternSet {
		patterns = append(patterns, pattern)
	}

	targetProduct.Aliases = aliases
	targetProduct.ReceiptPatterns = patterns
	targetProduct.MatchCount = totalMatchCount
	targetProduct.UpdatedAt = time.Now()

	// Delete source products (except target)
	for _, id := range req.SourceIDs {
		if id != targetProduct.ID {
			delete(h.products, id)
		}
	}

	h.products[targetProduct.ID] = targetProduct
	h.updateStats()

	resp := MergeProductsResponse{
		MergedProduct:  targetProduct,
		SourcesMerged:  len(req.SourceIDs),
		PatternsMerged: len(patterns),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleActivate handles POST /api/admin/products/{id}/activate
func (h *ProductHandler) HandleActivate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.Lock()
	product, exists := h.products[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Product not found")
		return
	}

	if product.Status == ProductStatusActive {
		h.mu.Unlock()
		h.writeError(w, http.StatusConflict, "conflict", "Product is already active")
		return
	}

	product.Status = ProductStatusActive
	product.UpdatedAt = time.Now()
	h.updateStats()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, product)
}

// HandleDeactivate handles POST /api/admin/products/{id}/deactivate
func (h *ProductHandler) HandleDeactivate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.Lock()
	product, exists := h.products[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Product not found")
		return
	}

	if product.Status == ProductStatusInactive {
		h.mu.Unlock()
		h.writeError(w, http.StatusConflict, "conflict", "Product is already inactive")
		return
	}

	product.Status = ProductStatusInactive
	product.UpdatedAt = time.Now()
	h.updateStats()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, product)
}

// HandleSearch handles POST /api/admin/products/search
func (h *ProductHandler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req ProductSearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	limit := 20
	if req.Limit > 0 && req.Limit <= 100 {
		limit = req.Limit
	}

	h.mu.RLock()
	products := make([]*Product, 0)
	for _, product := range h.products {
		if req.Query != "" && !productMatchesQuery(product, req.Query) {
			continue
		}
		if req.Type != nil && product.Type != *req.Type {
			continue
		}
		if req.CategoryID != "" && product.CategoryID != req.CategoryID {
			continue
		}
		if req.StoreID != "" && product.StoreID != req.StoreID {
			continue
		}
		if req.Status != nil && product.Status != *req.Status {
			continue
		}
		if req.MinPrice != nil && (product.Price == nil || *product.Price < *req.MinPrice) {
			continue
		}
		if req.MaxPrice != nil && (product.Price == nil || *product.Price > *req.MaxPrice) {
			continue
		}
		products = append(products, product)
		if len(products) >= limit {
			break
		}
	}
	h.mu.RUnlock()

	resp := ListProductsResponse{
		Products: products,
		Total:    len(products),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleGetStats handles GET /api/admin/products/stats
func (h *ProductHandler) HandleGetStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	stats := *h.stats
	h.mu.RUnlock()

	h.writeJSON(w, http.StatusOK, stats)
}

// updateStats recalculates product statistics
func (h *ProductHandler) updateStats() {
	h.stats.TotalProducts = len(h.products)
	h.stats.ActiveProducts = 0
	h.stats.InactiveProducts = 0
	h.stats.DraftProducts = 0
	h.stats.TypeBreakdown = make(map[string]int)
	h.stats.CategoryBreakdown = make(map[string]int)
	h.stats.StoreBreakdown = make(map[string]int)

	for _, product := range h.products {
		switch product.Status {
		case ProductStatusActive:
			h.stats.ActiveProducts++
		case ProductStatusInactive:
			h.stats.InactiveProducts++
		case ProductStatusDraft:
			h.stats.DraftProducts++
		}
		h.stats.TypeBreakdown[string(product.Type)]++
		if product.CategoryID != "" {
			h.stats.CategoryBreakdown[product.CategoryID]++
		}
		if product.StoreID != "" {
			h.stats.StoreBreakdown[product.StoreID]++
		}
	}
}

// normalizeProductName normalizes a product name for comparison
func normalizeProductName(name string) string {
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

// productMatchesQuery checks if a product matches a search query
func productMatchesQuery(product *Product, query string) bool {
	normalizedQuery := normalizeProductName(query)
	if containsNormalizedProduct(product.NormalizedName, normalizedQuery) {
		return true
	}
	if containsNormalizedProduct(product.DisplayName, normalizedQuery) {
		return true
	}
	if containsNormalizedProduct(product.Brand, normalizedQuery) {
		return true
	}
	for _, alias := range product.Aliases {
		if containsNormalizedProduct(alias, normalizedQuery) {
			return true
		}
	}
	return false
}

// containsNormalizedProduct checks if a string contains another after normalization
func containsNormalizedProduct(s, substr string) bool {
	if substr == "" {
		return true
	}
	normalized := normalizeProductName(s)
	for i := 0; i <= len(normalized)-len(substr); i++ {
		if normalized[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// writeJSON writes a JSON response
func (h *ProductHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *ProductHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}
