package retirement

import (
	"encoding/json"
	"math"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"

	"clockzen-next/internal/application/dto"
)

// FIRECalculation represents a stored FIRE calculation
type FIRECalculation struct {
	ID        string                    `json:"id"`
	PlanID    string                    `json:"plan_id"`
	Name      string                    `json:"name"`
	Request   dto.FIRECalculationRequest `json:"request"`
	Result    *dto.FIREResultResponse   `json:"result,omitempty"`
	Timeline  *dto.FIRETimelineResponse `json:"timeline,omitempty"`
	CreatedAt time.Time                 `json:"created_at"`
	UpdatedAt time.Time                 `json:"updated_at"`
}

// FIREHandler handles HTTP requests for FIRE calculations
type FIREHandler struct {
	mu           sync.RWMutex
	calculations map[string]*FIRECalculation
}

// NewFIREHandler creates a new FIREHandler instance
func NewFIREHandler() *FIREHandler {
	return &FIREHandler{
		calculations: make(map[string]*FIRECalculation),
	}
}

// CreateFIRERequest represents a request to create a FIRE calculation
type CreateFIRERequest struct {
	PlanID  string                     `json:"plan_id"`
	Name    string                     `json:"name"`
	Request dto.FIRECalculationRequest `json:"request"`
}

// UpdateFIRERequest represents a request to update a FIRE calculation
type UpdateFIRERequest struct {
	Name    *string                     `json:"name,omitempty"`
	Request *dto.FIRECalculationRequest `json:"request,omitempty"`
}

// ListFIREResponse represents a list of FIRE calculations
type ListFIREResponse struct {
	Calculations []*FIRECalculation `json:"calculations"`
	Total        int                `json:"total"`
}

// HandleCreate handles POST /api/retirement/fire
func (h *FIREHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req CreateFIRERequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if err := h.validateCreateRequest(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	// Calculate FIRE result
	result := h.calculateFIRE(&req.Request)
	timeline := h.calculateTimeline(&req.Request, result)

	now := time.Now()
	calculation := &FIRECalculation{
		ID:        uuid.New().String(),
		PlanID:    req.PlanID,
		Name:      req.Name,
		Request:   req.Request,
		Result:    result,
		Timeline:  timeline,
		CreatedAt: now,
		UpdatedAt: now,
	}

	h.mu.Lock()
	h.calculations[calculation.ID] = calculation
	h.mu.Unlock()

	h.writeJSON(w, http.StatusCreated, calculation)
}

// HandleGet handles GET /api/retirement/fire/{id}
func (h *FIREHandler) HandleGet(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	calculation, exists := h.calculations[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "FIRE calculation not found")
		return
	}

	h.writeJSON(w, http.StatusOK, calculation)
}

// HandleList handles GET /api/retirement/fire
func (h *FIREHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	// Get optional plan_id filter from query params
	planID := r.URL.Query().Get("plan_id")

	h.mu.RLock()
	calculations := make([]*FIRECalculation, 0)
	for _, calc := range h.calculations {
		if planID == "" || calc.PlanID == planID {
			calculations = append(calculations, calc)
		}
	}
	h.mu.RUnlock()

	resp := ListFIREResponse{
		Calculations: calculations,
		Total:        len(calculations),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleListByPlan handles GET /api/retirement/plans/{planId}/fire
func (h *FIREHandler) HandleListByPlan(w http.ResponseWriter, r *http.Request, planID string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	calculations := make([]*FIRECalculation, 0)
	for _, calc := range h.calculations {
		if calc.PlanID == planID {
			calculations = append(calculations, calc)
		}
	}
	h.mu.RUnlock()

	resp := ListFIREResponse{
		Calculations: calculations,
		Total:        len(calculations),
	}

	h.writeJSON(w, http.StatusOK, resp)
}

// HandleUpdate handles PUT /api/retirement/fire/{id}
func (h *FIREHandler) HandleUpdate(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPut && r.Method != http.MethodPatch {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only PUT/PATCH methods are allowed")
		return
	}

	var req UpdateFIRERequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	calculation, exists := h.calculations[id]
	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "FIRE calculation not found")
		return
	}

	// Apply updates
	if req.Name != nil {
		calculation.Name = *req.Name
	}
	if req.Request != nil {
		calculation.Request = *req.Request
		// Recalculate FIRE result
		calculation.Result = h.calculateFIRE(&calculation.Request)
		calculation.Timeline = h.calculateTimeline(&calculation.Request, calculation.Result)
	}

	calculation.UpdatedAt = time.Now()

	h.writeJSON(w, http.StatusOK, calculation)
}

