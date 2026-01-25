package analysis

import (
	"encoding/json"
	"math"
	"math/rand"
	"net/http"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"

	"clockzen-next/internal/application/dto"
)

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// AnalysisResult represents a stored analysis result
type AnalysisResult struct {
	ID          string           `json:"id"`
	UserID      string           `json:"user_id"`
	Type        dto.AnalysisType `json:"type"`
	Status      dto.AnalysisStatus `json:"status"`
	StartDate   time.Time        `json:"start_date"`
	EndDate     time.Time        `json:"end_date"`
	Result      any              `json:"result,omitempty"`
	CreatedAt   time.Time        `json:"created_at"`
	CompletedAt *time.Time       `json:"completed_at,omitempty"`
	Error       string           `json:"error,omitempty"`
}

// AnalysisHandler handles HTTP requests for analysis
type AnalysisHandler struct {
	mu       sync.RWMutex
	analyses map[string]*AnalysisResult
}

// NewAnalysisHandler creates a new AnalysisHandler instance
func NewAnalysisHandler() *AnalysisHandler {
	return &AnalysisHandler{
		analyses: make(map[string]*AnalysisResult),
	}
}

// HandleSpendingAnalysis handles POST /api/analysis/spending
func (h *AnalysisHandler) HandleSpendingAnalysis(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req dto.SpendingAnalysisRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.UserID == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "user_id is required")
		return
	}

	if req.EndDate.Before(req.StartDate) {
		h.writeError(w, http.StatusBadRequest, "validation_error", "end_date must be after start_date")
		return
	}

	period := req.Period
	if period == "" {
		period = dto.TimePeriodMonthly
	}

	// Generate mock spending analysis
	response := h.generateSpendingAnalysis(req.UserID, req.StartDate, req.EndDate, period)

	// Store the analysis result
	now := time.Now()
	analysis := &AnalysisResult{
		ID:          uuid.New().String(),
		UserID:      req.UserID,
		Type:        dto.AnalysisTypeSpending,
		Status:      dto.AnalysisStatusCompleted,
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		Result:      response,
		CreatedAt:   now,
		CompletedAt: &now,
	}

	h.mu.Lock()
	h.analyses[analysis.ID] = analysis
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, response)
}

// HandleTrendAnalysis handles POST /api/analysis/trends
func (h *AnalysisHandler) HandleTrendAnalysis(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req dto.TrendAnalysisRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.UserID == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "user_id is required")
		return
	}

	if req.EndDate.Before(req.StartDate) {
		h.writeError(w, http.StatusBadRequest, "validation_error", "end_date must be after start_date")
		return
	}

	period := req.Period
	if period == "" {
		period = dto.TimePeriodMonthly
	}

	// Generate mock trend analysis
	response := h.generateTrendAnalysis(req.UserID, req.StartDate, req.EndDate, period)

	// Store the analysis result
	now := time.Now()
	analysis := &AnalysisResult{
		ID:          uuid.New().String(),
		UserID:      req.UserID,
		Type:        dto.AnalysisTypeTrend,
		Status:      dto.AnalysisStatusCompleted,
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		Result:      response,
		CreatedAt:   now,
		CompletedAt: &now,
	}

	h.mu.Lock()
	h.analyses[analysis.ID] = analysis
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, response)
}

// HandleAnomalyDetection handles POST /api/analysis/anomalies
func (h *AnalysisHandler) HandleAnomalyDetection(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req dto.AnomalyDetectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.UserID == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "user_id is required")
		return
	}

	if req.EndDate.Before(req.StartDate) {
		h.writeError(w, http.StatusBadRequest, "validation_error", "end_date must be after start_date")
		return
	}

	// Generate mock anomaly detection
	response := h.generateAnomalyDetection(req.UserID, req.StartDate, req.EndDate)

	// Store the analysis result
	now := time.Now()
	analysis := &AnalysisResult{
		ID:          uuid.New().String(),
		UserID:      req.UserID,
		Type:        dto.AnalysisTypeAnomaly,
		Status:      dto.AnalysisStatusCompleted,
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		Result:      response,
		CreatedAt:   now,
		CompletedAt: &now,
	}

	h.mu.Lock()
	h.analyses[analysis.ID] = analysis
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, response)
}

