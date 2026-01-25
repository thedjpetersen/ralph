package analysis

import (
	"net/http"
	"strings"
)

// Router handles routing for analysis-related endpoints
type Router struct {
	handler *AnalysisHandler
}

// NewRouter creates a new Router with the given handler
func NewRouter(handler *AnalysisHandler) *Router {
	return &Router{
		handler: handler,
	}
}

// NewDefaultRouter creates a new Router with a default handler
func NewDefaultRouter() *Router {
	return &Router{
		handler: NewAnalysisHandler(),
	}
}

// RegisterRoutes registers all analysis routes with the given mux
// Total routes: 10 endpoints
//
// Spending Analysis (1):
//  1. POST   /api/analysis/spending              - Analyze spending patterns
//
// Trend Analysis (1):
//  2. POST   /api/analysis/trends                - Detect spending trends
//
// Anomaly Detection (1):
//  3. POST   /api/analysis/anomalies             - Detect spending anomalies
//
// Backtest (1):
//  4. POST   /api/analysis/backtest              - Run budget backtest
//
// What-If Analysis (1):
//  5. POST   /api/analysis/what-if               - Run what-if scenario analysis
//
// Period Comparison (1):
//  6. POST   /api/analysis/compare               - Compare spending periods
//
// CRUD Operations (4):
//  7. GET    /api/analysis                       - List all analyses (with ?user_id filter)
//  8. GET    /api/analysis/{id}                  - Get single analysis result
//  9. DELETE /api/analysis/{id}                  - Delete analysis result
func (r *Router) RegisterRoutes(mux *http.ServeMux) {
	// Base routes
	mux.HandleFunc("/api/analysis", r.handleAnalysis)
	mux.HandleFunc("/api/analysis/", r.handleAnalysisByPath)
}

// handleAnalysis routes requests for /api/analysis
func (r *Router) handleAnalysis(w http.ResponseWriter, req *http.Request) {
	switch req.Method {
	case http.MethodGet:
		r.handler.HandleList(w, req)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleAnalysisByPath routes requests for /api/analysis/{path}
func (r *Router) handleAnalysisByPath(w http.ResponseWriter, req *http.Request) {
	// Extract the path after /api/analysis/
	path := strings.TrimPrefix(req.URL.Path, "/api/analysis/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	// Handle specific analysis endpoints
	switch parts[0] {
	case "spending":
		r.handler.HandleSpendingAnalysis(w, req)
		return
	case "trends":
		r.handler.HandleTrendAnalysis(w, req)
		return
	case "anomalies":
		r.handler.HandleAnomalyDetection(w, req)
		return
	case "backtest":
		r.handler.HandleBacktest(w, req)
		return
	case "what-if":
		r.handler.HandleWhatIf(w, req)
		return
	case "compare":
		r.handler.HandleComparePeriods(w, req)
		return
	}

	// If not a special endpoint, treat as an analysis ID
	analysisID := parts[0]

	switch req.Method {
	case http.MethodGet:
		r.handler.HandleGet(w, req, analysisID)
	case http.MethodDelete:
		r.handler.HandleDelete(w, req, analysisID)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// GetHandler returns the analysis handler
func (r *Router) GetHandler() *AnalysisHandler {
	return r.handler
}
