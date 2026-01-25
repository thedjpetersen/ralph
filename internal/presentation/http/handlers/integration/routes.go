package integration

import (
	"net/http"
	"strings"

	"clockzen-next/internal/ent"
	"clockzen-next/internal/infrastructure/google"
)

// Router handles routing for integration-related endpoints
type Router struct {
	driveHandler *DriveHandler
}

// NewRouter creates a new Router with the given handlers
func NewRouter(driveHandler *DriveHandler) *Router {
	return &Router{
		driveHandler: driveHandler,
	}
}

// NewDefaultRouter creates a new Router with default handlers
// Note: Requires ent client and OAuth config to be provided
func NewDefaultRouter(entClient *ent.Client, oauthConfig *google.Config) *Router {
	return &Router{
		driveHandler: NewDriveHandler(entClient, oauthConfig),
	}
}

// RegisterRoutes registers all integration routes with the given mux
// Total routes: 22
func (r *Router) RegisterRoutes(mux *http.ServeMux) {
	// ========================================
	// OAuth Routes
	// ========================================
	// POST /api/integrations/drive/oauth/initiate - Initiate OAuth flow
	// GET/POST /api/integrations/drive/oauth/callback - OAuth callback
	mux.HandleFunc("/api/integrations/drive/oauth/initiate", r.handleOAuthInitiate)
	mux.HandleFunc("/api/integrations/drive/oauth/callback", r.handleOAuthCallback)

	// ========================================
	// Connection Routes
	// ========================================
	// GET /api/integrations/drive/connections - List connections
	// GET /api/integrations/drive/connections/{id} - Get connection
	// DELETE /api/integrations/drive/connections/{id} - Disconnect (revoke)
	// POST /api/integrations/drive/connections/{id}/refresh - Refresh token
	// GET /api/integrations/drive/connections/{id}/folders - List folders
	// POST /api/integrations/drive/connections/{id}/folders - Add folder
	// GET /api/integrations/drive/connections/{id}/browse - Browse Drive
	// POST /api/integrations/drive/connections/{id}/sync - Trigger sync
	// GET /api/integrations/drive/connections/{id}/syncs - List syncs
	// POST /api/integrations/drive/connections/{id}/sync/cancel - Cancel sync
	mux.HandleFunc("/api/integrations/drive/connections", r.handleConnections)
	mux.HandleFunc("/api/integrations/drive/connections/", r.handleConnectionByID)

	// ========================================
	// Folder Routes
	// ========================================
	// GET /api/integrations/drive/folders/{id} - Get folder
	// PUT/PATCH /api/integrations/drive/folders/{id} - Update folder
	// DELETE /api/integrations/drive/folders/{id} - Delete folder
	mux.HandleFunc("/api/integrations/drive/folders/", r.handleFolderByID)

	// ========================================
	// Sync Status Routes
	// ========================================
	// GET /api/integrations/drive/syncs/{id} - Get sync status
	mux.HandleFunc("/api/integrations/drive/syncs/", r.handleSyncByID)
}

// handleOAuthInitiate routes requests for /api/integrations/drive/oauth/initiate
func (r *Router) handleOAuthInitiate(w http.ResponseWriter, req *http.Request) {
	r.driveHandler.HandleInitiateOAuth(w, req)
}

// handleOAuthCallback routes requests for /api/integrations/drive/oauth/callback
func (r *Router) handleOAuthCallback(w http.ResponseWriter, req *http.Request) {
	r.driveHandler.HandleOAuthCallback(w, req)
}

// handleConnections routes requests for /api/integrations/drive/connections
func (r *Router) handleConnections(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.driveHandler.HandleListConnections(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleConnectionByID routes requests for /api/integrations/drive/connections/{id}
func (r *Router) handleConnectionByID(w http.ResponseWriter, req *http.Request) {
	// Extract the ID from the URL path
	path := strings.TrimPrefix(req.URL.Path, "/api/integrations/drive/connections/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "Connection ID required", http.StatusBadRequest)
		return
	}

	connectionID := parts[0]

	// Check if this is a sub-resource request
	if len(parts) > 1 {
		switch parts[1] {
		case "refresh":
			r.driveHandler.HandleRefreshConnection(w, req, connectionID)
			return
		case "folders":
			r.handleConnectionFolders(w, req, connectionID)
			return
		case "browse":
			r.driveHandler.HandleBrowseDrive(w, req, connectionID)
			return
		case "sync":
			// Check for cancel sub-resource
			if len(parts) > 2 && parts[2] == "cancel" {
				r.driveHandler.HandleCancelSync(w, req, connectionID)
				return
			}
			r.driveHandler.HandleTriggerSync(w, req, connectionID)
			return
		case "syncs":
			r.driveHandler.HandleListSyncs(w, req, connectionID)
			return
		default:
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
	}

	// Handle connection CRUD operations
	switch req.Method {
	case http.MethodGet:
		r.driveHandler.HandleGetConnection(w, req, connectionID)
	case http.MethodDelete:
		r.driveHandler.HandleDisconnect(w, req, connectionID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleConnectionFolders handles folder operations under a connection
func (r *Router) handleConnectionFolders(w http.ResponseWriter, req *http.Request, connectionID string) {
	switch req.Method {
	case http.MethodGet:
		r.driveHandler.HandleListFolders(w, req, connectionID)
	case http.MethodPost:
		r.driveHandler.HandleCreateFolder(w, req, connectionID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleFolderByID routes requests for /api/integrations/drive/folders/{id}
func (r *Router) handleFolderByID(w http.ResponseWriter, req *http.Request) {
	// Extract the ID from the URL path
	folderID := strings.TrimPrefix(req.URL.Path, "/api/integrations/drive/folders/")
	if folderID == "" {
		http.Error(w, "Folder ID required", http.StatusBadRequest)
		return
	}

	// Handle folder CRUD operations
	switch req.Method {
	case http.MethodGet:
		r.driveHandler.HandleGetFolder(w, req, folderID)
	case http.MethodPut, http.MethodPatch:
		r.driveHandler.HandleUpdateFolder(w, req, folderID)
	case http.MethodDelete:
		r.driveHandler.HandleDeleteFolder(w, req, folderID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleSyncByID routes requests for /api/integrations/drive/syncs/{id}
func (r *Router) handleSyncByID(w http.ResponseWriter, req *http.Request) {
	// Extract the ID from the URL path
	syncID := strings.TrimPrefix(req.URL.Path, "/api/integrations/drive/syncs/")
	if syncID == "" {
		http.Error(w, "Sync ID required", http.StatusBadRequest)
		return
	}

	// Handle sync status operations
	switch req.Method {
	case http.MethodGet:
		r.driveHandler.HandleGetSyncStatus(w, req, syncID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// GetDriveHandler returns the drive handler
func (r *Router) GetDriveHandler() *DriveHandler {
	return r.driveHandler
}
