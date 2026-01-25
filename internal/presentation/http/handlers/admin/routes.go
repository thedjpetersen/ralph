package admin

import (
	"net/http"
	"strings"
)

// Router handles routing for admin-related endpoints
type Router struct {
	userHandler      *UserHandler
	queueHandler     *QueueHandler
	patternHandler   *PatternHandler
	geocodingHandler *GeocodingHandler
	ocrHandler       *OCRHandler
	storeHandler     *StoreHandler
	productHandler   *ProductHandler
	categoryHandler  *CategoryHandler
	configHandler    *ConfigHandler
}

// NewRouter creates a new Router with the given handlers
func NewRouter(
	userHandler *UserHandler,
	queueHandler *QueueHandler,
	patternHandler *PatternHandler,
	geocodingHandler *GeocodingHandler,
	ocrHandler *OCRHandler,
	storeHandler *StoreHandler,
	productHandler *ProductHandler,
	categoryHandler *CategoryHandler,
	configHandler *ConfigHandler,
) *Router {
	return &Router{
		userHandler:      userHandler,
		queueHandler:     queueHandler,
		patternHandler:   patternHandler,
		geocodingHandler: geocodingHandler,
		ocrHandler:       ocrHandler,
		storeHandler:     storeHandler,
		productHandler:   productHandler,
		categoryHandler:  categoryHandler,
		configHandler:    configHandler,
	}
}

// NewDefaultRouter creates a new Router with default handlers
func NewDefaultRouter() *Router {
	return &Router{
		userHandler:      NewUserHandler(),
		queueHandler:     NewQueueHandler(),
		patternHandler:   NewPatternHandler(),
		geocodingHandler: NewGeocodingHandler(),
		ocrHandler:       NewOCRHandler(),
		storeHandler:     NewStoreHandler(),
		productHandler:   NewProductHandler(),
		categoryHandler:  NewCategoryHandler(),
		configHandler:    NewConfigHandler(),
	}
}