// HandleDelete handles DELETE /api/retirement/fire/{id}
func (h *FIREHandler) HandleDelete(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only DELETE method is allowed")
		return
	}

	h.mu.Lock()
	_, exists := h.calculations[id]
	if !exists {
		h.mu.Unlock()
		h.writeError(w, http.StatusNotFound, "not_found", "FIRE calculation not found")
		return
	}
	delete(h.calculations, id)
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// HandleCalculateForPlan handles POST /api/retirement/plans/{planId}/fire
func (h *FIREHandler) HandleCalculateForPlan(w http.ResponseWriter, r *http.Request, planID string) {
	if r.Method != http.MethodPost {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST method is allowed")
		return
	}

	var req dto.FIRECalculationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body: "+err.Error())
		return
	}

	if err := h.validateFIRERequest(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	// Calculate FIRE result
	result := h.calculateFIRE(&req)
	timeline := h.calculateTimeline(&req, result)

	now := time.Now()
	calculation := &FIRECalculation{
		ID:        uuid.New().String(),
		PlanID:    planID,
		Name:      "FIRE Calculation " + now.Format("2006-01-02 15:04:05"),
		Request:   req,
		Result:    result,
		Timeline:  timeline,
		CreatedAt: now,
		UpdatedAt: now,
	}

	h.mu.Lock()
	h.calculations[calculation.ID] = calculation
	h.mu.Unlock()

	h.writeJSON(w, http.StatusOK, calculation)
}

// HandleGetMilestones handles GET /api/retirement/fire/{id}/milestones
func (h *FIREHandler) HandleGetMilestones(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		h.writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "Only GET method is allowed")
		return
	}

	h.mu.RLock()
	calculation, exists := h.calculations[id]
	h.mu.RUnlock()

	if !exists {
		h.writeError(w, http.StatusNotFound, "not_found", "FIRE calculation not found")
		return
	}

	if calculation.Timeline == nil {
		h.writeError(w, http.StatusNotFound, "not_found", "No milestones available")
		return
	}

	h.writeJSON(w, http.StatusOK, calculation.Timeline.Milestones)
}

