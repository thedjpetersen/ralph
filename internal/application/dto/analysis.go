package dto

import "time"

// =============================================================================
// Analysis Type Constants
// =============================================================================

// AnalysisType represents different types of analysis
type AnalysisType string

const (
	AnalysisTypeSpending  AnalysisType = "spending"
	AnalysisTypeTrend     AnalysisType = "trend"
	AnalysisTypeAnomaly   AnalysisType = "anomaly"
	AnalysisTypeBacktest  AnalysisType = "backtest"
	AnalysisTypeWhatIf    AnalysisType = "what_if"
	AnalysisTypeComparison AnalysisType = "comparison"
)

// TimePeriod represents a time period for analysis
type TimePeriod string

const (
	TimePeriodDaily   TimePeriod = "daily"
	TimePeriodWeekly  TimePeriod = "weekly"
	TimePeriodMonthly TimePeriod = "monthly"
	TimePeriodYearly  TimePeriod = "yearly"
)

// TrendDirection indicates the direction of a trend
type TrendDirection string

const (
	TrendDirectionIncreasing TrendDirection = "increasing"
	TrendDirectionDecreasing TrendDirection = "decreasing"
	TrendDirectionStable     TrendDirection = "stable"
)

// AnomalySeverity indicates how significant an anomaly is
type AnomalySeverity string

const (
	AnomalySeverityLow    AnomalySeverity = "low"
	AnomalySeverityMedium AnomalySeverity = "medium"
	AnomalySeverityHigh   AnomalySeverity = "high"
)

// AnalysisStatus represents the status of an analysis
type AnalysisStatus string

const (
	AnalysisStatusPending   AnalysisStatus = "pending"
	AnalysisStatusRunning   AnalysisStatus = "running"
	AnalysisStatusCompleted AnalysisStatus = "completed"
	AnalysisStatusFailed    AnalysisStatus = "failed"
)

// BudgetPerformance indicates how well a budget performed
type BudgetPerformance string

const (
	BudgetPerformanceExcellent BudgetPerformance = "excellent"
	BudgetPerformanceGood      BudgetPerformance = "good"
	BudgetPerformanceOnTrack   BudgetPerformance = "on_track"
	BudgetPerformanceCaution   BudgetPerformance = "caution"
	BudgetPerformancePoor      BudgetPerformance = "poor"
)

// =============================================================================
// Spending Analysis DTOs
// =============================================================================

// SpendingAnalysisRequest represents a request to analyze spending
type SpendingAnalysisRequest struct {
	UserID    string     `json:"user_id"`
	StartDate time.Time  `json:"start_date"`
	EndDate   time.Time  `json:"end_date"`
	Period    TimePeriod `json:"period,omitempty"`
	Category  string     `json:"category,omitempty"`
}

// CategorySpendingResponse represents spending for a single category
type CategorySpendingResponse struct {
	Category           string  `json:"category"`
	Amount             float64 `json:"amount"`
	TransactionCount   int     `json:"transaction_count"`
	Percentage         float64 `json:"percentage"`
	AverageTransaction float64 `json:"average_transaction"`
}

// PeriodSpendingResponse represents spending for a time period
type PeriodSpendingResponse struct {
	StartDate        time.Time                  `json:"start_date"`
	EndDate          time.Time                  `json:"end_date"`
	TotalAmount      float64                    `json:"total_amount"`
	TransactionCount int                        `json:"transaction_count"`
	ByCategory       []CategorySpendingResponse `json:"by_category"`
}

// SpendingAnalysisResponse represents the result of spending analysis
type SpendingAnalysisResponse struct {
	UserID           string                     `json:"user_id"`
	Period           TimePeriod                 `json:"period"`
	StartDate        time.Time                  `json:"start_date"`
	EndDate          time.Time                  `json:"end_date"`
	Periods          []PeriodSpendingResponse   `json:"periods"`
	TotalSpending    float64                    `json:"total_spending"`
	AveragePerPeriod float64                    `json:"average_per_period"`
	TopCategories    []CategorySpendingResponse `json:"top_categories"`
	AnalyzedAt       time.Time                  `json:"analyzed_at"`
}

// =============================================================================
// Trend Analysis DTOs
// =============================================================================

// TrendAnalysisRequest represents a request to analyze trends
type TrendAnalysisRequest struct {
	UserID    string     `json:"user_id"`
	StartDate time.Time  `json:"start_date"`
	EndDate   time.Time  `json:"end_date"`
	Period    TimePeriod `json:"period,omitempty"`
	Category  string     `json:"category,omitempty"`
}

