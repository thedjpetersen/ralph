package analysis

import (
	"context"
	"errors"
	"fmt"
	"math"
	"sort"
	"time"
)

// =============================================================================
// Budget Backtesting Types and Constants
// =============================================================================

// BudgetCategory represents a category in a budget
type BudgetCategory string

// Common budget categories
const (
	BudgetCategoryHousing        BudgetCategory = "housing"
	BudgetCategoryFood           BudgetCategory = "food"
	BudgetCategoryTransportation BudgetCategory = "transportation"
	BudgetCategoryUtilities      BudgetCategory = "utilities"
	BudgetCategoryHealthcare     BudgetCategory = "healthcare"
	BudgetCategoryEntertainment  BudgetCategory = "entertainment"
	BudgetCategoryDebt           BudgetCategory = "debt"
	BudgetCategorySavings        BudgetCategory = "savings"
	BudgetCategoryPersonal       BudgetCategory = "personal"
	BudgetCategoryOther          BudgetCategory = "other"
)

// BacktestPeriod represents the period for backtesting
type BacktestPeriod string

const (
	BacktestPeriodWeekly   BacktestPeriod = "weekly"
	BacktestPeriodMonthly  BacktestPeriod = "monthly"
	BacktestPeriodQuarterly BacktestPeriod = "quarterly"
	BacktestPeriodYearly   BacktestPeriod = "yearly"
)

// BudgetPerformance indicates how well a budget performed
type BudgetPerformance string

const (
	PerformanceExcellent BudgetPerformance = "excellent" // Under budget by >10%
	PerformanceGood      BudgetPerformance = "good"      // Under budget by 0-10%
	PerformanceOnTrack   BudgetPerformance = "on_track"  // Within 5% of budget
	PerformanceCaution   BudgetPerformance = "caution"   // Over budget by 0-10%
	PerformancePoor      BudgetPerformance = "poor"      // Over budget by >10%
)

// WhatIfScenario represents different what-if scenario types
type WhatIfScenario string

const (
	ScenarioIncomeIncrease    WhatIfScenario = "income_increase"
	ScenarioIncomeDecrease    WhatIfScenario = "income_decrease"
	ScenarioExpenseIncrease   WhatIfScenario = "expense_increase"
	ScenarioExpenseDecrease   WhatIfScenario = "expense_decrease"
	ScenarioSavingsGoal       WhatIfScenario = "savings_goal"
	ScenarioDebtPayoff        WhatIfScenario = "debt_payoff"
	ScenarioEmergencyFund     WhatIfScenario = "emergency_fund"
	ScenarioLifestyleChange   WhatIfScenario = "lifestyle_change"
	ScenarioCategoryReduction WhatIfScenario = "category_reduction"
)

// =============================================================================
// Budget Data Types
// =============================================================================

// Budget represents a user's budget plan
type Budget struct {
	ID              string                       `json:"id"`
	UserID          string                       `json:"user_id"`
	Name            string                       `json:"name"`
	Period          BacktestPeriod               `json:"period"`
	StartDate       time.Time                    `json:"start_date"`
	EndDate         time.Time                    `json:"end_date"`
	TotalBudget     float64                      `json:"total_budget"`
	CategoryBudgets map[BudgetCategory]float64   `json:"category_budgets"`
	Income          float64                      `json:"income"`
	SavingsGoal     float64                      `json:"savings_goal"`
	CreatedAt       time.Time                    `json:"created_at"`
	UpdatedAt       time.Time                    `json:"updated_at"`
}

// BudgetCategoryAllocation represents allocated amount for a category
type BudgetCategoryAllocation struct {
	Category     BudgetCategory `json:"category"`
	BudgetAmount float64        `json:"budget_amount"`
	ActualAmount float64        `json:"actual_amount"`
	Variance     float64        `json:"variance"`
	Percentage   float64        `json:"percentage"`
	Performance  BudgetPerformance `json:"performance"`
}

// =============================================================================
// Backtest Result Types
// =============================================================================

// PeriodBacktestResult represents the backtest result for a single period
type PeriodBacktestResult struct {
	PeriodStart       time.Time                       `json:"period_start"`
	PeriodEnd         time.Time                       `json:"period_end"`
	BudgetedAmount    float64                         `json:"budgeted_amount"`
	ActualAmount      float64                         `json:"actual_amount"`
	Variance          float64                         `json:"variance"`
	VariancePercent   float64                         `json:"variance_percent"`
	Performance       BudgetPerformance               `json:"performance"`
	CategoryResults   []BudgetCategoryAllocation      `json:"category_results"`
	TransactionCount  int                             `json:"transaction_count"`
	LargestExpense    float64                         `json:"largest_expense"`
	AverageDaily      float64                         `json:"average_daily"`
}

// CategoryTrendData represents trend data for a specific category
type CategoryTrendData struct {
	Category        BudgetCategory   `json:"category"`
	Periods         []float64        `json:"periods"`
	PeriodLabels    []string         `json:"period_labels"`
	AverageAmount   float64          `json:"average_amount"`
	TrendDirection  TrendDirection   `json:"trend_direction"`
	TrendSlope      float64          `json:"trend_slope"`
	Volatility      float64          `json:"volatility"`
	Seasonality     []float64        `json:"seasonality,omitempty"`
}

// BacktestSummary provides aggregate statistics for the backtest
type BacktestSummary struct {
	TotalPeriods        int                `json:"total_periods"`
	PeriodsUnderBudget  int                `json:"periods_under_budget"`
	PeriodsOverBudget   int                `json:"periods_over_budget"`
	PeriodsOnTrack      int                `json:"periods_on_track"`
	AverageVariance     float64            `json:"average_variance"`
	TotalBudgeted       float64            `json:"total_budgeted"`
	TotalActual         float64            `json:"total_actual"`
	TotalSavings        float64            `json:"total_savings"`
	ConsistencyScore    float64            `json:"consistency_score"`
	BestPerformingMonth string             `json:"best_performing_month"`
	WorstPerformingMonth string            `json:"worst_performing_month"`
	OverallPerformance  BudgetPerformance  `json:"overall_performance"`
}

// BacktestResult represents the complete backtest result
type BacktestResult struct {
	UserID          string                        `json:"user_id"`
	BudgetID        string                        `json:"budget_id"`
	BudgetName      string                        `json:"budget_name"`
	Period          BacktestPeriod                `json:"period"`
	StartDate       time.Time                     `json:"start_date"`
	EndDate         time.Time                     `json:"end_date"`
	PeriodResults   []PeriodBacktestResult        `json:"period_results"`
	Summary         BacktestSummary               `json:"summary"`
	CategoryTrends  map[BudgetCategory]CategoryTrendData `json:"category_trends"`
	Recommendations []BudgetRecommendation        `json:"recommendations"`
	AnalyzedAt      time.Time                     `json:"analyzed_at"`
}

