package retirement

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"

	"clockzen-next/internal/application/dto"
	appRetirement "clockzen-next/internal/application/retirement"
)

// Backtest represents a stored Monte Carlo backtest
type Backtest struct {
	ID        string                         `json:"id"`
	PlanID    string                         `json:"plan_id"`
	Name      string                         `json:"name"`
	Config    BacktestConfig                 `json:"config"`
	Results   *dto.MonteCarloResultsResponse `json:"results,omitempty"`
	Status    string                         `json:"status"` // pending, running, completed, failed
	CreatedAt time.Time                      `json:"created_at"`
	UpdatedAt time.Time                      `json:"updated_at"`
}

// BacktestConfig represents configuration for Monte Carlo simulation
type BacktestConfig struct {
	// Simulation parameters
	NumIterations int `json:"num_iterations"`

	// Portfolio
	InitialPortfolio   float64 `json:"initial_portfolio"`
	AnnualContribution float64 `json:"annual_contribution"`
	AnnualWithdrawal   float64 `json:"annual_withdrawal"`

	// Time periods
	YearsToRetirement int `json:"years_to_retirement"`
	YearsInRetirement int `json:"years_in_retirement"`

	// Market assumptions
	ExpectedReturn float64 `json:"expected_return"`
	ReturnStdDev   float64 `json:"return_std_dev"`
	InflationRate  float64 `json:"inflation_rate"`

	// Options
	InflationAdjustedWithdrawals bool  `json:"inflation_adjusted_withdrawals"`
	Seed                         int64 `json:"seed"`
	Workers                      int   `json:"workers"`
}

// BacktestHandler handles HTTP requests for Monte Carlo backtesting
type BacktestHandler struct {
	mu        sync.RWMutex
	backtests map[string]*Backtest
}

// NewBacktestHandler creates a new BacktestHandler instance
func NewBacktestHandler() *BacktestHandler {
	return &BacktestHandler{
		backtests: make(map[string]*Backtest),
	}
}

// CreateBacktestRequest represents a request to create a backtest
type CreateBacktestRequest struct {
	PlanID string         `json:"plan_id"`
	Name   string         `json:"name"`
	Config BacktestConfig `json:"config"`
}

// UpdateBacktestRequest represents a request to update a backtest
type UpdateBacktestRequest struct {
	Name   *string         `json:"name,omitempty"`
	Config *BacktestConfig `json:"config,omitempty"`
}

// ListBacktestResponse represents a list of backtests
type ListBacktestResponse struct {
	Backtests []*Backtest `json:"backtests"`
	Total     int         `json:"total"`
}

// BacktestScenarioRequest represents a request for scenario analysis
type BacktestScenarioRequest struct {
	BaseConfig BacktestConfig `json:"base_config"`
	Scenarios  []ScenarioVariation `json:"scenarios"`
}

// ScenarioVariation represents a variation to apply to the base config
type ScenarioVariation struct {
	Name           string   `json:"name"`
	ReturnDelta    *float64 `json:"return_delta,omitempty"`    // Change in expected return
	StdDevDelta    *float64 `json:"std_dev_delta,omitempty"`   // Change in volatility
	WithdrawalDelta *float64 `json:"withdrawal_delta,omitempty"` // Change in withdrawal
	InflationDelta  *float64 `json:"inflation_delta,omitempty"`  // Change in inflation
}

// ScenarioResult represents the result of a scenario analysis
type ScenarioResult struct {
	Name               string                         `json:"name"`
	Config             BacktestConfig                 `json:"config"`
	Results            dto.MonteCarloResultsResponse  `json:"results"`
	DeltaFromBase      float64                        `json:"delta_from_base"`      // Change in success probability
	SuccessProbability float64                        `json:"success_probability"`
}

// ScenarioAnalysisResponse represents the response from scenario analysis
type ScenarioAnalysisResponse struct {
	BaseResult   dto.MonteCarloResultsResponse `json:"base_result"`
	Scenarios    []ScenarioResult              `json:"scenarios"`
	BestScenario string                        `json:"best_scenario"`
	WorstScenario string                       `json:"worst_scenario"`
}