// SpendingTrendResponse represents a detected spending trend
type SpendingTrendResponse struct {
	Category      string         `json:"category,omitempty"`
	Direction     TrendDirection `json:"direction"`
	ChangePercent float64        `json:"change_percent"`
	ChangeAmount  float64        `json:"change_amount"`
	StartAmount   float64        `json:"start_amount"`
	EndAmount     float64        `json:"end_amount"`
	Slope         float64        `json:"slope"`
	RSquared      float64        `json:"r_squared"`
	Confidence    float64        `json:"confidence"`
	PeriodCount   int            `json:"period_count"`
	Description   string         `json:"description"`
}

// TrendAnalysisResponse represents the result of trend analysis
type TrendAnalysisResponse struct {
	UserID            string                  `json:"user_id"`
	AnalysisPeriod    TimePeriod              `json:"analysis_period"`
	StartDate         time.Time               `json:"start_date"`
	EndDate           time.Time               `json:"end_date"`
	Trends            []SpendingTrendResponse `json:"trends"`
	OverallTrend      SpendingTrendResponse   `json:"overall_trend"`
	SignificantTrends []SpendingTrendResponse `json:"significant_trends"`
	AnalyzedAt        time.Time               `json:"analyzed_at"`
}

// =============================================================================
// Anomaly Detection DTOs
// =============================================================================

// AnomalyDetectionRequest represents a request to detect anomalies
type AnomalyDetectionRequest struct {
	UserID    string    `json:"user_id"`
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`
}

// SpendingAnomalyResponse represents a detected spending anomaly
type SpendingAnomalyResponse struct {
	ID              string          `json:"id"`
	Type            string          `json:"type"`
	Severity        AnomalySeverity `json:"severity"`
	Category        string          `json:"category,omitempty"`
	MerchantName    string          `json:"merchant_name,omitempty"`
	Amount          float64         `json:"amount"`
	ExpectedAmount  float64         `json:"expected_amount,omitempty"`
	Deviation       float64         `json:"deviation"`
	ZScore          float64         `json:"z_score"`
	TransactionID   string          `json:"transaction_id,omitempty"`
	TransactionDate time.Time       `json:"transaction_date"`
	Description     string          `json:"description"`
	Confidence      float64         `json:"confidence"`
}

// AnomalyDetectionResponse represents the result of anomaly detection
type AnomalyDetectionResponse struct {
	UserID         string                    `json:"user_id"`
	StartDate      time.Time                 `json:"start_date"`
	EndDate        time.Time                 `json:"end_date"`
	Anomalies      []SpendingAnomalyResponse `json:"anomalies"`
	AnomalyCount   int                       `json:"anomaly_count"`
	HighSeverity   int                       `json:"high_severity_count"`
	MediumSeverity int                       `json:"medium_severity_count"`
	LowSeverity    int                       `json:"low_severity_count"`
	AnalyzedAt     time.Time                 `json:"analyzed_at"`
}

// =============================================================================
// Backtest DTOs
// =============================================================================

// BudgetRequest represents a budget for backtesting
type BudgetRequest struct {
	ID              string             `json:"id,omitempty"`
	Name            string             `json:"name"`
	Period          string             `json:"period"`
	TotalBudget     float64            `json:"total_budget"`
	CategoryBudgets map[string]float64 `json:"category_budgets,omitempty"`
	Income          float64            `json:"income,omitempty"`
	SavingsGoal     float64            `json:"savings_goal,omitempty"`
}

// BacktestRequest represents a request to run a backtest
type BacktestRequest struct {
	UserID    string        `json:"user_id"`
	Budget    BudgetRequest `json:"budget"`
	StartDate time.Time     `json:"start_date"`
	EndDate   time.Time     `json:"end_date"`
}

// CategoryAllocationResponse represents allocated amount for a category
type CategoryAllocationResponse struct {
	Category     string            `json:"category"`
	BudgetAmount float64           `json:"budget_amount"`
	ActualAmount float64           `json:"actual_amount"`
	Variance     float64           `json:"variance"`
	Percentage   float64           `json:"percentage"`
	Performance  BudgetPerformance `json:"performance"`
}

// PeriodBacktestResponse represents the backtest result for a single period
type PeriodBacktestResponse struct {
	PeriodStart      time.Time                    `json:"period_start"`
	PeriodEnd        time.Time                    `json:"period_end"`
	BudgetedAmount   float64                      `json:"budgeted_amount"`
	ActualAmount     float64                      `json:"actual_amount"`
	Variance         float64                      `json:"variance"`
	VariancePercent  float64                      `json:"variance_percent"`
	Performance      BudgetPerformance            `json:"performance"`
	CategoryResults  []CategoryAllocationResponse `json:"category_results"`
	TransactionCount int                          `json:"transaction_count"`
	LargestExpense   float64                      `json:"largest_expense"`
	AverageDaily     float64                      `json:"average_daily"`
}

// BacktestSummaryResponse provides aggregate statistics for the backtest
type BacktestSummaryResponse struct {
	TotalPeriods         int               `json:"total_periods"`
	PeriodsUnderBudget   int               `json:"periods_under_budget"`
	PeriodsOverBudget    int               `json:"periods_over_budget"`
	PeriodsOnTrack       int               `json:"periods_on_track"`
	AverageVariance      float64           `json:"average_variance"`
	TotalBudgeted        float64           `json:"total_budgeted"`
	TotalActual          float64           `json:"total_actual"`
	TotalSavings         float64           `json:"total_savings"`
	ConsistencyScore     float64           `json:"consistency_score"`
	BestPerformingMonth  string            `json:"best_performing_month"`
	WorstPerformingMonth string            `json:"worst_performing_month"`
	OverallPerformance   BudgetPerformance `json:"overall_performance"`
}

// BudgetRecommendationResponse represents a recommendation based on backtest
type BudgetRecommendationResponse struct {
	Category    string  `json:"category,omitempty"`
	Priority    string  `json:"priority"`
	Type        string  `json:"type"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Impact      float64 `json:"impact,omitempty"`
	Confidence  float64 `json:"confidence"`
}