// RegisterRoutes registers all admin routes with the given mux
// Note: These routes should be wrapped with RequireAdmin middleware by the caller
//
// User Management Endpoints (8):
//   1. GET    /api/admin/users                    - List all users (with ?status and ?role filters)
//   2. POST   /api/admin/users                    - Create a new user
//   3. GET    /api/admin/users/{id}               - Get user by ID
//   4. PUT    /api/admin/users/{id}               - Update user
//   5. DELETE /api/admin/users/{id}               - Delete user
//   6. POST   /api/admin/users/{id}/suspend       - Suspend user
//   7. POST   /api/admin/users/{id}/unsuspend     - Unsuspend user
//   8. POST   /api/admin/users/{id}/impersonate   - Generate impersonation token
//
// Queue Management Endpoints (11):
//   9.  GET    /api/admin/queues                    - List all queues (with ?status filter)
//  10. GET    /api/admin/queues/stats              - Get aggregate queue statistics
//  11. GET    /api/admin/queues/{name}             - Get queue by name
//  12. GET    /api/admin/queues/{name}/jobs        - List jobs in queue (with ?status filter)
//  13. POST   /api/admin/queues/{name}/flush       - Flush queue (with ?status filter)
//  14. POST   /api/admin/queues/{name}/pause       - Pause queue processing
//  15. POST   /api/admin/queues/{name}/resume      - Resume queue processing
//  16. GET    /api/admin/queues/{name}/jobs/{id}   - Get job by ID
//  17. POST   /api/admin/queues/{name}/jobs/{id}/retry  - Retry a failed/cancelled job
//  18. POST   /api/admin/queues/{name}/jobs/{id}/cancel - Cancel a pending/processing job
//  19. DELETE /api/admin/queues/{name}/jobs/{id}   - Delete a job
//
// Pattern Management Endpoints (9):
//  20. GET    /api/admin/patterns                  - List all patterns (with filters)
//  21. POST   /api/admin/patterns                  - Create a new pattern
//  22. POST   /api/admin/patterns/test             - Test a pattern without storing
//  23. GET    /api/admin/patterns/{id}             - Get pattern by ID
//  24. PUT    /api/admin/patterns/{id}             - Update pattern
//  25. DELETE /api/admin/patterns/{id}             - Delete pattern
//  26. POST   /api/admin/patterns/{id}/activate    - Activate a pattern
//  27. POST   /api/admin/patterns/{id}/deactivate  - Deactivate a pattern
//  28. POST   /api/admin/patterns/{id}/test        - Test a stored pattern
//
// Geocoding Management Endpoints (10):
//  29. GET    /api/admin/geocoding                 - List all geocoding results
//  30. POST   /api/admin/geocoding                 - Geocode an address
//  31. POST   /api/admin/geocoding/bulk            - Bulk geocode addresses
//  32. GET    /api/admin/geocoding/stats           - Get geocoding statistics
//  33. GET    /api/admin/geocoding/cache           - List geocoding cache entries
//  34. POST   /api/admin/geocoding/cache/purge     - Purge geocoding cache
//  35. GET    /api/admin/geocoding/config          - Get geocoding configuration
//  36. PUT    /api/admin/geocoding/config          - Update geocoding configuration
//  37. GET    /api/admin/geocoding/{id}            - Get geocoding result by ID
//  38. DELETE /api/admin/geocoding/{id}            - Delete geocoding result
//
// OCR Management Endpoints (10):
//  39. GET    /api/admin/ocr                       - List all OCR jobs
//  40. POST   /api/admin/ocr                       - Create an OCR job
//  41. POST   /api/admin/ocr/bulk                  - Bulk create OCR jobs
//  42. GET    /api/admin/ocr/stats                 - Get OCR statistics
//  43. GET    /api/admin/ocr/config                - Get OCR configuration
//  44. PUT    /api/admin/ocr/config                - Update OCR configuration
//  45. GET    /api/admin/ocr/{id}                  - Get OCR job by ID
//  46. DELETE /api/admin/ocr/{id}                  - Delete OCR job
//  47. POST   /api/admin/ocr/{id}/reprocess        - Reprocess OCR job
//  48. GET    /api/admin/ocr/{id}/extractions      - Get OCR extractions
//
// Store Management Endpoints (11):
//  49. GET    /api/admin/stores                    - List all stores
//  50. POST   /api/admin/stores                    - Create a store
//  51. POST   /api/admin/stores/bulk               - Bulk create stores
//  52. POST   /api/admin/stores/merge              - Merge stores
//  53. POST   /api/admin/stores/search             - Search stores
//  54. GET    /api/admin/stores/stats              - Get store statistics
//  55. GET    /api/admin/stores/{id}               - Get store by ID
//  56. PUT    /api/admin/stores/{id}               - Update store
//  57. DELETE /api/admin/stores/{id}               - Delete store
//  58. POST   /api/admin/stores/{id}/activate      - Activate store
//  59. POST   /api/admin/stores/{id}/deactivate    - Deactivate store
//
// Product Management Endpoints (13):
//  60. GET    /api/admin/products                  - List all products
//  61. POST   /api/admin/products                  - Create a product
//  62. POST   /api/admin/products/bulk             - Bulk create products
//  63. PUT    /api/admin/products/bulk             - Bulk update products
//  64. DELETE /api/admin/products/bulk             - Bulk delete products
//  65. POST   /api/admin/products/merge            - Merge products
//  66. POST   /api/admin/products/search           - Search products
//  67. GET    /api/admin/products/stats            - Get product statistics
//  68. GET    /api/admin/products/{id}             - Get product by ID
//  69. PUT    /api/admin/products/{id}             - Update product
//  70. DELETE /api/admin/products/{id}             - Delete product
//  71. POST   /api/admin/products/{id}/activate    - Activate product
//  72. POST   /api/admin/products/{id}/deactivate  - Deactivate product
//
// Category Management Endpoints (12):
//  73. GET    /api/admin/categories                - List all categories
//  74. POST   /api/admin/categories                - Create a category
//  75. POST   /api/admin/categories/bulk           - Bulk create categories
//  76. POST   /api/admin/categories/merge          - Merge categories
//  77. GET    /api/admin/categories/tree           - Get category tree
//  78. GET    /api/admin/categories/stats          - Get category statistics
//  79. GET    /api/admin/categories/{id}           - Get category by ID
//  80. PUT    /api/admin/categories/{id}           - Update category
//  81. DELETE /api/admin/categories/{id}           - Delete category
//  82. POST   /api/admin/categories/{id}/move      - Move category
//  83. POST   /api/admin/categories/{id}/activate  - Activate category
//  84. POST   /api/admin/categories/{id}/deactivate - Deactivate category
//
// Configuration Management Endpoints (14):
//  85. GET    /api/admin/config                    - List all configs
//  86. POST   /api/admin/config                    - Create a config
//  87. PUT    /api/admin/config/bulk               - Bulk update configs
//  88. GET    /api/admin/config/history            - Get config change history
//  89. GET    /api/admin/config/stats              - Get config statistics
//  90. GET    /api/admin/config/flags              - List feature flags
//  91. POST   /api/admin/config/flags              - Create feature flag
//  92. GET    /api/admin/config/{key}              - Get config by key
//  93. PUT    /api/admin/config/{key}              - Update config
//  94. DELETE /api/admin/config/{key}              - Delete config
//  95. POST   /api/admin/config/{key}/reset        - Reset config to default
//  96. GET    /api/admin/config/flags/{key}        - Get feature flag
//  97. PUT    /api/admin/config/flags/{key}        - Update feature flag
//  98. DELETE /api/admin/config/flags/{key}        - Delete feature flag
//  99. POST   /api/admin/config/flags/{key}/toggle - Toggle feature flag
//
// Total: 99 endpoints
func (r *Router) RegisterRoutes(mux *http.ServeMux) {
	// User management routes
	mux.HandleFunc("/api/admin/users", r.handleUsers)
	mux.HandleFunc("/api/admin/users/", r.handleUserByID)

	// Queue management routes
	mux.HandleFunc("/api/admin/queues", r.handleQueues)
	mux.HandleFunc("/api/admin/queues/", r.handleQueueByName)

	// Pattern management routes
	mux.HandleFunc("/api/admin/patterns", r.handlePatterns)
	mux.HandleFunc("/api/admin/patterns/", r.handlePatternByID)

	// Geocoding management routes
	mux.HandleFunc("/api/admin/geocoding", r.handleGeocoding)
	mux.HandleFunc("/api/admin/geocoding/", r.handleGeocodingByID)

	// OCR management routes
	mux.HandleFunc("/api/admin/ocr", r.handleOCR)
	mux.HandleFunc("/api/admin/ocr/", r.handleOCRByID)

	// Store management routes
	mux.HandleFunc("/api/admin/stores", r.handleStores)
	mux.HandleFunc("/api/admin/stores/", r.handleStoreByID)

	// Product management routes
	mux.HandleFunc("/api/admin/products", r.handleProducts)
	mux.HandleFunc("/api/admin/products/", r.handleProductByID)

	// Category management routes
	mux.HandleFunc("/api/admin/categories", r.handleCategories)
	mux.HandleFunc("/api/admin/categories/", r.handleCategoryByID)

	// Configuration management routes
	mux.HandleFunc("/api/admin/config", r.handleConfig)
	mux.HandleFunc("/api/admin/config/", r.handleConfigByKey)
}