// HandleBacktest handles POST /api/analysis/backtest
func (h *AnalysisHandler) HandleBacktest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req dto.BacktestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.UserID == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "user_id is required")
		return
	}

	if req.Budget.Name == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "budget name is required")
		return
	}

	if req.EndDate.Before(req.StartDate) {
		h.writeError(w, http.StatusBadRequest, "validation_error", "end_date must be after start_date")
		return
	}

	// Generate mock backtest result
	response := h.generateBacktest(req.UserID, req.Budget, req.StartDate, req.EndDate)

	// Store the analysis result
	now := time.Now()
	analysis := &AnalysisResult{
		ID:          uuid.New().String(),
		UserID:      req.UserID,
		Type:        dto.AnalysisTypeBacktest,
		Status:      dto.AnalysisStatusCompleted,
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		Result:      response,
		CreatedAt:   now,
		CompletedAt: &now,
	}

	h.mu.Lock()
	h.analyses[analysis.ID] = analysis
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, response)
}

// HandleWhatIf handles POST /api/analysis/what-if
func (h *AnalysisHandler) HandleWhatIf(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req dto.WhatIfRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.UserID == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "user_id is required")
		return
	}

	if req.ScenarioType == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "scenario_type is required")
		return
	}

	timeframeMonths := req.TimeframeMonths
	if timeframeMonths <= 0 {
		timeframeMonths = 12
	}

	// Generate mock what-if analysis
	response := h.generateWhatIfAnalysis(req, timeframeMonths)

	// Store the analysis result
	now := time.Now()
	analysis := &AnalysisResult{
		ID:          uuid.New().String(),
		UserID:      req.UserID,
		Type:        dto.AnalysisTypeWhatIf,
		Status:      dto.AnalysisStatusCompleted,
		StartDate:   time.Now(),
		EndDate:     time.Now().AddDate(0, timeframeMonths, 0),
		Result:      response,
		CreatedAt:   now,
		CompletedAt: &now,
	}

	h.mu.Lock()
	h.analyses[analysis.ID] = analysis
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, response)
}

// HandleComparePeriods handles POST /api/analysis/compare
func (h *AnalysisHandler) HandleComparePeriods(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req dto.ComparePeriodsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if req.UserID == "" {
		h.writeError(w, http.StatusBadRequest, "validation_error", "user_id is required")
		return
	}

	// Generate mock comparison
	response := h.generateComparison(req)

	// Store the analysis result
	now := time.Now()
	analysis := &AnalysisResult{
		ID:          uuid.New().String(),
		UserID:      req.UserID,
		Type:        dto.AnalysisTypeComparison,
		Status:      dto.AnalysisStatusCompleted,
		StartDate:   req.Period1Start,
		EndDate:     req.Period2End,
		Result:      response,
		CreatedAt:   now,
		CompletedAt: &now,
	}

	h.mu.Lock()
	h.analyses[analysis.ID] = analysis
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, response)
}