// BacktestResponse represents the complete backtest result
type BacktestResponse struct {
	UserID          string                         `json:"user_id"`
	BudgetID        string                         `json:"budget_id"`
	BudgetName      string                         `json:"budget_name"`
	Period          string                         `json:"period"`
	StartDate       time.Time                      `json:"start_date"`
	EndDate         time.Time                      `json:"end_date"`
	PeriodResults   []PeriodBacktestResponse       `json:"period_results"`
	Summary         BacktestSummaryResponse        `json:"summary"`
	Recommendations []BudgetRecommendationResponse `json:"recommendations"`
	AnalyzedAt      time.Time                      `json:"analyzed_at"`
}

// =============================================================================
// What-If Analysis DTOs
// =============================================================================

// WhatIfRequest represents parameters for a what-if scenario
type WhatIfRequest struct {
	UserID           string             `json:"user_id"`
	Budget           BudgetRequest      `json:"budget"`
	ScenarioType     string             `json:"scenario_type"`
	Name             string             `json:"name"`
	Description      string             `json:"description,omitempty"`
	IncomeChange     float64            `json:"income_change,omitempty"`
	ExpenseChange    float64            `json:"expense_change,omitempty"`
	CategoryChanges  map[string]float64 `json:"category_changes,omitempty"`
	TargetSavings    float64            `json:"target_savings,omitempty"`
	TimeframeMonths  int                `json:"timeframe_months,omitempty"`
	OneTimeExpense   float64            `json:"one_time_expense,omitempty"`
	RecurringChange  float64            `json:"recurring_change,omitempty"`
}

// WhatIfProjectionResponse represents a projected month
type WhatIfProjectionResponse struct {
	Month             int                `json:"month"`
	Date              time.Time          `json:"date"`
	ProjectedIncome   float64            `json:"projected_income"`
	ProjectedExpenses float64            `json:"projected_expenses"`
	ProjectedSavings  float64            `json:"projected_savings"`
	CumulativeSavings float64            `json:"cumulative_savings"`
	BudgetVariance    float64            `json:"budget_variance"`
	CategoryBreakdown map[string]float64 `json:"category_breakdown"`
	GoalProgress      float64            `json:"goal_progress,omitempty"`
}