// BudgetRecommendation represents a recommendation based on backtest results
type BudgetRecommendation struct {
	Category    BudgetCategory `json:"category,omitempty"`
	Priority    string         `json:"priority"` // high, medium, low
	Type        string         `json:"type"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Impact      float64        `json:"impact,omitempty"`
	Confidence  float64        `json:"confidence"`
}

// =============================================================================
// What-If Analysis Types
// =============================================================================

// WhatIfParameters represents parameters for a what-if scenario
type WhatIfParameters struct {
	ScenarioType     WhatIfScenario          `json:"scenario_type"`
	Name             string                  `json:"name"`
	Description      string                  `json:"description"`
	IncomeChange     float64                 `json:"income_change,omitempty"`
	ExpenseChange    float64                 `json:"expense_change,omitempty"`
	CategoryChanges  map[BudgetCategory]float64 `json:"category_changes,omitempty"`
	TargetSavings    float64                 `json:"target_savings,omitempty"`
	TimeframeMonths  int                     `json:"timeframe_months,omitempty"`
	OneTimeExpense   float64                 `json:"one_time_expense,omitempty"`
	RecurringChange  float64                 `json:"recurring_change,omitempty"`
}

// WhatIfProjection represents a projected month in the what-if analysis
type WhatIfProjection struct {
	Month             int                          `json:"month"`
	Date              time.Time                    `json:"date"`
	ProjectedIncome   float64                      `json:"projected_income"`
	ProjectedExpenses float64                      `json:"projected_expenses"`
	ProjectedSavings  float64                      `json:"projected_savings"`
	CumulativeSavings float64                      `json:"cumulative_savings"`
	BudgetVariance    float64                      `json:"budget_variance"`
	CategoryBreakdown map[BudgetCategory]float64   `json:"category_breakdown"`
	GoalProgress      float64                      `json:"goal_progress,omitempty"`
}

// WhatIfComparison compares baseline vs scenario
type WhatIfComparison struct {
	BaselineTotal    float64 `json:"baseline_total"`
	ScenarioTotal    float64 `json:"scenario_total"`
	Difference       float64 `json:"difference"`
	DifferencePercent float64 `json:"difference_percent"`
	BaselineSavings  float64 `json:"baseline_savings"`
	ScenarioSavings  float64 `json:"scenario_savings"`
	SavingsDifference float64 `json:"savings_difference"`
}

// WhatIfResult represents the complete what-if analysis result
type WhatIfResult struct {
	UserID          string                       `json:"user_id"`
	Scenario        WhatIfParameters             `json:"scenario"`
	StartDate       time.Time                    `json:"start_date"`
	EndDate         time.Time                    `json:"end_date"`
	Projections     []WhatIfProjection           `json:"projections"`
	Comparison      WhatIfComparison             `json:"comparison"`
	Feasibility     FeasibilityAssessment        `json:"feasibility"`
	Recommendations []WhatIfRecommendation       `json:"recommendations"`
	AnalyzedAt      time.Time                    `json:"analyzed_at"`
}

// FeasibilityAssessment assesses if a scenario is achievable
type FeasibilityAssessment struct {
	IsFeasible      bool    `json:"is_feasible"`
	ConfidenceLevel float64 `json:"confidence_level"`
	RiskLevel       string  `json:"risk_level"` // low, medium, high
	RequiredChange  float64 `json:"required_change,omitempty"`
	TimeToGoal      int     `json:"time_to_goal,omitempty"` // months
	Obstacles       []string `json:"obstacles,omitempty"`
	Opportunities   []string `json:"opportunities,omitempty"`
}

// WhatIfRecommendation provides recommendations for what-if scenarios
type WhatIfRecommendation struct {
	Category    string  `json:"category"`
	Action      string  `json:"action"`
	Impact      float64 `json:"impact"`
	Difficulty  string  `json:"difficulty"` // easy, moderate, hard
	Description string  `json:"description"`
}

// =============================================================================
// Visualization Data Types
// =============================================================================

// ChartDataPoint represents a single point in a chart
type ChartDataPoint struct {
	Label string  `json:"label"`
	Value float64 `json:"value"`
	Date  string  `json:"date,omitempty"`
}

// TimeSeriesData represents time series data for charts
type TimeSeriesData struct {
	Series  string           `json:"series"`
	Data    []ChartDataPoint `json:"data"`
	Color   string           `json:"color,omitempty"`
}

// ComparisonChartData represents data for comparison charts
type ComparisonChartData struct {
	Categories []string  `json:"categories"`
	Budgeted   []float64 `json:"budgeted"`
	Actual     []float64 `json:"actual"`
	Variance   []float64 `json:"variance"`
}

// PieChartData represents data for pie/donut charts
type PieChartData struct {
	Label      string  `json:"label"`
	Value      float64 `json:"value"`
	Percentage float64 `json:"percentage"`
	Color      string  `json:"color,omitempty"`
}

// HeatmapCell represents a cell in a heatmap
type HeatmapCell struct {
	Row    string  `json:"row"`
	Column string  `json:"column"`
	Value  float64 `json:"value"`
	Color  string  `json:"color,omitempty"`
}

// VisualizationData contains all visualization data for backtest results
type VisualizationData struct {
	// Budget vs Actual over time
	BudgetVsActualTimeSeries []TimeSeriesData `json:"budget_vs_actual_time_series"`

	// Category breakdown pie chart
	CategoryBreakdown []PieChartData `json:"category_breakdown"`

	// Variance by category bar chart
	VarianceByCategory ComparisonChartData `json:"variance_by_category"`

	// Monthly performance heatmap
	PerformanceHeatmap []HeatmapCell `json:"performance_heatmap"`

	// Cumulative savings line chart
	CumulativeSavings []ChartDataPoint `json:"cumulative_savings"`

	// Trend lines for each category
	CategoryTrends map[BudgetCategory][]ChartDataPoint `json:"category_trends"`

	// Forecast data (if applicable)
	ForecastData []TimeSeriesData `json:"forecast_data,omitempty"`
}

// =============================================================================
// Repository Interface
// =============================================================================

// BudgetRepository defines the interface for budget data access
type BudgetRepository interface {
	GetBudgetByID(ctx context.Context, budgetID string) (*Budget, error)
	GetBudgetsByUserID(ctx context.Context, userID string) ([]Budget, error)
	GetTransactionsByBudget(ctx context.Context, userID string, startDate, endDate time.Time) ([]Transaction, error)
}

// =============================================================================
// Service Configuration
// =============================================================================

// BacktestConfig holds configuration for backtesting
type BacktestConfig struct {
	// Performance thresholds
	ExcellentThreshold float64 // Under budget by more than this percentage
	GoodThreshold      float64 // Under budget by less than this percentage
	CautionThreshold   float64 // Over budget by less than this percentage

	// Analysis settings
	MinPeriodsForTrend    int     // Minimum periods needed for trend analysis
	SeasonalityLookback   int     // Number of periods to check for seasonality
	VolatilityWindow      int     // Rolling window for volatility calculation

	// Forecasting settings
	ForecastPeriods       int     // Number of periods to forecast
	ForecastConfidence    float64 // Confidence level for forecasts

	// What-if settings
	DefaultProjectionMonths int    // Default number of months for what-if projections
	MaxProjectionMonths     int    // Maximum number of months for projections
}

// DefaultBacktestConfig returns a config with reasonable defaults
func DefaultBacktestConfig() BacktestConfig {
	return BacktestConfig{
		ExcellentThreshold:     10.0,
		GoodThreshold:          5.0,
		CautionThreshold:       10.0,
		MinPeriodsForTrend:     3,
		SeasonalityLookback:    12,
		VolatilityWindow:       6,
		ForecastPeriods:        6,
		ForecastConfidence:     0.8,
		DefaultProjectionMonths: 12,
		MaxProjectionMonths:    60,
	}
}

// =============================================================================
// Backtest Service
// =============================================================================

// BacktestService provides budget backtesting and what-if analysis
type BacktestService struct {
	config BacktestConfig
	repo   BudgetRepository
}

// NewBacktestService creates a new backtest service
func NewBacktestService(repo BudgetRepository, config BacktestConfig) *BacktestService {
	return &BacktestService{
		config: config,
		repo:   repo,
	}
}

// NewBacktestServiceWithDefaults creates a new backtest service with default config
func NewBacktestServiceWithDefaults(repo BudgetRepository) *BacktestService {
	return NewBacktestService(repo, DefaultBacktestConfig())
}

// =============================================================================
// Historical Simulation Methods
// =============================================================================

// RunHistoricalBacktest runs a backtest of a budget against historical transactions
func (s *BacktestService) RunHistoricalBacktest(
	ctx context.Context,
	userID string,
	budget Budget,
	startDate, endDate time.Time,
) (*BacktestResult, error) {
	if userID == "" {
		return nil, errors.New("userID is required")
	}
	if endDate.Before(startDate) {
		return nil, errors.New("endDate must be after startDate")
	}

	// Get historical transactions
	transactions, err := s.repo.GetTransactionsByBudget(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get transactions: %w", err)
	}

	// Group transactions by period
	periodResults := s.simulateHistoricalPeriods(transactions, budget, startDate, endDate)

	// Calculate summary statistics
	summary := s.calculateBacktestSummary(periodResults, budget)

	// Analyze category trends
	categoryTrends := s.analyzeCategoryTrends(periodResults, budget)

	// Generate recommendations
	recommendations := s.generateBacktestRecommendations(periodResults, summary, categoryTrends)

	return &BacktestResult{
		UserID:          userID,
		BudgetID:        budget.ID,
		BudgetName:      budget.Name,
		Period:          budget.Period,
		StartDate:       startDate,
		EndDate:         endDate,
		PeriodResults:   periodResults,
		Summary:         summary,
		CategoryTrends:  categoryTrends,
		Recommendations: recommendations,
		AnalyzedAt:      time.Now(),
	}, nil
}

// simulateHistoricalPeriods simulates budget against historical data
func (s *BacktestService) simulateHistoricalPeriods(
	transactions []Transaction,
	budget Budget,
	startDate, endDate time.Time,
) []PeriodBacktestResult {
	var results []PeriodBacktestResult

	// Group transactions by period
	periodMap := make(map[time.Time][]Transaction)
	for _, t := range transactions {
		periodStart := s.getPeriodStart(t.TransactionDate, budget.Period)
		periodMap[periodStart] = append(periodMap[periodStart], t)
	}

	// Generate all periods in range
	current := s.getPeriodStart(startDate, budget.Period)
	for !current.After(endDate) {
		periodEnd := s.getPeriodEnd(current, budget.Period)
		periodTransactions := periodMap[current]

		result := s.calculatePeriodResult(periodTransactions, budget, current, periodEnd)
		results = append(results, result)

		current = s.nextPeriod(current, budget.Period)
	}

	return results
}

// calculatePeriodResult calculates results for a single period
func (s *BacktestService) calculatePeriodResult(
	transactions []Transaction,
	budget Budget,
	periodStart, periodEnd time.Time,
) PeriodBacktestResult {
	categoryActuals := make(map[BudgetCategory]float64)
	totalActual := 0.0
	largestExpense := 0.0
	transactionCount := len(transactions)

	for _, t := range transactions {
		cat := s.mapSpendingToBudgetCategory(t.Category)
		categoryActuals[cat] += t.Amount
		totalActual += t.Amount
		if t.Amount > largestExpense {
			largestExpense = t.Amount
		}
	}

	variance := budget.TotalBudget - totalActual
	variancePercent := 0.0
	if budget.TotalBudget > 0 {
		variancePercent = (variance / budget.TotalBudget) * 100
	}

	performance := s.determinePerformance(variancePercent)

	// Calculate category results
	var categoryResults []BudgetCategoryAllocation
	for cat, budgetAmt := range budget.CategoryBudgets {
		actual := categoryActuals[cat]
		catVariance := budgetAmt - actual
		catPct := 0.0
		if totalActual > 0 {
			catPct = (actual / totalActual) * 100
		}
		catVariancePct := 0.0
		if budgetAmt > 0 {
			catVariancePct = (catVariance / budgetAmt) * 100
		}

		categoryResults = append(categoryResults, BudgetCategoryAllocation{
			Category:     cat,
			BudgetAmount: budgetAmt,
			ActualAmount: actual,
			Variance:     catVariance,
			Percentage:   catPct,
			Performance:  s.determinePerformance(catVariancePct),
		})
	}

	// Calculate average daily spending
	days := periodEnd.Sub(periodStart).Hours() / 24
	averageDaily := 0.0
	if days > 0 {
		averageDaily = totalActual / days
	}

	return PeriodBacktestResult{
		PeriodStart:      periodStart,
		PeriodEnd:        periodEnd,
		BudgetedAmount:   budget.TotalBudget,
		ActualAmount:     totalActual,
		Variance:         variance,
		VariancePercent:  variancePercent,
		Performance:      performance,
		CategoryResults:  categoryResults,
		TransactionCount: transactionCount,
		LargestExpense:   largestExpense,
		AverageDaily:     averageDaily,
	}
}

// calculateBacktestSummary calculates summary statistics
func (s *BacktestService) calculateBacktestSummary(
	periodResults []PeriodBacktestResult,
	budget Budget,
) BacktestSummary {
	if len(periodResults) == 0 {
		return BacktestSummary{}
	}

	var (
		totalBudgeted      float64
		totalActual        float64
		underBudget        int
		overBudget         int
		onTrack            int
		variances          []float64
		bestVariance       = math.Inf(-1)
		worstVariance      = math.Inf(1)
		bestMonth          string
		worstMonth         string
	)

	for _, pr := range periodResults {
		totalBudgeted += pr.BudgetedAmount
		totalActual += pr.ActualAmount
		variances = append(variances, pr.VariancePercent)

		switch pr.Performance {
		case PerformanceExcellent, PerformanceGood:
			underBudget++
		case PerformancePoor:
			overBudget++
		default:
			onTrack++
		}

		if pr.VariancePercent > bestVariance {
			bestVariance = pr.VariancePercent
			bestMonth = pr.PeriodStart.Format("Jan 2006")
		}
		if pr.VariancePercent < worstVariance {
			worstVariance = pr.VariancePercent
			worstMonth = pr.PeriodStart.Format("Jan 2006")
		}
	}

	avgVariance := mean(variances)
	consistency := s.calculateConsistencyScore(variances)
	totalSavings := totalBudgeted - totalActual

	overallPerformance := PerformanceOnTrack
	overallVariancePct := 0.0
	if totalBudgeted > 0 {
		overallVariancePct = ((totalBudgeted - totalActual) / totalBudgeted) * 100
		overallPerformance = s.determinePerformance(overallVariancePct)
	}

	return BacktestSummary{
		TotalPeriods:         len(periodResults),
		PeriodsUnderBudget:   underBudget,
		PeriodsOverBudget:    overBudget,
		PeriodsOnTrack:       onTrack,
		AverageVariance:      avgVariance,
		TotalBudgeted:        totalBudgeted,
		TotalActual:          totalActual,
		TotalSavings:         totalSavings,
		ConsistencyScore:     consistency,
		BestPerformingMonth:  bestMonth,
		WorstPerformingMonth: worstMonth,
		OverallPerformance:   overallPerformance,
	}
}

// analyzeCategoryTrends analyzes spending trends by category
func (s *BacktestService) analyzeCategoryTrends(
	periodResults []PeriodBacktestResult,
	budget Budget,
) map[BudgetCategory]CategoryTrendData {
	trends := make(map[BudgetCategory]CategoryTrendData)

	// Collect spending data by category across periods
	categoryData := make(map[BudgetCategory][]float64)
	periodLabels := make([]string, 0, len(periodResults))

	for _, pr := range periodResults {
		periodLabels = append(periodLabels, pr.PeriodStart.Format("Jan 2006"))
		for _, cr := range pr.CategoryResults {
			categoryData[cr.Category] = append(categoryData[cr.Category], cr.ActualAmount)
		}
	}

	// Analyze each category
	for cat, data := range categoryData {
		if len(data) < s.config.MinPeriodsForTrend {
			continue
		}

		avgAmount := mean(data)
		slope, _, _ := linearRegression(data)
		volatility := stdDev(data, avgAmount)

		direction := TrendStable
		if slope > avgAmount*0.05 {
			direction = TrendIncreasing
		} else if slope < -avgAmount*0.05 {
			direction = TrendDecreasing
		}

		// Calculate seasonality if we have enough data
		var seasonality []float64
		if len(data) >= s.config.SeasonalityLookback {
			seasonality = s.calculateSeasonality(data)
		}

		trends[cat] = CategoryTrendData{
			Category:       cat,
			Periods:        data,
			PeriodLabels:   periodLabels,
			AverageAmount:  avgAmount,
			TrendDirection: direction,
			TrendSlope:     slope,
			Volatility:     volatility,
			Seasonality:    seasonality,
		}
	}

	return trends
}

// calculateSeasonality calculates seasonal patterns
func (s *BacktestService) calculateSeasonality(data []float64) []float64 {
	if len(data) < 12 {
		return nil
	}

	avgAmount := mean(data)
	if avgAmount == 0 {
		return nil
	}

	// Calculate monthly indices (assuming monthly data)
	seasonality := make([]float64, 12)
	counts := make([]int, 12)

	for i, val := range data {
		month := i % 12
		seasonality[month] += val
		counts[month]++
	}

	// Normalize
	for i := range seasonality {
		if counts[i] > 0 {
			seasonality[i] = (seasonality[i] / float64(counts[i])) / avgAmount
		}
	}

	return seasonality
}

// generateBacktestRecommendations generates recommendations based on backtest
func (s *BacktestService) generateBacktestRecommendations(
	periodResults []PeriodBacktestResult,
	summary BacktestSummary,
	categoryTrends map[BudgetCategory]CategoryTrendData,
) []BudgetRecommendation {
	var recommendations []BudgetRecommendation

	// Check overall performance
	if summary.OverallPerformance == PerformancePoor {
		recommendations = append(recommendations, BudgetRecommendation{
			Priority:    "high",
			Type:        "budget_adjustment",
			Title:       "Budget Needs Adjustment",
			Description: "You're consistently spending more than budgeted. Consider reviewing your budget allocations or finding areas to cut back.",
			Impact:      summary.TotalActual - summary.TotalBudgeted,
			Confidence:  0.9,
		})
	}

	// Check for categories with increasing trends
	for cat, trend := range categoryTrends {
		if trend.TrendDirection == TrendIncreasing && trend.TrendSlope > trend.AverageAmount*0.1 {
			recommendations = append(recommendations, BudgetRecommendation{
				Category:    cat,
				Priority:    "medium",
				Type:        "trend_alert",
				Title:       fmt.Sprintf("Rising %s Spending", cat),
				Description: fmt.Sprintf("Your %s spending has been increasing by approximately %.1f%% per period.", cat, (trend.TrendSlope/trend.AverageAmount)*100),
				Impact:      trend.TrendSlope * 6, // Projected 6-period impact
				Confidence:  0.7,
			})
		}

		// Check for high volatility
		if trend.Volatility > trend.AverageAmount*0.3 {
			recommendations = append(recommendations, BudgetRecommendation{
				Category:    cat,
				Priority:    "low",
				Type:        "volatility_alert",
				Title:       fmt.Sprintf("Variable %s Spending", cat),
				Description: fmt.Sprintf("Your %s spending varies significantly. Consider setting aside a buffer for this category.", cat),
				Confidence:  0.6,
			})
		}
	}

	// Check consistency
	if summary.ConsistencyScore < 50 {
		recommendations = append(recommendations, BudgetRecommendation{
			Priority:    "medium",
			Type:        "consistency",
			Title:       "Improve Spending Consistency",
			Description: "Your spending varies significantly from month to month. More consistent spending can help with financial planning.",
			Confidence:  0.8,
		})
	}

	// Sort by priority
	sort.Slice(recommendations, func(i, j int) bool {
		priorityOrder := map[string]int{"high": 0, "medium": 1, "low": 2}
		return priorityOrder[recommendations[i].Priority] < priorityOrder[recommendations[j].Priority]
	})

	return recommendations
}

// =============================================================================
// What-If Analysis Methods
// =============================================================================

// RunWhatIfAnalysis performs a what-if scenario analysis
func (s *BacktestService) RunWhatIfAnalysis(
	ctx context.Context,
	userID string,
	budget Budget,
	params WhatIfParameters,
) (*WhatIfResult, error) {
	if userID == "" {
		return nil, errors.New("userID is required")
	}

	// Get baseline data
	endDate := time.Now()
	startDate := endDate.AddDate(0, -6, 0) // Last 6 months for baseline

	transactions, err := s.repo.GetTransactionsByBudget(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get baseline transactions: %w", err)
	}

	// Calculate baseline averages
	baseline := s.calculateBaselineMetrics(transactions, budget)

	// Determine projection months
	projectionMonths := params.TimeframeMonths
	if projectionMonths <= 0 {
		projectionMonths = s.config.DefaultProjectionMonths
	}
	if projectionMonths > s.config.MaxProjectionMonths {
		projectionMonths = s.config.MaxProjectionMonths
	}

	// Generate projections
	projections := s.generateWhatIfProjections(baseline, budget, params, projectionMonths)

	// Calculate comparison
	comparison := s.calculateWhatIfComparison(baseline, projections, params)

	// Assess feasibility
	feasibility := s.assessFeasibility(baseline, params, projections)

	// Generate recommendations
	recommendations := s.generateWhatIfRecommendations(baseline, params, feasibility)

	return &WhatIfResult{
		UserID:          userID,
		Scenario:        params,
		StartDate:       time.Now(),
		EndDate:         time.Now().AddDate(0, projectionMonths, 0),
		Projections:     projections,
		Comparison:      comparison,
		Feasibility:     feasibility,
		Recommendations: recommendations,
		AnalyzedAt:      time.Now(),
	}, nil
}

// baselineMetrics holds calculated baseline metrics
type baselineMetrics struct {
	AverageIncome           float64
	AverageExpenses         float64
	AverageSavings          float64
	CategoryAverages        map[BudgetCategory]float64
	ExpenseVolatility       float64
	IncomeStability         float64
}

// calculateBaselineMetrics calculates baseline metrics from transactions
func (s *BacktestService) calculateBaselineMetrics(
	transactions []Transaction,
	budget Budget,
) baselineMetrics {
	categoryTotals := make(map[BudgetCategory]float64)
	totalExpenses := 0.0

	for _, t := range transactions {
		cat := s.mapSpendingToBudgetCategory(t.Category)
		categoryTotals[cat] += t.Amount
		totalExpenses += t.Amount
	}

	// Calculate monthly averages (assuming 6-month baseline)
	months := 6.0
	categoryAverages := make(map[BudgetCategory]float64)
	for cat, total := range categoryTotals {
		categoryAverages[cat] = total / months
	}

	return baselineMetrics{
		AverageIncome:    budget.Income,
		AverageExpenses:  totalExpenses / months,
		AverageSavings:   budget.Income - (totalExpenses / months),
		CategoryAverages: categoryAverages,
		ExpenseVolatility: 0.1, // Placeholder - would calculate from monthly data
		IncomeStability:   0.95,
	}
}

// generateWhatIfProjections generates projections for what-if scenario
func (s *BacktestService) generateWhatIfProjections(
	baseline baselineMetrics,
	budget Budget,
	params WhatIfParameters,
	months int,
) []WhatIfProjection {
	projections := make([]WhatIfProjection, months)
	cumulativeSavings := 0.0

	for i := 0; i < months; i++ {
		date := time.Now().AddDate(0, i+1, 0)

		// Calculate projected income
		projectedIncome := baseline.AverageIncome
		if params.IncomeChange != 0 {
			projectedIncome *= (1 + params.IncomeChange)
		}

		// Calculate projected expenses by category
		categoryBreakdown := make(map[BudgetCategory]float64)
		projectedExpenses := 0.0

		for cat, avgAmt := range baseline.CategoryAverages {
			amount := avgAmt

			// Apply overall expense change
			if params.ExpenseChange != 0 {
				amount *= (1 + params.ExpenseChange)
			}

			// Apply category-specific changes
			if catChange, ok := params.CategoryChanges[cat]; ok {
				amount *= (1 + catChange)
			}

			categoryBreakdown[cat] = amount
			projectedExpenses += amount
		}

		// Add one-time expense if in first month
		if i == 0 && params.OneTimeExpense > 0 {
			projectedExpenses += params.OneTimeExpense
		}

		// Add recurring changes
		projectedExpenses += params.RecurringChange

		// Calculate savings
		projectedSavings := projectedIncome - projectedExpenses
		cumulativeSavings += projectedSavings

		// Calculate goal progress if applicable
		goalProgress := 0.0
		if params.TargetSavings > 0 {
			goalProgress = (cumulativeSavings / params.TargetSavings) * 100
			if goalProgress > 100 {
				goalProgress = 100
			}
		}

		projections[i] = WhatIfProjection{
			Month:             i + 1,
			Date:              date,
			ProjectedIncome:   projectedIncome,
			ProjectedExpenses: projectedExpenses,
			ProjectedSavings:  projectedSavings,
			CumulativeSavings: cumulativeSavings,
			BudgetVariance:    budget.TotalBudget - projectedExpenses,
			CategoryBreakdown: categoryBreakdown,
			GoalProgress:      goalProgress,
		}
	}

	return projections
}

// calculateWhatIfComparison compares baseline vs scenario
func (s *BacktestService) calculateWhatIfComparison(
	baseline baselineMetrics,
	projections []WhatIfProjection,
	params WhatIfParameters,
) WhatIfComparison {
	months := float64(len(projections))

	baselineTotal := baseline.AverageExpenses * months
	baselineSavings := baseline.AverageSavings * months

	scenarioTotal := 0.0
	scenarioSavings := 0.0
	for _, p := range projections {
		scenarioTotal += p.ProjectedExpenses
		scenarioSavings += p.ProjectedSavings
	}

	difference := scenarioTotal - baselineTotal
	diffPercent := 0.0
	if baselineTotal > 0 {
		diffPercent = (difference / baselineTotal) * 100
	}

	return WhatIfComparison{
		BaselineTotal:     baselineTotal,
		ScenarioTotal:     scenarioTotal,
		Difference:        difference,
		DifferencePercent: diffPercent,
		BaselineSavings:   baselineSavings,
		ScenarioSavings:   scenarioSavings,
		SavingsDifference: scenarioSavings - baselineSavings,
	}
}

// assessFeasibility assesses if a scenario is achievable
func (s *BacktestService) assessFeasibility(
	baseline baselineMetrics,
	params WhatIfParameters,
	projections []WhatIfProjection,
) FeasibilityAssessment {
	assessment := FeasibilityAssessment{
		IsFeasible:      true,
		ConfidenceLevel: 0.8,
		RiskLevel:       "low",
	}

	// Check if any month has negative savings
	negativeMonths := 0
	for _, p := range projections {
		if p.ProjectedSavings < 0 {
			negativeMonths++
		}
	}

	if negativeMonths > 0 {
		assessment.RiskLevel = "medium"
		assessment.ConfidenceLevel = 0.6
		assessment.Obstacles = append(assessment.Obstacles,
			fmt.Sprintf("%d months projected with negative cash flow", negativeMonths))
	}

	if negativeMonths > len(projections)/2 {
		assessment.IsFeasible = false
		assessment.RiskLevel = "high"
		assessment.ConfidenceLevel = 0.3
	}

	// Check if target savings can be met
	if params.TargetSavings > 0 {
		finalProgress := 0.0
		if len(projections) > 0 {
			finalProgress = projections[len(projections)-1].GoalProgress
		}

		if finalProgress < 100 {
			// Calculate time to goal
			if len(projections) > 0 && projections[len(projections)-1].CumulativeSavings > 0 {
				monthlyRate := projections[len(projections)-1].CumulativeSavings / float64(len(projections))
				if monthlyRate > 0 {
					assessment.TimeToGoal = int(math.Ceil(params.TargetSavings / monthlyRate))
				}
			}

			if finalProgress < 50 {
				assessment.RiskLevel = "high"
				assessment.Obstacles = append(assessment.Obstacles,
					fmt.Sprintf("Only %.1f%% of savings goal achievable in timeframe", finalProgress))
			}
		}
	}

	// Check for opportunities
	if params.ExpenseChange < 0 {
		potentialSavings := baseline.AverageExpenses * math.Abs(params.ExpenseChange) * float64(len(projections))
		assessment.Opportunities = append(assessment.Opportunities,
			fmt.Sprintf("Potential savings of $%.2f over the projection period", potentialSavings))
	}

	return assessment
}

// generateWhatIfRecommendations generates recommendations for what-if scenarios
func (s *BacktestService) generateWhatIfRecommendations(
	baseline baselineMetrics,
	params WhatIfParameters,
	feasibility FeasibilityAssessment,
) []WhatIfRecommendation {
	var recommendations []WhatIfRecommendation

	switch params.ScenarioType {
	case ScenarioIncomeDecrease:
		recommendations = append(recommendations, WhatIfRecommendation{
			Category:    "expense",
			Action:      "Review discretionary spending",
			Impact:      baseline.CategoryAverages[BudgetCategoryEntertainment] * 0.3,
			Difficulty:  "moderate",
			Description: "Reducing entertainment expenses by 30% can help offset income changes.",
		})

	case ScenarioSavingsGoal:
		if !feasibility.IsFeasible {
			recommendations = append(recommendations, WhatIfRecommendation{
				Category:    "timeline",
				Action:      "Extend timeline",
				Impact:      params.TargetSavings / float64(feasibility.TimeToGoal),
				Difficulty:  "easy",
				Description: fmt.Sprintf("Consider extending your timeline to %d months to reach your goal.", feasibility.TimeToGoal),
			})
		}

	case ScenarioExpenseIncrease:
		// Find largest category to suggest cuts
		var largestCat BudgetCategory
		largestAmt := 0.0
		for cat, amt := range baseline.CategoryAverages {
			if amt > largestAmt {
				largestAmt = amt
				largestCat = cat
			}
		}
		recommendations = append(recommendations, WhatIfRecommendation{
			Category:    string(largestCat),
			Action:      "Offset with largest category reduction",
			Impact:      largestAmt * 0.1,
			Difficulty:  "moderate",
			Description: fmt.Sprintf("A 10%% reduction in %s could offset increased expenses.", largestCat),
		})
	}

	// General recommendation based on risk level
	if feasibility.RiskLevel == "high" {
		recommendations = append(recommendations, WhatIfRecommendation{
			Category:    "emergency",
			Action:      "Build emergency fund",
			Impact:      baseline.AverageExpenses * 3,
			Difficulty:  "hard",
			Description: "High-risk scenarios should be backed by a 3-month emergency fund.",
		})
	}

	return recommendations
}

// =============================================================================
// Visualization Data Methods
// =============================================================================

// GenerateVisualizationData creates visualization data for backtest results
func (s *BacktestService) GenerateVisualizationData(result *BacktestResult) *VisualizationData {
	if result == nil || len(result.PeriodResults) == 0 {
		return &VisualizationData{}
	}

	viz := &VisualizationData{
		CategoryTrends: make(map[BudgetCategory][]ChartDataPoint),
	}

	// Budget vs Actual time series
	viz.BudgetVsActualTimeSeries = s.generateBudgetVsActualSeries(result.PeriodResults)

	// Category breakdown pie chart (latest period)
	viz.CategoryBreakdown = s.generateCategoryBreakdown(result.PeriodResults)

	// Variance by category comparison
	viz.VarianceByCategory = s.generateVarianceComparison(result.PeriodResults)

	// Performance heatmap
	viz.PerformanceHeatmap = s.generatePerformanceHeatmap(result.PeriodResults)

	// Cumulative savings
	viz.CumulativeSavings = s.generateCumulativeSavings(result.PeriodResults)

	// Category trends
	for cat, trend := range result.CategoryTrends {
		viz.CategoryTrends[cat] = s.generateCategoryTrendPoints(trend)
	}

	return viz
}

// generateBudgetVsActualSeries generates time series for budget vs actual
func (s *BacktestService) generateBudgetVsActualSeries(periods []PeriodBacktestResult) []TimeSeriesData {
	budgetSeries := TimeSeriesData{
		Series: "Budget",
		Color:  "#2196F3",
	}
	actualSeries := TimeSeriesData{
		Series: "Actual",
		Color:  "#4CAF50",
	}

	for _, p := range periods {
		label := p.PeriodStart.Format("Jan 2006")
		budgetSeries.Data = append(budgetSeries.Data, ChartDataPoint{
			Label: label,
			Value: p.BudgetedAmount,
			Date:  p.PeriodStart.Format("2006-01-02"),
		})
		actualSeries.Data = append(actualSeries.Data, ChartDataPoint{
			Label: label,
			Value: p.ActualAmount,
			Date:  p.PeriodStart.Format("2006-01-02"),
		})
	}

	return []TimeSeriesData{budgetSeries, actualSeries}
}

// generateCategoryBreakdown generates pie chart data for categories
func (s *BacktestService) generateCategoryBreakdown(periods []PeriodBacktestResult) []PieChartData {
	if len(periods) == 0 {
		return nil
	}

	// Use the latest period
	latestPeriod := periods[len(periods)-1]
	totalActual := latestPeriod.ActualAmount

	colors := map[BudgetCategory]string{
		BudgetCategoryHousing:        "#FF6384",
		BudgetCategoryFood:           "#36A2EB",
		BudgetCategoryTransportation: "#FFCE56",
		BudgetCategoryUtilities:      "#4BC0C0",
		BudgetCategoryHealthcare:     "#9966FF",
		BudgetCategoryEntertainment:  "#FF9F40",
		BudgetCategoryDebt:           "#FF6384",
		BudgetCategorySavings:        "#4BC0C0",
		BudgetCategoryPersonal:       "#C9CBCF",
		BudgetCategoryOther:          "#7C8798",
	}

	var pieData []PieChartData
	for _, cr := range latestPeriod.CategoryResults {
		if cr.ActualAmount > 0 {
			pct := 0.0
			if totalActual > 0 {
				pct = (cr.ActualAmount / totalActual) * 100
			}
			pieData = append(pieData, PieChartData{
				Label:      string(cr.Category),
				Value:      cr.ActualAmount,
				Percentage: pct,
				Color:      colors[cr.Category],
			})
		}
	}

	// Sort by value descending
	sort.Slice(pieData, func(i, j int) bool {
		return pieData[i].Value > pieData[j].Value
	})

	return pieData
}

// generateVarianceComparison generates comparison chart data
func (s *BacktestService) generateVarianceComparison(periods []PeriodBacktestResult) ComparisonChartData {
	// Aggregate across all periods by category
	categoryBudgets := make(map[BudgetCategory]float64)
	categoryActuals := make(map[BudgetCategory]float64)

	for _, p := range periods {
		for _, cr := range p.CategoryResults {
			categoryBudgets[cr.Category] += cr.BudgetAmount
			categoryActuals[cr.Category] += cr.ActualAmount
		}
	}

	var categories []string
	var budgeted, actual, variance []float64

	// Sort categories by budget amount
	type catData struct {
		cat    BudgetCategory
		budget float64
	}
	var catList []catData
	for cat, budget := range categoryBudgets {
		catList = append(catList, catData{cat, budget})
	}
	sort.Slice(catList, func(i, j int) bool {
		return catList[i].budget > catList[j].budget
	})

	for _, cd := range catList {
		categories = append(categories, string(cd.cat))
		budgeted = append(budgeted, cd.budget)
		actual = append(actual, categoryActuals[cd.cat])
		variance = append(variance, cd.budget-categoryActuals[cd.cat])
	}

	return ComparisonChartData{
		Categories: categories,
		Budgeted:   budgeted,
		Actual:     actual,
		Variance:   variance,
	}
}

// generatePerformanceHeatmap generates heatmap data for performance
func (s *BacktestService) generatePerformanceHeatmap(periods []PeriodBacktestResult) []HeatmapCell {
	var cells []HeatmapCell

	performanceColors := map[BudgetPerformance]string{
		PerformanceExcellent: "#1B5E20",
		PerformanceGood:      "#4CAF50",
		PerformanceOnTrack:   "#FFC107",
		PerformanceCaution:   "#FF9800",
		PerformancePoor:      "#F44336",
	}

	// Create heatmap with categories as rows and periods as columns
	for _, p := range periods {
		column := p.PeriodStart.Format("Jan")
		for _, cr := range p.CategoryResults {
			cells = append(cells, HeatmapCell{
				Row:    string(cr.Category),
				Column: column,
				Value:  cr.Variance,
				Color:  performanceColors[cr.Performance],
			})
		}
	}

	return cells
}

// generateCumulativeSavings generates cumulative savings chart data
func (s *BacktestService) generateCumulativeSavings(periods []PeriodBacktestResult) []ChartDataPoint {
	var points []ChartDataPoint
	cumulative := 0.0

	for _, p := range periods {
		savings := p.Variance // Positive variance means savings
		cumulative += savings
		points = append(points, ChartDataPoint{
			Label: p.PeriodStart.Format("Jan 2006"),
			Value: cumulative,
			Date:  p.PeriodStart.Format("2006-01-02"),
		})
	}

	return points
}

// generateCategoryTrendPoints generates trend chart points for a category
func (s *BacktestService) generateCategoryTrendPoints(trend CategoryTrendData) []ChartDataPoint {
	var points []ChartDataPoint

	for i, val := range trend.Periods {
		label := ""
		if i < len(trend.PeriodLabels) {
			label = trend.PeriodLabels[i]
		}
		points = append(points, ChartDataPoint{
			Label: label,
			Value: val,
		})
	}

	return points
}

// GenerateWhatIfVisualization creates visualization data for what-if results
func (s *BacktestService) GenerateWhatIfVisualization(result *WhatIfResult) *VisualizationData {
	if result == nil || len(result.Projections) == 0 {
		return &VisualizationData{}
	}

	viz := &VisualizationData{
		CategoryTrends: make(map[BudgetCategory][]ChartDataPoint),
	}

	// Generate projection time series
	incomeSeries := TimeSeriesData{
		Series: "Income",
		Color:  "#4CAF50",
	}
	expenseSeries := TimeSeriesData{
		Series: "Expenses",
		Color:  "#F44336",
	}
	savingsSeries := TimeSeriesData{
		Series: "Savings",
		Color:  "#2196F3",
	}

	for _, p := range result.Projections {
		label := p.Date.Format("Jan 2006")
		incomeSeries.Data = append(incomeSeries.Data, ChartDataPoint{
			Label: label,
			Value: p.ProjectedIncome,
			Date:  p.Date.Format("2006-01-02"),
		})
		expenseSeries.Data = append(expenseSeries.Data, ChartDataPoint{
			Label: label,
			Value: p.ProjectedExpenses,
			Date:  p.Date.Format("2006-01-02"),
		})
		savingsSeries.Data = append(savingsSeries.Data, ChartDataPoint{
			Label: label,
			Value: p.ProjectedSavings,
			Date:  p.Date.Format("2006-01-02"),
		})
	}

	viz.BudgetVsActualTimeSeries = []TimeSeriesData{incomeSeries, expenseSeries, savingsSeries}

	// Cumulative savings
	for _, p := range result.Projections {
		viz.CumulativeSavings = append(viz.CumulativeSavings, ChartDataPoint{
			Label: p.Date.Format("Jan 2006"),
			Value: p.CumulativeSavings,
			Date:  p.Date.Format("2006-01-02"),
		})
	}

	// Category breakdown from first projection
	if len(result.Projections) > 0 {
		firstProj := result.Projections[0]
		totalExpenses := firstProj.ProjectedExpenses
		for cat, amt := range firstProj.CategoryBreakdown {
			pct := 0.0
			if totalExpenses > 0 {
				pct = (amt / totalExpenses) * 100
			}
			viz.CategoryBreakdown = append(viz.CategoryBreakdown, PieChartData{
				Label:      string(cat),
				Value:      amt,
				Percentage: pct,
			})
		}
	}

	return viz
}

// =============================================================================
// Helper Methods
// =============================================================================

// determinePerformance determines performance level based on variance percentage
func (s *BacktestService) determinePerformance(variancePercent float64) BudgetPerformance {
	if variancePercent >= s.config.ExcellentThreshold {
		return PerformanceExcellent
	}
	if variancePercent >= s.config.GoodThreshold {
		return PerformanceGood
	}
	if variancePercent >= -s.config.GoodThreshold {
		return PerformanceOnTrack
	}
	if variancePercent >= -s.config.CautionThreshold {
		return PerformanceCaution
	}
	return PerformancePoor
}

// calculateConsistencyScore calculates how consistent spending was
func (s *BacktestService) calculateConsistencyScore(variances []float64) float64 {
	if len(variances) < 2 {
		return 100.0
	}

	// Calculate coefficient of variation
	avg := mean(variances)
	sd := stdDev(variances, avg)

	if avg == 0 {
		return 100.0
	}

	cv := math.Abs(sd / avg)

	// Convert to a 0-100 score where lower CV = higher score
	score := 100 * (1 - math.Min(cv, 1))
	return math.Max(0, score)
}

// mapSpendingToBudgetCategory maps spending categories to budget categories
func (s *BacktestService) mapSpendingToBudgetCategory(spendingCat SpendingCategory) BudgetCategory {
	mapping := map[SpendingCategory]BudgetCategory{
		CategoryGroceries:      BudgetCategoryFood,
		CategoryDining:         BudgetCategoryFood,
		CategoryTransportation: BudgetCategoryTransportation,
		CategoryUtilities:      BudgetCategoryUtilities,
		CategoryEntertainment:  BudgetCategoryEntertainment,
		CategoryShopping:       BudgetCategoryPersonal,
		CategoryHealthcare:     BudgetCategoryHealthcare,
		CategoryTravel:         BudgetCategoryEntertainment,
		CategoryEducation:      BudgetCategoryPersonal,
		CategorySubscriptions:  BudgetCategoryEntertainment,
		CategoryHousing:        BudgetCategoryHousing,
		CategoryInsurance:      BudgetCategoryHealthcare,
		CategoryPersonalCare:   BudgetCategoryPersonal,
		CategoryGifts:          BudgetCategoryPersonal,
		CategoryOther:          BudgetCategoryOther,
	}

	if budgetCat, ok := mapping[spendingCat]; ok {
		return budgetCat
	}
	return BudgetCategoryOther
}

// getPeriodStart returns the start of the period containing the given time
func (s *BacktestService) getPeriodStart(t time.Time, period BacktestPeriod) time.Time {
	switch period {
	case BacktestPeriodWeekly:
		weekday := int(t.Weekday())
		return time.Date(t.Year(), t.Month(), t.Day()-weekday, 0, 0, 0, 0, t.Location())
	case BacktestPeriodMonthly:
		return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
	case BacktestPeriodQuarterly:
		quarter := (int(t.Month()) - 1) / 3
		return time.Date(t.Year(), time.Month(quarter*3+1), 1, 0, 0, 0, 0, t.Location())
	case BacktestPeriodYearly:
		return time.Date(t.Year(), 1, 1, 0, 0, 0, 0, t.Location())
	default:
		return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
	}
}

// getPeriodEnd returns the end of the period
func (s *BacktestService) getPeriodEnd(start time.Time, period BacktestPeriod) time.Time {
	switch period {
	case BacktestPeriodWeekly:
		return start.AddDate(0, 0, 7).Add(-time.Nanosecond)
	case BacktestPeriodMonthly:
		return start.AddDate(0, 1, 0).Add(-time.Nanosecond)
	case BacktestPeriodQuarterly:
		return start.AddDate(0, 3, 0).Add(-time.Nanosecond)
	case BacktestPeriodYearly:
		return start.AddDate(1, 0, 0).Add(-time.Nanosecond)
	default:
		return start.AddDate(0, 1, 0).Add(-time.Nanosecond)
	}
}

// nextPeriod returns the start of the next period
func (s *BacktestService) nextPeriod(current time.Time, period BacktestPeriod) time.Time {
	switch period {
	case BacktestPeriodWeekly:
		return current.AddDate(0, 0, 7)
	case BacktestPeriodMonthly:
		return current.AddDate(0, 1, 0)
	case BacktestPeriodQuarterly:
		return current.AddDate(0, 3, 0)
	case BacktestPeriodYearly:
		return current.AddDate(1, 0, 0)
	default:
		return current.AddDate(0, 1, 0)
	}
}

// UpdateConfig updates the service configuration
func (s *BacktestService) UpdateConfig(config BacktestConfig) {
	s.config = config
}

// GetConfig returns the current configuration
func (s *BacktestService) GetConfig() BacktestConfig {
	return s.config
}