// HandleCreate handles POST /api/retirement/backtest
func (h *BacktestHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req CreateBacktestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if err := h.validateCreateRequest(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	now := time.Now()
	backtest := &Backtest{
		ID:        uuid.New().String(),
		PlanID:    req.PlanID,
		Name:      req.Name,
		Config:    req.Config,
		Status:    "pending",
		CreatedAt: now,
		UpdatedAt: now,
	}

	h.mu.Lock()
	h.backtests[backtest.ID] = backtest
	h.mu.Unlock()

	h.writeJSON(w, http.StatusCreated, backtest)
}

// HandleGet handles GET /api/retirement/backtest/{id}
func (h *BacktestHandler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	backtest, exists := h.backtests[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Backtest not found")
		return
	}

	h.writeJSON(w, http.StatusOK, backtest)
}

// HandleList handles GET /api/retirement/backtest
func (h *BacktestHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	planID := r.URL.Query().Get("plan_id")

	h.mu.RLock()
	backtests := make([]*Backtest, 0)
	for _, backtest := range h.backtests {
		if planID == "" || backtest.PlanID == planID {
			backtests = append(backtests, backtest)
		}
	}
	h.mu.RUnlock()

	resp := ListBacktestResponse{
		Backtests: backtests,
		Total:     len(backtests),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleListByPlan handles GET /api/retirement/plans/{planId}/backtest
func (h *BacktestHandler) HandleListByPlan(w http.ResponseWriter, r *http.Request, planID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	backtests := make([]*Backtest, 0)
	for _, backtest := range h.backtests {
		if backtest.PlanID == planID {
			backtests = append(backtests, backtest)
		}
	}
	h.mu.RUnlock()

	resp := ListBacktestResponse{
		Backtests: backtests,
		Total:     len(backtests),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleUpdate handles PUT /api/retirement/backtest/{id}
func (h *BacktestHandler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req UpdateBacktestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	backtest, exists := h.backtests[id]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Backtest not found")
		return
	}

	if req.Name != nil {
		backtest.Name = *req.Name
	}
	if req.Config != nil {
		backtest.Config = *req.Config
		backtest.Status = "pending"
		backtest.Results = nil
	}

	backtest.UpdatedAt = time.Now()

	h.writeJSON(w, http.StatusOK, backtest)
}

// HandleDelete handles DELETE /api/retirement/backtest/{id}
func (h *BacktestHandler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	_, exists := h.backtests[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Backtest not found")
		return
	}
	delete(h.backtests, id)
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// HandleRun handles POST /api/retirement/backtest/{id}/run
func (h *BacktestHandler) HandleRun(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	h.mu.Lock()
	backtest, exists := h.backtests[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Backtest not found")
		return
	}

	backtest.Status = "running"
	h.mu.Unlock()

	// Run the Monte Carlo simulation
	results, err := h.runBacktest(&backtest.Config)
	if err != nil {
		h.mu.Lock()
		backtest.Status = "failed"
		h.mu.Unlock()
		h.writeError(w, http.StatusInternalServerError, "simulation_failed", err.Error())
		return
	}

	h.mu.Lock()
	backtest.Results = results
	backtest.Status = "completed"
	backtest.UpdatedAt = time.Now()
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, backtest)
}

// HandleRunForPlan handles POST /api/retirement/plans/{planId}/backtest
func (h *BacktestHandler) HandleRunForPlan(w http.ResponseWriter, r *http.Request, planID string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var config BacktestConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if err := h.validateConfig(&config); err != nil {
		h.writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	// Run the Monte Carlo simulation
	results, err := h.runBacktest(&config)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "simulation_failed", err.Error())
		return
	}

	// Store the backtest
	now := time.Now()
	backtest := &Backtest{
		ID:        uuid.New().String(),
		PlanID:    planID,
		Name:      "Monte Carlo Backtest " + now.Format("2006-01-02 15:04:05"),
		Config:    config,
		Results:   results,
		Status:    "completed",
		CreatedAt: now,
		UpdatedAt: now,
	}

	h.mu.Lock()
	h.backtests[backtest.ID] = backtest
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, backtest)
}

// HandleGetPercentiles handles GET /api/retirement/backtest/{id}/percentiles
func (h *BacktestHandler) HandleGetPercentiles(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	backtest, exists := h.backtests[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Backtest not found")
		return
	}

	if backtest.Results == nil {
		h.writeError(w, http.StatusNotFound, "not_found", "Backtest has not been run yet")
		return
	}

	h.writeJSON(w, http.StatusOK, backtest.Results.Percentiles)
}

// HandleGetSuccessProbability handles GET /api/retirement/backtest/{id}/success
func (h *BacktestHandler) HandleGetSuccessProbability(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	backtest, exists := h.backtests[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Backtest not found")
		return
	}

	if backtest.Results == nil {
		h.writeError(w, http.StatusNotFound, "not_found", "Backtest has not been run yet")
		return
	}

	response := struct {
		SuccessProbability float64 `json:"success_probability"`
		SuccessCount       int     `json:"success_count"`
		TotalSimulations   int     `json:"total_simulations"`
	}{
		SuccessProbability: backtest.Results.SuccessProbability,
		SuccessCount:       backtest.Results.SuccessCount,
		TotalSimulations:   backtest.Results.TotalSimulations,
	}

	h.writeJSON(w, http.StatusOK, response)
}

// HandleScenarioAnalysis handles POST /api/retirement/backtest/scenarios
func (h *BacktestHandler) HandleScenarioAnalysis(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req BacktestScenarioRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if err := h.validateConfig(&req.BaseConfig); err != nil {
		h.writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	// Run base scenario
	baseResults, err := h.runBacktest(&req.BaseConfig)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, "simulation_failed", err.Error())
		return
	}

	// Run each scenario variation
	scenarios := make([]ScenarioResult, 0, len(req.Scenarios))
	bestScenario := ""
	worstScenario := ""
	bestProb := baseResults.SuccessProbability
	worstProb := baseResults.SuccessProbability

	for _, variation := range req.Scenarios {
		scenarioConfig := req.BaseConfig

		// Apply variations
		if variation.ReturnDelta != nil {
			scenarioConfig.ExpectedReturn += *variation.ReturnDelta
		}
		if variation.StdDevDelta != nil {
			scenarioConfig.ReturnStdDev += *variation.StdDevDelta
		}
		if variation.WithdrawalDelta != nil {
			scenarioConfig.AnnualWithdrawal += *variation.WithdrawalDelta
		}
		if variation.InflationDelta != nil {
			scenarioConfig.InflationRate += *variation.InflationDelta
		}

		results, err := h.runBacktest(&scenarioConfig)
		if err != nil {
			continue
		}

		delta := results.SuccessProbability - baseResults.SuccessProbability
		scenarios = append(scenarios, ScenarioResult{
			Name:               variation.Name,
			Config:             scenarioConfig,
			Results:            *results,
			DeltaFromBase:      delta,
			SuccessProbability: results.SuccessProbability,
		})

		if results.SuccessProbability > bestProb {
			bestProb = results.SuccessProbability
			bestScenario = variation.Name
		}
		if results.SuccessProbability < worstProb {
			worstProb = results.SuccessProbability
			worstScenario = variation.Name
		}
	}

	response := ScenarioAnalysisResponse{
		BaseResult:    *baseResults,
		Scenarios:     scenarios,
		BestScenario:  bestScenario,
		WorstScenario: worstScenario,
	}

	h.writeJSON(w, http.StatusOK, response)
}

// HandleScenarioAnalysisForPlan handles POST /api/retirement/plans/{planId}/backtest/scenarios
func (h *BacktestHandler) HandleScenarioAnalysisForPlan(w http.ResponseWriter, r *http.Request, planID string) {
	// Delegate to the main scenario analysis handler
	h.HandleScenarioAnalysis(w, r)
}

// runBacktest executes the Monte Carlo simulation
func (h *BacktestHandler) runBacktest(config *BacktestConfig) (*dto.MonteCarloResultsResponse, error) {
	// Set defaults
	numIterations := config.NumIterations
	if numIterations <= 0 {
		numIterations = 10000
	}

	workers := config.Workers
	if workers <= 0 {
		workers = 4
	}

	// Convert handler config to service config
	svcConfig := appRetirement.SimulationConfig{
		NumIterations:                numIterations,
		InitialPortfolio:             config.InitialPortfolio,
		AnnualContribution:           config.AnnualContribution,
		AnnualWithdrawal:             config.AnnualWithdrawal,
		YearsToRetirement:            config.YearsToRetirement,
		YearsInRetirement:            config.YearsInRetirement,
		ExpectedReturn:               config.ExpectedReturn,
		ReturnStdDev:                 config.ReturnStdDev,
		InflationRate:                config.InflationRate,
		InflationAdjustedWithdrawals: config.InflationAdjustedWithdrawals,
		Seed:                         config.Seed,
		Workers:                      workers,
	}

	// Create service and run simulation
	service, err := appRetirement.NewMonteCarloService(svcConfig)
	if err != nil {
		return nil, err
	}

	results, err := service.RunSimulation()
	if err != nil {
		return nil, err
	}

	// Convert service results to DTO response
	return &dto.MonteCarloResultsResponse{
		SuccessProbability: results.SuccessProbability,
		SuccessCount:       results.SuccessCount,
		TotalSimulations:   results.TotalSimulations,
		Percentiles: dto.PercentileResultsResponse{
			P5:  results.Percentiles.P5,
			P10: results.Percentiles.P10,
			P25: results.Percentiles.P25,
			P50: results.Percentiles.P50,
			P75: results.Percentiles.P75,
			P90: results.Percentiles.P90,
			P95: results.Percentiles.P95,
		},
		AverageFinalValue:     results.AverageFinalValue,
		MedianFinalValue:      results.MedianFinalValue,
		FinalValueStdDev:      results.FinalValueStdDev,
		AverageDepletionYear:  results.AverageDepletionYear,
		CalculationDurationMs: results.Duration.Milliseconds(),
	}, nil
}

// validateCreateRequest validates the create request
func (h *BacktestHandler) validateCreateRequest(req *CreateBacktestRequest) error {
	if req.PlanID == "" {
		return newValidationError("plan_id is required")
	}
	if req.Name == "" {
		return newValidationError("name is required")
	}
	return h.validateConfig(&req.Config)
}

// validateConfig validates the backtest configuration
func (h *BacktestHandler) validateConfig(config *BacktestConfig) error {
	if config.NumIterations < 0 {
		return newValidationError("num_iterations cannot be negative")
	}
	if config.InitialPortfolio < 0 {
		return newValidationError("initial_portfolio cannot be negative")
	}
	if config.AnnualContribution < 0 {
		return newValidationError("annual_contribution cannot be negative")
	}
	if config.AnnualWithdrawal < 0 {
		return newValidationError("annual_withdrawal cannot be negative")
	}
	if config.YearsToRetirement < 0 {
		return newValidationError("years_to_retirement cannot be negative")
	}
	if config.YearsInRetirement <= 0 {
		return newValidationError("years_in_retirement must be positive")
	}
	if config.ExpectedReturn < -1 || config.ExpectedReturn > 1 {
		return newValidationError("expected_return must be between -1 and 1")
	}
	if config.ReturnStdDev < 0 {
		return newValidationError("return_std_dev cannot be negative")
	}
	if config.InflationRate < 0 || config.InflationRate > 1 {
		return newValidationError("inflation_rate must be between 0 and 1")
	}
	return nil
}

// writeJSON writes a JSON response
func (h *BacktestHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *BacktestHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}