// WhatIfComparisonResponse compares baseline vs scenario
type WhatIfComparisonResponse struct {
	BaselineTotal     float64 `json:"baseline_total"`
	ScenarioTotal     float64 `json:"scenario_total"`
	Difference        float64 `json:"difference"`
	DifferencePercent float64 `json:"difference_percent"`
	BaselineSavings   float64 `json:"baseline_savings"`
	ScenarioSavings   float64 `json:"scenario_savings"`
	SavingsDifference float64 `json:"savings_difference"`
}

// FeasibilityResponse assesses if a scenario is achievable
type FeasibilityResponse struct {
	IsFeasible      bool     `json:"is_feasible"`
	ConfidenceLevel float64  `json:"confidence_level"`
	RiskLevel       string   `json:"risk_level"`
	RequiredChange  float64  `json:"required_change,omitempty"`
	TimeToGoal      int      `json:"time_to_goal,omitempty"`
	Obstacles       []string `json:"obstacles,omitempty"`
	Opportunities   []string `json:"opportunities,omitempty"`
}

// WhatIfRecommendationResponse provides recommendations for what-if scenarios
type WhatIfRecommendationResponse struct {
	Category    string  `json:"category"`
	Action      string  `json:"action"`
	Impact      float64 `json:"impact"`
	Difficulty  string  `json:"difficulty"`
	Description string  `json:"description"`
}

// WhatIfResponse represents the complete what-if analysis result
type WhatIfResponse struct {
	UserID          string                         `json:"user_id"`
	ScenarioType    string                         `json:"scenario_type"`
	ScenarioName    string                         `json:"scenario_name"`
	StartDate       time.Time                      `json:"start_date"`
	EndDate         time.Time                      `json:"end_date"`
	Projections     []WhatIfProjectionResponse     `json:"projections"`
	Comparison      WhatIfComparisonResponse       `json:"comparison"`
	Feasibility     FeasibilityResponse            `json:"feasibility"`
	Recommendations []WhatIfRecommendationResponse `json:"recommendations"`
	AnalyzedAt      time.Time                      `json:"analyzed_at"`
}

// =============================================================================
// Comparison Analysis DTOs
// =============================================================================

// ComparePeriodsRequest represents a request to compare spending periods
type ComparePeriodsRequest struct {
	UserID       string    `json:"user_id"`
	Period1Start time.Time `json:"period1_start"`
	Period1End   time.Time `json:"period1_end"`
	Period2Start time.Time `json:"period2_start"`
	Period2End   time.Time `json:"period2_end"`
}

// CategoryChangeResponse represents a change in spending for a category
type CategoryChangeResponse struct {
	Category      string  `json:"category"`
	Period1Amount float64 `json:"period1_amount"`
	Period2Amount float64 `json:"period2_amount"`
	ChangeAmount  float64 `json:"change_amount"`
	ChangePercent float64 `json:"change_percent"`
}

// ComparePeriodsResponse represents comparison between two periods
type ComparePeriodsResponse struct {
	UserID             string                   `json:"user_id"`
	Period1Start       time.Time                `json:"period1_start"`
	Period1End         time.Time                `json:"period1_end"`
	Period2Start       time.Time                `json:"period2_start"`
	Period2End         time.Time                `json:"period2_end"`
	Period1Total       float64                  `json:"period1_total"`
	Period2Total       float64                  `json:"period2_total"`
	TotalChangeAmount  float64                  `json:"total_change_amount"`
	TotalChangePercent float64                  `json:"total_change_percent"`
	CategoryChanges    []CategoryChangeResponse `json:"category_changes"`
	BiggestIncreases   []CategoryChangeResponse `json:"biggest_increases"`
	BiggestDecreases   []CategoryChangeResponse `json:"biggest_decreases"`
	AnalyzedAt         time.Time                `json:"analyzed_at"`
}

// =============================================================================
// List Response DTOs
// =============================================================================

// AnalysisListResponse represents a list of analyses
type AnalysisListResponse struct {
	Analyses []AnalysisResultResponse `json:"analyses"`
	Total    int                      `json:"total"`
}

// AnalysisResultResponse represents a generic analysis result
type AnalysisResultResponse struct {
	ID          string         `json:"id"`
	UserID      string         `json:"user_id"`
	Type        AnalysisType   `json:"type"`
	Status      AnalysisStatus `json:"status"`
	StartDate   time.Time      `json:"start_date"`
	EndDate     time.Time      `json:"end_date"`
	CreatedAt   time.Time      `json:"created_at"`
	CompletedAt *time.Time     `json:"completed_at,omitempty"`
	Error       string         `json:"error,omitempty"`
}