// handleUsers routes requests for /api/admin/users
func (r *Router) handleUsers(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.userHandler.HandleList(w, req)
	case http.MethodPost:
		r.userHandler.HandleCreate(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleUserByID routes requests for /api/admin/users/{id} and sub-resources
func (r *Router) handleUserByID(w http.ResponseWriter, req *http.Request) {
	path := strings.TrimPrefix(req.URL.Path, "/api/admin/users/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "User ID required", http.StatusBadRequest)
		return
	}

	userID := parts[0]

	if len(parts) > 1 {
		switch parts[1] {
		case "suspend":
			r.userHandler.HandleSuspend(w, req, userID)
			return
		case "unsuspend":
			r.userHandler.HandleUnsuspend(w, req, userID)
			return
		case "impersonate":
			r.userHandler.HandleImpersonate(w, req, userID)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	switch req.Method {
	case http.MethodGet:
		r.userHandler.HandleGet(w, req, userID)
	case http.MethodPut, http.MethodPatch:
		r.userHandler.HandleUpdate(w, req, userID)
	case http.MethodDelete:
		r.userHandler.HandleDelete(w, req, userID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleQueues routes requests for /api/admin/queues
func (r *Router) handleQueues(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.queueHandler.HandleListQueues(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleQueueByName routes requests for /api/admin/queues/{name} and sub-resources
func (r *Router) handleQueueByName(w http.ResponseWriter, req *http.Request) {
	path := strings.TrimPrefix(req.URL.Path, "/api/admin/queues/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "Queue name required", http.StatusBadRequest)
		return
	}

	queueName := parts[0]

	if queueName == "stats" && len(parts) == 1 {
		r.queueHandler.HandleGetStats(w, req)
		return
	}

	if len(parts) > 1 {
		switch parts[1] {
		case "jobs":
			r.handleQueueJobs(w, req, queueName, parts[2:])
			return
		case "flush":
			r.queueHandler.HandleFlushQueue(w, req, queueName)
			return
		case "pause":
			r.queueHandler.HandlePauseQueue(w, req, queueName)
			return
		case "resume":
			r.queueHandler.HandleResumeQueue(w, req, queueName)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	switch req.Method {
	case http.MethodGet:
		r.queueHandler.HandleGetQueue(w, req, queueName)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleQueueJobs routes requests for /api/admin/queues/{name}/jobs and sub-resources
func (r *Router) handleQueueJobs(w http.ResponseWriter, req *http.Request, queueName string, parts []string) {
	if len(parts) == 0 {
		switch req.Method {
		case http.MethodGet:
			r.queueHandler.HandleListJobs(w, req, queueName)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	jobID := parts[0]

	if len(parts) > 1 {
		switch parts[1] {
		case "retry":
			r.queueHandler.HandleRetryJob(w, req, queueName, jobID)
			return
		case "cancel":
			r.queueHandler.HandleCancelJob(w, req, queueName, jobID)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	switch req.Method {
	case http.MethodGet:
		r.queueHandler.HandleGetJob(w, req, queueName, jobID)
	case http.MethodDelete:
		r.queueHandler.HandleDeleteJob(w, req, queueName, jobID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handlePatterns routes requests for /api/admin/patterns
func (r *Router) handlePatterns(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.patternHandler.HandleList(w, req)
	case http.MethodPost:
		r.patternHandler.HandleCreate(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handlePatternByID routes requests for /api/admin/patterns/{id} and sub-resources
func (r *Router) handlePatternByID(w http.ResponseWriter, req *http.Request) {
	path := strings.TrimPrefix(req.URL.Path, "/api/admin/patterns/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "Pattern ID required", http.StatusBadRequest)
		return
	}

	patternID := parts[0]

	if patternID == "test" && len(parts) == 1 {
		r.patternHandler.HandleTest(w, req)
		return
	}

	if len(parts) > 1 {
		switch parts[1] {
		case "activate":
			r.patternHandler.HandleActivate(w, req, patternID)
			return
		case "deactivate":
			r.patternHandler.HandleDeactivate(w, req, patternID)
			return
		case "test":
			r.patternHandler.HandleTestByID(w, req, patternID)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	switch req.Method {
	case http.MethodGet:
		r.patternHandler.HandleGet(w, req, patternID)
	case http.MethodPut, http.MethodPatch:
		r.patternHandler.HandleUpdate(w, req, patternID)
	case http.MethodDelete:
		r.patternHandler.HandleDelete(w, req, patternID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleGeocoding routes requests for /api/admin/geocoding
func (r *Router) handleGeocoding(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.geocodingHandler.HandleList(w, req)
	case http.MethodPost:
		r.geocodingHandler.HandleGeocode(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleGeocodingByID routes requests for /api/admin/geocoding/{id} and sub-resources
func (r *Router) handleGeocodingByID(w http.ResponseWriter, req *http.Request) {
	path := strings.TrimPrefix(req.URL.Path, "/api/admin/geocoding/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "Geocoding ID required", http.StatusBadRequest)
		return
	}

	id := parts[0]

	// Handle special routes
	switch id {
	case "bulk":
		r.geocodingHandler.HandleBulkGeocode(w, req)
		return
	case "stats":
		r.geocodingHandler.HandleGetStats(w, req)
		return
	case "cache":
		if len(parts) > 1 && parts[1] == "purge" {
			r.geocodingHandler.HandlePurgeCache(w, req)
			return
		}
		r.geocodingHandler.HandleGetCache(w, req)
		return
	case "config":
		switch req.Method {
		case http.MethodGet:
			r.geocodingHandler.HandleGetConfig(w, req)
		case http.MethodPut, http.MethodPatch:
			r.geocodingHandler.HandleUpdateConfig(w, req)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// Handle geocoding by ID
	switch req.Method {
	case http.MethodGet:
		r.geocodingHandler.HandleGet(w, req, id)
	case http.MethodDelete:
		r.geocodingHandler.HandleDelete(w, req, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleOCR routes requests for /api/admin/ocr
func (r *Router) handleOCR(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.ocrHandler.HandleList(w, req)
	case http.MethodPost:
		r.ocrHandler.HandleCreate(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleOCRByID routes requests for /api/admin/ocr/{id} and sub-resources
func (r *Router) handleOCRByID(w http.ResponseWriter, req *http.Request) {
	path := strings.TrimPrefix(req.URL.Path, "/api/admin/ocr/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "OCR ID required", http.StatusBadRequest)
		return
	}

	id := parts[0]

	// Handle special routes
	switch id {
	case "bulk":
		r.ocrHandler.HandleBulkCreate(w, req)
		return
	case "stats":
		r.ocrHandler.HandleGetStats(w, req)
		return
	case "config":
		switch req.Method {
		case http.MethodGet:
			r.ocrHandler.HandleGetConfig(w, req)
		case http.MethodPut, http.MethodPatch:
			r.ocrHandler.HandleUpdateConfig(w, req)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// Handle sub-resources
	if len(parts) > 1 {
		switch parts[1] {
		case "reprocess":
			r.ocrHandler.HandleReprocess(w, req, id)
			return
		case "extractions":
			r.ocrHandler.HandleGetExtractions(w, req, id)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	// Handle OCR by ID
	switch req.Method {
	case http.MethodGet:
		r.ocrHandler.HandleGet(w, req, id)
	case http.MethodDelete:
		r.ocrHandler.HandleDelete(w, req, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleStores routes requests for /api/admin/stores
func (r *Router) handleStores(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.storeHandler.HandleList(w, req)
	case http.MethodPost:
		r.storeHandler.HandleCreate(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleStoreByID routes requests for /api/admin/stores/{id} and sub-resources
func (r *Router) handleStoreByID(w http.ResponseWriter, req *http.Request) {
	path := strings.TrimPrefix(req.URL.Path, "/api/admin/stores/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "Store ID required", http.StatusBadRequest)
		return
	}

	id := parts[0]

	// Handle special routes
	switch id {
	case "bulk":
		r.storeHandler.HandleBulkCreate(w, req)
		return
	case "merge":
		r.storeHandler.HandleMerge(w, req)
		return
	case "search":
		r.storeHandler.HandleSearch(w, req)
		return
	case "stats":
		r.storeHandler.HandleGetStats(w, req)
		return
	}

	// Handle sub-resources
	if len(parts) > 1 {
		switch parts[1] {
		case "activate":
			r.storeHandler.HandleActivate(w, req, id)
			return
		case "deactivate":
			r.storeHandler.HandleDeactivate(w, req, id)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	// Handle store by ID
	switch req.Method {
	case http.MethodGet:
		r.storeHandler.HandleGet(w, req, id)
	case http.MethodPut, http.MethodPatch:
		r.storeHandler.HandleUpdate(w, req, id)
	case http.MethodDelete:
		r.storeHandler.HandleDelete(w, req, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleProducts routes requests for /api/admin/products
func (r *Router) handleProducts(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.productHandler.HandleList(w, req)
	case http.MethodPost:
		r.productHandler.HandleCreate(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleProductByID routes requests for /api/admin/products/{id} and sub-resources
func (r *Router) handleProductByID(w http.ResponseWriter, req *http.Request) {
	path := strings.TrimPrefix(req.URL.Path, "/api/admin/products/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "Product ID required", http.StatusBadRequest)
		return
	}

	id := parts[0]

	// Handle special routes
	switch id {
	case "bulk":
		switch req.Method {
		case http.MethodPost:
			r.productHandler.HandleBulkCreate(w, req)
		case http.MethodPut, http.MethodPatch:
			r.productHandler.HandleBulkUpdate(w, req)
		case http.MethodDelete:
			r.productHandler.HandleBulkDelete(w, req)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	case "merge":
		r.productHandler.HandleMerge(w, req)
		return
	case "search":
		r.productHandler.HandleSearch(w, req)
		return
	case "stats":
		r.productHandler.HandleGetStats(w, req)
		return
	}

	// Handle sub-resources
	if len(parts) > 1 {
		switch parts[1] {
		case "activate":
			r.productHandler.HandleActivate(w, req, id)
			return
		case "deactivate":
			r.productHandler.HandleDeactivate(w, req, id)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	// Handle product by ID
	switch req.Method {
	case http.MethodGet:
		r.productHandler.HandleGet(w, req, id)
	case http.MethodPut, http.MethodPatch:
		r.productHandler.HandleUpdate(w, req, id)
	case http.MethodDelete:
		r.productHandler.HandleDelete(w, req, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleCategories routes requests for /api/admin/categories
func (r *Router) handleCategories(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.categoryHandler.HandleList(w, req)
	case http.MethodPost:
		r.categoryHandler.HandleCreate(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleCategoryByID routes requests for /api/admin/categories/{id} and sub-resources
func (r *Router) handleCategoryByID(w http.ResponseWriter, req *http.Request) {
	path := strings.TrimPrefix(req.URL.Path, "/api/admin/categories/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "Category ID required", http.StatusBadRequest)
		return
	}

	id := parts[0]

	// Handle special routes
	switch id {
	case "bulk":
		r.categoryHandler.HandleBulkCreate(w, req)
		return
	case "merge":
		r.categoryHandler.HandleMerge(w, req)
		return
	case "tree":
		r.categoryHandler.HandleGetTree(w, req)
		return
	case "stats":
		r.categoryHandler.HandleGetStats(w, req)
		return
	}

	// Handle sub-resources
	if len(parts) > 1 {
		switch parts[1] {
		case "move":
			r.categoryHandler.HandleMove(w, req, id)
			return
		case "activate":
			r.categoryHandler.HandleActivate(w, req, id)
			return
		case "deactivate":
			r.categoryHandler.HandleDeactivate(w, req, id)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	// Handle category by ID
	switch req.Method {
	case http.MethodGet:
		r.categoryHandler.HandleGet(w, req, id)
	case http.MethodPut, http.MethodPatch:
		r.categoryHandler.HandleUpdate(w, req, id)
	case http.MethodDelete:
		r.categoryHandler.HandleDelete(w, req, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleConfig routes requests for /api/admin/config
func (r *Router) handleConfig(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.configHandler.HandleListConfigs(w, req)
	case http.MethodPost:
		r.configHandler.HandleCreateConfig(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleConfigByKey routes requests for /api/admin/config/{key} and sub-resources
func (r *Router) handleConfigByKey(w http.ResponseWriter, req *http.Request) {
	path := strings.TrimPrefix(req.URL.Path, "/api/admin/config/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "Config key required", http.StatusBadRequest)
		return
	}

	key := parts[0]

	// Handle special routes
	switch key {
	case "bulk":
		r.configHandler.HandleBulkUpdateConfigs(w, req)
		return
	case "history":
		r.configHandler.HandleGetHistory(w, req)
		return
	case "stats":
		r.configHandler.HandleGetStats(w, req)
		return
	case "flags":
		r.handleConfigFlags(w, req, parts[1:])
		return
	}

	// Handle sub-resources
	if len(parts) > 1 {
		switch parts[1] {
		case "reset":
			r.configHandler.HandleResetConfig(w, req, key)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	// Handle config by key
	switch req.Method {
	case http.MethodGet:
		r.configHandler.HandleGetConfig(w, req, key)
	case http.MethodPut, http.MethodPatch:
		r.configHandler.HandleUpdateConfig(w, req, key)
	case http.MethodDelete:
		r.configHandler.HandleDeleteConfig(w, req, key)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleConfigFlags routes requests for /api/admin/config/flags and sub-resources
func (r *Router) handleConfigFlags(w http.ResponseWriter, req *http.Request, parts []string) {
	// Handle /api/admin/config/flags
	if len(parts) == 0 {
		switch req.Method {
		case http.MethodGet:
			r.configHandler.HandleListFlags(w, req)
		case http.MethodPost:
			r.configHandler.HandleCreateFlag(w, req)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	key := parts[0]

	// Handle /api/admin/config/flags/{key}/action
	if len(parts) > 1 {
		switch parts[1] {
		case "toggle":
			r.configHandler.HandleToggleFlag(w, req, key)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	// Handle /api/admin/config/flags/{key}
	switch req.Method {
	case http.MethodGet:
		r.configHandler.HandleGetFlag(w, req, key)
	case http.MethodPut, http.MethodPatch:
		r.configHandler.HandleUpdateFlag(w, req, key)
	case http.MethodDelete:
		r.configHandler.HandleDeleteFlag(w, req, key)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// Getter methods for handlers
func (r *Router) GetUserHandler() *UserHandler {
	return r.userHandler
}

func (r *Router) GetQueueHandler() *QueueHandler {
	return r.queueHandler
}

func (r *Router) GetPatternHandler() *PatternHandler {
	return r.patternHandler
}

func (r *Router) GetGeocodingHandler() *GeocodingHandler {
	return r.geocodingHandler
}

func (r *Router) GetOCRHandler() *OCRHandler {
	return r.ocrHandler
}

func (r *Router) GetStoreHandler() *StoreHandler {
	return r.storeHandler
}

func (r *Router) GetProductHandler() *ProductHandler {
	return r.productHandler
}

func (r *Router) GetCategoryHandler() *CategoryHandler {
	return r.categoryHandler
}

func (r *Router) GetConfigHandler() *ConfigHandler {
	return r.configHandler
}