// HandleList handles GET /api/analysis
func (h *AnalysisHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	userID := r.URL.Query().Get("user_id")
	analysisType := r.URL.Query().Get("type")

	h.mu.RLock()
	analyses := make([]dto.AnalysisResultResponse, 0)
	for _, a := range h.analyses {
		if userID != "" && a.UserID != userID {
			continue
		}
		if analysisType != "" && string(a.Type) != analysisType {
			continue
		}
		analyses = append(analyses, dto.AnalysisResultResponse{
			ID:          a.ID,
			UserID:      a.UserID,
			Type:        a.Type,
			Status:      a.Status,
			StartDate:   a.StartDate,
			EndDate:     a.EndDate,
			CreatedAt:   a.CreatedAt,
			CompletedAt: a.CompletedAt,
			Error:       a.Error,
		})
	}
	h.mu.RUnlock()

	resp := dto.AnalysisListResponse{
		Analyses: analyses,
		Total:    len(analyses),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleGet handles GET /api/analysis/{id}
func (h *AnalysisHandler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	analysis, exists := h.analyses[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "Analysis not found")
		return
	}

	h.writeJSON(w, http.StatusOK, analysis)
}

// HandleDelete handles DELETE /api/analysis/{id}
func (h *AnalysisHandler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	_, exists := h.analyses[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "Analysis not found")
		return
	}
	delete(h.analyses, id)
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// =============================================================================
// Helper Methods for Generating Mock Data
// =============================================================================

func (h *AnalysisHandler) generateSpendingAnalysis(userID string, startDate, endDate time.Time, period dto.TimePeriod) *dto.SpendingAnalysisResponse {
	categories := []string{"groceries", "dining", "transportation", "utilities", "entertainment", "shopping", "healthcare"}

	// Generate periods
	periods := make([]dto.PeriodSpendingResponse, 0)
	current := startDate
	totalSpending := 0.0

	for !current.After(endDate) {
		periodEnd := h.getPeriodEnd(current, period)
		if periodEnd.After(endDate) {
			periodEnd = endDate
		}

		periodTotal := 0.0
		catSpending := make([]dto.CategorySpendingResponse, len(categories))

		for i, cat := range categories {
			amount := 100 + rand.Float64()*500
			count := 5 + rand.Intn(20)
			catSpending[i] = dto.CategorySpendingResponse{
				Category:           cat,
				Amount:             amount,
				TransactionCount:   count,
				AverageTransaction: amount / float64(count),
			}
			periodTotal += amount
		}

		// Calculate percentages
		for i := range catSpending {
			catSpending[i].Percentage = (catSpending[i].Amount / periodTotal) * 100
		}

		periods = append(periods, dto.PeriodSpendingResponse{
			StartDate:        current,
			EndDate:          periodEnd,
			TotalAmount:      periodTotal,
			TransactionCount: 50 + rand.Intn(100),
			ByCategory:       catSpending,
		})

		totalSpending += periodTotal
		current = h.nextPeriod(current, period)
	}

	avgPerPeriod := 0.0
	if len(periods) > 0 {
		avgPerPeriod = totalSpending / float64(len(periods))
	}

	// Get top categories
	topCategories := make([]dto.CategorySpendingResponse, 0, 5)
	catTotals := make(map[string]float64)
	for _, p := range periods {
		for _, c := range p.ByCategory {
			catTotals[c.Category] += c.Amount
		}
	}

	for cat, amount := range catTotals {
		topCategories = append(topCategories, dto.CategorySpendingResponse{
			Category:   cat,
			Amount:     amount,
			Percentage: (amount / totalSpending) * 100,
		})
	}

	sort.Slice(topCategories, func(i, j int) bool {
		return topCategories[i].Amount > topCategories[j].Amount
	})

	if len(topCategories) > 5 {
		topCategories = topCategories[:5]
	}

	return &dto.SpendingAnalysisResponse{
		UserID:           userID,
		Period:           period,
		StartDate:        startDate,
		EndDate:          endDate,
		Periods:          periods,
		TotalSpending:    totalSpending,
		AveragePerPeriod: avgPerPeriod,
		TopCategories:    topCategories,
		AnalyzedAt:       time.Now(),
	}
}

func (h *AnalysisHandler) generateTrendAnalysis(userID string, startDate, endDate time.Time, period dto.TimePeriod) *dto.TrendAnalysisResponse {
	categories := []string{"groceries", "dining", "transportation", "utilities", "entertainment"}

	trends := make([]dto.SpendingTrendResponse, len(categories))
	significantTrends := make([]dto.SpendingTrendResponse, 0)

	for i, cat := range categories {
		direction := dto.TrendDirectionStable
		changePercent := (rand.Float64() - 0.5) * 40 // -20% to +20%

		if changePercent > 10 {
			direction = dto.TrendDirectionIncreasing
		} else if changePercent < -10 {
			direction = dto.TrendDirectionDecreasing
		}

		startAmount := 200 + rand.Float64()*300
		endAmount := startAmount * (1 + changePercent/100)

		trend := dto.SpendingTrendResponse{
			Category:      cat,
			Direction:     direction,
			ChangePercent: changePercent,
			ChangeAmount:  endAmount - startAmount,
			StartAmount:   startAmount,
			EndAmount:     endAmount,
			Slope:         (endAmount - startAmount) / 6,
			RSquared:      0.5 + rand.Float64()*0.5,
			Confidence:    0.6 + rand.Float64()*0.4,
			PeriodCount:   6,
			Description:   generateTrendDescription(cat, direction, changePercent),
		}

		trends[i] = trend

		if math.Abs(changePercent) >= 10 && trend.RSquared >= 0.5 {
			significantTrends = append(significantTrends, trend)
		}
	}

	// Overall trend
	overallChange := (rand.Float64() - 0.5) * 20
	overallDirection := dto.TrendDirectionStable
	if overallChange > 5 {
		overallDirection = dto.TrendDirectionIncreasing
	} else if overallChange < -5 {
		overallDirection = dto.TrendDirectionDecreasing
	}

	overallTrend := dto.SpendingTrendResponse{
		Direction:     overallDirection,
		ChangePercent: overallChange,
		ChangeAmount:  overallChange * 20,
		StartAmount:   2000,
		EndAmount:     2000 * (1 + overallChange/100),
		Slope:         overallChange * 3,
		RSquared:      0.7,
		Confidence:    0.8,
		PeriodCount:   6,
		Description:   generateTrendDescription("overall", overallDirection, overallChange),
	}

	return &dto.TrendAnalysisResponse{
		UserID:            userID,
		AnalysisPeriod:    period,
		StartDate:         startDate,
		EndDate:           endDate,
		Trends:            trends,
		OverallTrend:      overallTrend,
		SignificantTrends: significantTrends,
		AnalyzedAt:        time.Now(),
	}
}

func (h *AnalysisHandler) generateAnomalyDetection(userID string, startDate, endDate time.Time) *dto.AnomalyDetectionResponse {
	anomalyTypes := []string{"unusually_high", "unusually_low", "duplicate_charge", "large_transaction"}
	categories := []string{"groceries", "dining", "shopping", "entertainment"}
	merchants := []string{"Amazon", "Walmart", "Target", "Costco", "Uber", "Netflix"}

	numAnomalies := 3 + rand.Intn(5)
	anomalies := make([]dto.SpendingAnomalyResponse, numAnomalies)

	high, medium, low := 0, 0, 0

	for i := 0; i < numAnomalies; i++ {
		severity := dto.AnomalySeverityLow
		severityRand := rand.Float64()
		if severityRand > 0.8 {
			severity = dto.AnomalySeverityHigh
			high++
		} else if severityRand > 0.5 {
			severity = dto.AnomalySeverityMedium
			medium++
		} else {
			low++
		}

		anomalyType := anomalyTypes[rand.Intn(len(anomalyTypes))]
		amount := 50 + rand.Float64()*500
		expected := amount * (0.5 + rand.Float64()*0.3)

		anomalies[i] = dto.SpendingAnomalyResponse{
			ID:              uuid.New().String(),
			Type:            anomalyType,
			Severity:        severity,
			Category:        categories[rand.Intn(len(categories))],
			MerchantName:    merchants[rand.Intn(len(merchants))],
			Amount:          amount,
			ExpectedAmount:  expected,
			Deviation:       amount - expected,
			ZScore:          2 + rand.Float64()*2,
			TransactionID:   uuid.New().String(),
			TransactionDate: startDate.Add(time.Duration(rand.Intn(int(endDate.Sub(startDate).Hours()))) * time.Hour),
			Description:     generateAnomalyDescription(anomalyType),
			Confidence:      0.6 + rand.Float64()*0.4,
		}
	}

	return &dto.AnomalyDetectionResponse{
		UserID:         userID,
		StartDate:      startDate,
		EndDate:        endDate,
		Anomalies:      anomalies,
		AnomalyCount:   numAnomalies,
		HighSeverity:   high,
		MediumSeverity: medium,
		LowSeverity:    low,
		AnalyzedAt:     time.Now(),
	}
}

func (h *AnalysisHandler) generateBacktest(userID string, budget dto.BudgetRequest, startDate, endDate time.Time) *dto.BacktestResponse {
	budgetID := budget.ID
	if budgetID == "" {
		budgetID = uuid.New().String()
	}

	// Generate period results
	periodResults := make([]dto.PeriodBacktestResponse, 0)
	current := startDate

	totalBudgeted := 0.0
	totalActual := 0.0
	underBudget := 0
	overBudget := 0
	onTrack := 0
	bestMonth := ""
	worstMonth := ""
	bestVariance := math.Inf(-1)
	worstVariance := math.Inf(1)

	categories := []string{"housing", "food", "transportation", "utilities", "entertainment", "personal"}

	for !current.After(endDate) {
		periodEnd := current.AddDate(0, 1, 0).Add(-time.Nanosecond)
		if periodEnd.After(endDate) {
			periodEnd = endDate
		}

		budgeted := budget.TotalBudget
		if budgeted == 0 {
			budgeted = 3000
		}

		// Simulate actual spending (80-120% of budget)
		actual := budgeted * (0.8 + rand.Float64()*0.4)
		variance := budgeted - actual
		variancePercent := (variance / budgeted) * 100

		performance := determinePerformance(variancePercent)

		if variancePercent > 0 {
			underBudget++
		} else if variancePercent < -5 {
			overBudget++
		} else {
			onTrack++
		}

		if variancePercent > bestVariance {
			bestVariance = variancePercent
			bestMonth = current.Format("Jan 2006")
		}
		if variancePercent < worstVariance {
			worstVariance = variancePercent
			worstMonth = current.Format("Jan 2006")
		}

		// Category results
		catResults := make([]dto.CategoryAllocationResponse, len(categories))
		catActualTotal := 0.0
		for i, cat := range categories {
			catBudget := budgeted / float64(len(categories))
			if budget.CategoryBudgets != nil {
				if b, ok := budget.CategoryBudgets[cat]; ok {
					catBudget = b
				}
			}
			catActual := catBudget * (0.7 + rand.Float64()*0.6)
			catVariance := catBudget - catActual
			catVariancePercent := 0.0
			if catBudget > 0 {
				catVariancePercent = (catVariance / catBudget) * 100
			}

			catResults[i] = dto.CategoryAllocationResponse{
				Category:     cat,
				BudgetAmount: catBudget,
				ActualAmount: catActual,
				Variance:     catVariance,
				Percentage:   0, // Will calculate after
				Performance:  determinePerformance(catVariancePercent),
			}
			catActualTotal += catActual
		}

		// Calculate percentages
		for i := range catResults {
			if catActualTotal > 0 {
				catResults[i].Percentage = (catResults[i].ActualAmount / catActualTotal) * 100
			}
		}

		days := periodEnd.Sub(current).Hours() / 24
		avgDaily := 0.0
		if days > 0 {
			avgDaily = actual / days
		}

		periodResults = append(periodResults, dto.PeriodBacktestResponse{
			PeriodStart:      current,
			PeriodEnd:        periodEnd,
			BudgetedAmount:   budgeted,
			ActualAmount:     actual,
			Variance:         variance,
			VariancePercent:  variancePercent,
			Performance:      performance,
			CategoryResults:  catResults,
			TransactionCount: 50 + rand.Intn(100),
			LargestExpense:   100 + rand.Float64()*400,
			AverageDaily:     avgDaily,
		})

		totalBudgeted += budgeted
		totalActual += actual
		current = current.AddDate(0, 1, 0)
	}

	// Summary
	totalSavings := totalBudgeted - totalActual
	avgVariance := 0.0
	if len(periodResults) > 0 {
		for _, pr := range periodResults {
			avgVariance += pr.VariancePercent
		}
		avgVariance /= float64(len(periodResults))
	}

	overallPerformance := determinePerformance(avgVariance)

	summary := dto.BacktestSummaryResponse{
		TotalPeriods:         len(periodResults),
		PeriodsUnderBudget:   underBudget,
		PeriodsOverBudget:    overBudget,
		PeriodsOnTrack:       onTrack,
		AverageVariance:      avgVariance,
		TotalBudgeted:        totalBudgeted,
		TotalActual:          totalActual,
		TotalSavings:         totalSavings,
		ConsistencyScore:     60 + rand.Float64()*40,
		BestPerformingMonth:  bestMonth,
		WorstPerformingMonth: worstMonth,
		OverallPerformance:   overallPerformance,
	}

	// Recommendations
	recommendations := make([]dto.BudgetRecommendationResponse, 0)
	if overallPerformance == dto.BudgetPerformancePoor {
		recommendations = append(recommendations, dto.BudgetRecommendationResponse{
			Priority:    "high",
			Type:        "budget_adjustment",
			Title:       "Budget Needs Adjustment",
			Description: "You're consistently spending more than budgeted. Consider reviewing your budget allocations.",
			Impact:      totalActual - totalBudgeted,
			Confidence:  0.9,
		})
	}

	return &dto.BacktestResponse{
		UserID:          userID,
		BudgetID:        budgetID,
		BudgetName:      budget.Name,
		Period:          budget.Period,
		StartDate:       startDate,
		EndDate:         endDate,
		PeriodResults:   periodResults,
		Summary:         summary,
		Recommendations: recommendations,
		AnalyzedAt:      time.Now(),
	}
}

func (h *AnalysisHandler) generateWhatIfAnalysis(req dto.WhatIfRequest, months int) *dto.WhatIfResponse {
	projections := make([]dto.WhatIfProjectionResponse, months)

	baseIncome := 5000.0
	if req.Budget.Income > 0 {
		baseIncome = req.Budget.Income
	}
	baseExpenses := 4000.0
	if req.Budget.TotalBudget > 0 {
		baseExpenses = req.Budget.TotalBudget
	}

	cumulativeSavings := 0.0

	for i := 0; i < months; i++ {
		date := time.Now().AddDate(0, i+1, 0)

		income := baseIncome * (1 + req.IncomeChange)
		expenses := baseExpenses * (1 + req.ExpenseChange)

		if i == 0 && req.OneTimeExpense > 0 {
			expenses += req.OneTimeExpense
		}
		expenses += req.RecurringChange

		savings := income - expenses
		cumulativeSavings += savings

		goalProgress := 0.0
		if req.TargetSavings > 0 {
			goalProgress = (cumulativeSavings / req.TargetSavings) * 100
			if goalProgress > 100 {
				goalProgress = 100
			}
		}

		projections[i] = dto.WhatIfProjectionResponse{
			Month:             i + 1,
			Date:              date,
			ProjectedIncome:   income,
			ProjectedExpenses: expenses,
			ProjectedSavings:  savings,
			CumulativeSavings: cumulativeSavings,
			BudgetVariance:    baseExpenses - expenses,
			CategoryBreakdown: map[string]float64{
				"housing":        expenses * 0.3,
				"food":           expenses * 0.2,
				"transportation": expenses * 0.15,
				"utilities":      expenses * 0.1,
				"entertainment":  expenses * 0.1,
				"other":          expenses * 0.15,
			},
			GoalProgress: goalProgress,
		}
	}

	// Comparison
	baselineTotal := baseExpenses * float64(months)
	scenarioTotal := 0.0
	scenarioSavings := 0.0
	for _, p := range projections {
		scenarioTotal += p.ProjectedExpenses
		scenarioSavings += p.ProjectedSavings
	}
	baselineSavings := (baseIncome - baseExpenses) * float64(months)

	comparison := dto.WhatIfComparisonResponse{
		BaselineTotal:     baselineTotal,
		ScenarioTotal:     scenarioTotal,
		Difference:        scenarioTotal - baselineTotal,
		DifferencePercent: ((scenarioTotal - baselineTotal) / baselineTotal) * 100,
		BaselineSavings:   baselineSavings,
		ScenarioSavings:   scenarioSavings,
		SavingsDifference: scenarioSavings - baselineSavings,
	}

	// Feasibility
	feasibility := dto.FeasibilityResponse{
		IsFeasible:      true,
		ConfidenceLevel: 0.8,
		RiskLevel:       "low",
	}

	negativeMonths := 0
	for _, p := range projections {
		if p.ProjectedSavings < 0 {
			negativeMonths++
		}
	}

	if negativeMonths > 0 {
		feasibility.RiskLevel = "medium"
		feasibility.ConfidenceLevel = 0.6
		feasibility.Obstacles = append(feasibility.Obstacles,
			"Some months projected with negative cash flow")
	}

	if negativeMonths > months/2 {
		feasibility.IsFeasible = false
		feasibility.RiskLevel = "high"
		feasibility.ConfidenceLevel = 0.3
	}

	if req.TargetSavings > 0 && cumulativeSavings > 0 {
		monthlyRate := cumulativeSavings / float64(months)
		if monthlyRate > 0 {
			feasibility.TimeToGoal = int(math.Ceil(req.TargetSavings / monthlyRate))
		}
	}

	return &dto.WhatIfResponse{
		UserID:          req.UserID,
		ScenarioType:    req.ScenarioType,
		ScenarioName:    req.Name,
		StartDate:       time.Now(),
		EndDate:         time.Now().AddDate(0, months, 0),
		Projections:     projections,
		Comparison:      comparison,
		Feasibility:     feasibility,
		Recommendations: []dto.WhatIfRecommendationResponse{},
		AnalyzedAt:      time.Now(),
	}
}

func (h *AnalysisHandler) generateComparison(req dto.ComparePeriodsRequest) *dto.ComparePeriodsResponse {
	categories := []string{"groceries", "dining", "transportation", "utilities", "entertainment", "shopping"}

	period1Total := 0.0
	period2Total := 0.0
	changes := make([]dto.CategoryChangeResponse, len(categories))

	for i, cat := range categories {
		p1 := 200 + rand.Float64()*400
		p2 := p1 * (0.7 + rand.Float64()*0.6)

		changeAmt := p2 - p1
		changePct := 0.0
		if p1 > 0 {
			changePct = (changeAmt / p1) * 100
		}

		changes[i] = dto.CategoryChangeResponse{
			Category:      cat,
			Period1Amount: p1,
			Period2Amount: p2,
			ChangeAmount:  changeAmt,
			ChangePercent: changePct,
		}

		period1Total += p1
		period2Total += p2
	}

	// Sort for increases and decreases
	increases := make([]dto.CategoryChangeResponse, 0)
	decreases := make([]dto.CategoryChangeResponse, 0)

	for _, c := range changes {
		if c.ChangeAmount > 0 {
			increases = append(increases, c)
		} else if c.ChangeAmount < 0 {
			decreases = append(decreases, c)
		}
	}

	sort.Slice(increases, func(i, j int) bool {
		return increases[i].ChangeAmount > increases[j].ChangeAmount
	})
	sort.Slice(decreases, func(i, j int) bool {
		return decreases[i].ChangeAmount < decreases[j].ChangeAmount
	})

	if len(increases) > 3 {
		increases = increases[:3]
	}
	if len(decreases) > 3 {
		decreases = decreases[:3]
	}

	totalChange := period2Total - period1Total
	totalChangePct := 0.0
	if period1Total > 0 {
		totalChangePct = (totalChange / period1Total) * 100
	}

	return &dto.ComparePeriodsResponse{
		UserID:             req.UserID,
		Period1Start:       req.Period1Start,
		Period1End:         req.Period1End,
		Period2Start:       req.Period2Start,
		Period2End:         req.Period2End,
		Period1Total:       period1Total,
		Period2Total:       period2Total,
		TotalChangeAmount:  totalChange,
		TotalChangePercent: totalChangePct,
		CategoryChanges:    changes,
		BiggestIncreases:   increases,
		BiggestDecreases:   decreases,
		AnalyzedAt:         time.Now(),
	}
}

// =============================================================================
// Utility Methods
// =============================================================================

func (h *AnalysisHandler) getPeriodEnd(t time.Time, period dto.TimePeriod) time.Time {
	switch period {
	case dto.TimePeriodDaily:
		return t.AddDate(0, 0, 1).Add(-time.Nanosecond)
	case dto.TimePeriodWeekly:
		return t.AddDate(0, 0, 7).Add(-time.Nanosecond)
	case dto.TimePeriodMonthly:
		return t.AddDate(0, 1, 0).Add(-time.Nanosecond)
	case dto.TimePeriodYearly:
		return t.AddDate(1, 0, 0).Add(-time.Nanosecond)
	default:
		return t.AddDate(0, 1, 0).Add(-time.Nanosecond)
	}
}

func (h *AnalysisHandler) nextPeriod(t time.Time, period dto.TimePeriod) time.Time {
	switch period {
	case dto.TimePeriodDaily:
		return t.AddDate(0, 0, 1)
	case dto.TimePeriodWeekly:
		return t.AddDate(0, 0, 7)
	case dto.TimePeriodMonthly:
		return t.AddDate(0, 1, 0)
	case dto.TimePeriodYearly:
		return t.AddDate(1, 0, 0)
	default:
		return t.AddDate(0, 1, 0)
	}
}

func (h *AnalysisHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func (h *AnalysisHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}

func generateTrendDescription(category string, direction dto.TrendDirection, changePercent float64) string {
	catStr := "Spending"
	if category != "overall" {
		catStr = category + " spending"
	}

	switch direction {
	case dto.TrendDirectionIncreasing:
		return catStr + " has increased by " + formatPercent(changePercent)
	case dto.TrendDirectionDecreasing:
		return catStr + " has decreased by " + formatPercent(math.Abs(changePercent))
	default:
		return catStr + " has remained stable"
	}
}

func formatPercent(p float64) string {
	return string(rune(int('0')+int(p)/10)) + string(rune(int('0')+int(p)%10)) + "." + string(rune(int('0')+int(p*10)%10)) + "%"
}

func generateAnomalyDescription(anomalyType string) string {
	switch anomalyType {
	case "unusually_high":
		return "Transaction amount is unusually high compared to typical spending"
	case "unusually_low":
		return "Transaction amount is unusually low compared to typical spending"
	case "duplicate_charge":
		return "Potential duplicate charge detected"
	case "large_transaction":
		return "Large transaction significantly exceeds your average spending"
	default:
		return "Unusual transaction detected"
	}
}

func determinePerformance(variancePercent float64) dto.BudgetPerformance {
	if variancePercent >= 10 {
		return dto.BudgetPerformanceExcellent
	}
	if variancePercent >= 5 {
		return dto.BudgetPerformanceGood
	}
	if variancePercent >= -5 {
		return dto.BudgetPerformanceOnTrack
	}
	if variancePercent >= -10 {
		return dto.BudgetPerformanceCaution
	}
	return dto.BudgetPerformancePoor
}