// calculateFIRE calculates the FIRE metrics
func (h *FIREHandler) calculateFIRE(req *dto.FIRECalculationRequest) *dto.FIREResultResponse {
	result := &dto.FIREResultResponse{
		FIREType: req.FIREType,
	}

	// Calculate annual savings
	annualSavings := req.AnnualIncome * req.SavingsRate
	result.AnnualSavings = annualSavings

	// Calculate safe annual withdrawal
	safeWithdrawalRate := req.SafeWithdrawal
	if safeWithdrawalRate == 0 {
		safeWithdrawalRate = 0.04 // Default 4% rule
	}

	// Adjust expenses based on FIRE type
	adjustedExpenses := req.AnnualExpenses
	switch req.FIREType {
	case dto.FIRETypeLean:
		adjustedExpenses = req.AnnualExpenses * 0.7 // 30% less than normal
	case dto.FIRETypeFat:
		adjustedExpenses = req.AnnualExpenses * 1.5 // 50% more than normal
	case dto.FIRETypeBarista:
		adjustedExpenses = req.AnnualExpenses - req.PartTimeIncome // Offset by part-time income
		if adjustedExpenses < 0 {
			adjustedExpenses = 0
		}
	}

	// Calculate FIRE number
	fireNumber := adjustedExpenses / safeWithdrawalRate
	result.FIRENumber = fireNumber
	result.SafeAnnualWithdrawal = adjustedExpenses

	// Calculate current progress
	if fireNumber > 0 {
		result.CurrentProgress = req.TotalSavings / fireNumber
		if result.CurrentProgress > 1 {
			result.CurrentProgress = 1
		}
	}

	// Calculate years to FIRE using compound growth formula
	// FV = PV * (1 + r)^n + PMT * ((1 + r)^n - 1) / r
	// Solve for n when FV = fireNumber
	realReturn := req.ExpectedReturn - req.InflationRate
	if realReturn <= 0 {
		realReturn = 0.01 // Minimum 1% real return
	}

	if req.TotalSavings >= fireNumber {
		result.YearsToFIRE = 0
		result.FIREAge = req.CurrentAge
	} else if annualSavings <= 0 {
		// No savings, can't reach FIRE
		result.YearsToFIRE = -1
		result.FIREAge = -1
	} else {
		// Use iterative approach for more accuracy
		years := 0.0
		balance := req.TotalSavings
		for balance < fireNumber && years < 100 {
			balance = balance*(1+realReturn) + annualSavings
			years++
		}
		result.YearsToFIRE = years
		result.FIREAge = req.CurrentAge + int(math.Ceil(years))
	}

	result.ProjectedSavingsAtFIRE = fireNumber

	// Sensitivity analysis
	// Lower return (-2%)
	lowerReturn := realReturn - 0.02
	if lowerReturn <= 0 {
		lowerReturn = 0.01
	}
	result.YearsIfReturnLower = h.calculateYearsToTarget(req.TotalSavings, annualSavings, fireNumber, lowerReturn)

	// Higher return (+2%)
	higherReturn := realReturn + 0.02
	result.YearsIfReturnHigher = h.calculateYearsToTarget(req.TotalSavings, annualSavings, fireNumber, higherReturn)

	// Higher expenses (+20%)
	higherExpensesFIRE := (adjustedExpenses * 1.2) / safeWithdrawalRate
	result.YearsIfExpenseMore = h.calculateYearsToTarget(req.TotalSavings, annualSavings, higherExpensesFIRE, realReturn)

	// Lower expenses (-20%)
	lowerExpensesFIRE := (adjustedExpenses * 0.8) / safeWithdrawalRate
	result.YearsIfExpenseLess = h.calculateYearsToTarget(req.TotalSavings, annualSavings, lowerExpensesFIRE, realReturn)

	// Coast FIRE specific calculations
	if req.FIREType == dto.FIRETypeCoast {
		targetAge := req.TargetRetirementAge
		if targetAge == 0 {
			targetAge = 65 // Default retirement age
		}
		yearsToRetirement := float64(targetAge - req.CurrentAge)
		if yearsToRetirement > 0 {
			// Calculate how much you need today to reach FIRE number by retirement with no additional contributions
			coastNumber := fireNumber / math.Pow(1+realReturn, yearsToRetirement)
			result.CoastFIRENumber = coastNumber
		}
	}

	// Barista FIRE specific calculations
	if req.FIREType == dto.FIRETypeBarista && req.PartTimeIncome > 0 {
		// Calculate years of part-time work needed
		if adjustedExpenses > 0 {
			// Calculate smaller FIRE number needed with part-time income
			baristaFIRE := adjustedExpenses / safeWithdrawalRate
			baristaYears := h.calculateYearsToTarget(req.TotalSavings, annualSavings, baristaFIRE, realReturn)
			result.PartTimeYears = baristaYears
		}
	}

	return result
}

// calculateYearsToTarget calculates years needed to reach a target balance
func (h *FIREHandler) calculateYearsToTarget(current, annual, target, rate float64) float64 {
	if current >= target {
		return 0
	}
	if annual <= 0 {
		return -1
	}

	years := 0.0
	balance := current
	for balance < target && years < 100 {
		balance = balance*(1+rate) + annual
		years++
	}
	return years
}

// calculateTimeline calculates the FIRE journey timeline
func (h *FIREHandler) calculateTimeline(req *dto.FIRECalculationRequest, result *dto.FIREResultResponse) *dto.FIRETimelineResponse {
	timeline := &dto.FIRETimelineResponse{
		FIREResult: *result,
	}

	// Create milestones
	milestones := []dto.FIREMilestoneResponse{
		{
			Name:          "Emergency Fund",
			TargetAmount:  req.AnnualExpenses * 0.5, // 6 months expenses
			CurrentAmount: min(req.TotalSavings, req.AnnualExpenses*0.5),
			Description:   "6 months of expenses saved for emergencies",
		},
		{
			Name:          "Coast FIRE",
			TargetAmount:  result.CoastFIRENumber,
			CurrentAmount: req.TotalSavings,
			Description:   "Enough saved to stop contributing and still reach FIRE by retirement",
		},
		{
			Name:          "25% FIRE",
			TargetAmount:  result.FIRENumber * 0.25,
			CurrentAmount: req.TotalSavings,
			Description:   "Quarter of the way to financial independence",
		},
		{
			Name:          "50% FIRE",
			TargetAmount:  result.FIRENumber * 0.5,
			CurrentAmount: req.TotalSavings,
			Description:   "Halfway to financial independence",
		},
		{
			Name:          "75% FIRE",
			TargetAmount:  result.FIRENumber * 0.75,
			CurrentAmount: req.TotalSavings,
			Description:   "Three-quarters of the way to financial independence",
		},
		{
			Name:          "FIRE",
			TargetAmount:  result.FIRENumber,
			CurrentAmount: req.TotalSavings,
			Description:   "Financial independence achieved",
		},
	}

	// Calculate progress and years for each milestone
	annualSavings := req.AnnualIncome * req.SavingsRate
	realReturn := req.ExpectedReturn - req.InflationRate
	if realReturn <= 0 {
		realReturn = 0.01
	}

	for i := range milestones {
		if milestones[i].TargetAmount > 0 {
			milestones[i].Progress = milestones[i].CurrentAmount / milestones[i].TargetAmount
			if milestones[i].Progress > 1 {
				milestones[i].Progress = 1
			}
			milestones[i].YearsToReach = h.calculateYearsToTarget(req.TotalSavings, annualSavings, milestones[i].TargetAmount, realReturn)
		}
	}

	timeline.Milestones = milestones

	// Generate yearly projections
	maxYears := max(int(result.YearsToFIRE)+5, 10)
	maxYears = min(maxYears, 50)

	yearlyProjections := make([]dto.FIREYearResponse, 0, maxYears)
	balance := req.TotalSavings
	currentYear := time.Now().Year()

	for year := range maxYears {
		startBalance := balance
		contributions := annualSavings
		growth := balance * realReturn
		endBalance := balance + contributions + growth

		fireProgress := endBalance / result.FIRENumber
		if fireProgress > 1 {
			fireProgress = 1
		}

		projection := dto.FIREYearResponse{
			Year:             currentYear + year,
			Age:              req.CurrentAge + year,
			StartBalance:     startBalance,
			Contributions:    contributions,
			InvestmentGrowth: growth,
			EndBalance:       endBalance,
			FIREProgress:     fireProgress,
			IsFIREReached:    endBalance >= result.FIRENumber,
		}

		yearlyProjections = append(yearlyProjections, projection)
		balance = endBalance
	}

	timeline.YearlyProjections = yearlyProjections

	return timeline
}

// validateCreateRequest validates the create FIRE request
func (h *FIREHandler) validateCreateRequest(req *CreateFIRERequest) error {
	if req.PlanID == "" {
		return newValidationError("plan_id is required")
	}
	if req.Name == "" {
		return newValidationError("name is required")
	}
	return h.validateFIRERequest(&req.Request)
}

// validateFIRERequest validates the FIRE calculation request
func (h *FIREHandler) validateFIRERequest(req *dto.FIRECalculationRequest) error {
	if req.CurrentAge < 1 || req.CurrentAge > 120 {
		return newValidationError("current_age must be between 1 and 120")
	}
	if req.AnnualIncome < 0 {
		return newValidationError("annual_income cannot be negative")
	}
	if req.AnnualExpenses < 0 {
		return newValidationError("annual_expenses cannot be negative")
	}
	if req.TotalSavings < 0 {
		return newValidationError("total_savings cannot be negative")
	}
	if req.SavingsRate < 0 || req.SavingsRate > 1 {
		return newValidationError("savings_rate must be between 0 and 1")
	}
	if req.ExpectedReturn < 0 || req.ExpectedReturn > 1 {
		return newValidationError("expected_return must be between 0 and 1")
	}
	if req.InflationRate < 0 || req.InflationRate > 1 {
		return newValidationError("inflation_rate must be between 0 and 1")
	}
	if req.SafeWithdrawal < 0 || req.SafeWithdrawal > 1 {
		return newValidationError("safe_withdrawal_rate must be between 0 and 1")
	}
	if !isValidFIREType(req.FIREType) {
		return newValidationError("fire_type must be one of: traditional, lean, fat, barista, coast")
	}
	if req.FIREType == dto.FIRETypeBarista && req.PartTimeIncome < 0 {
		return newValidationError("part_time_income cannot be negative for barista FIRE")
	}
	if req.FIREType == dto.FIRETypeCoast && req.TargetRetirementAge > 0 && req.TargetRetirementAge <= req.CurrentAge {
		return newValidationError("target_retirement_age must be greater than current_age for coast FIRE")
	}
	return nil
}

// isValidFIREType checks if the FIRE type is valid
func isValidFIREType(t dto.FIREType) bool {
	switch t {
	case dto.FIRETypeTraditional, dto.FIRETypeLean, dto.FIRETypeFat, dto.FIRETypeBarista, dto.FIRETypeCoast:
		return true
	}
	return false
}

// writeJSON writes a JSON response
func (h *FIREHandler) writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// writeError writes an error response
func (h *FIREHandler) writeError(w http.ResponseWriter, status int, errCode string, message string) {
	h.writeJSON(w, status, ErrorResponse{
		Error:   errCode,
		Message: message,
	})
}
