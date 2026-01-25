package analysis

import (
	"context"
	"errors"
	"fmt"
	"math"
	"sort"
	"time"
)

// SpendingCategory represents a spending category
type SpendingCategory string

// Common spending categories
const (
	CategoryGroceries      SpendingCategory = "groceries"
	CategoryDining         SpendingCategory = "dining"
	CategoryTransportation SpendingCategory = "transportation"
	CategoryUtilities      SpendingCategory = "utilities"
	CategoryEntertainment  SpendingCategory = "entertainment"
	CategoryShopping       SpendingCategory = "shopping"
	CategoryHealthcare     SpendingCategory = "healthcare"
	CategoryTravel         SpendingCategory = "travel"
	CategoryEducation      SpendingCategory = "education"
	CategorySubscriptions  SpendingCategory = "subscriptions"
	CategoryHousing        SpendingCategory = "housing"
	CategoryInsurance      SpendingCategory = "insurance"
	CategoryPersonalCare   SpendingCategory = "personal_care"
	CategoryGifts          SpendingCategory = "gifts"
	CategoryOther          SpendingCategory = "other"
)

// TimePeriod represents a time period for analysis
type TimePeriod string

const (
	PeriodDaily   TimePeriod = "daily"
	PeriodWeekly  TimePeriod = "weekly"
	PeriodMonthly TimePeriod = "monthly"
	PeriodYearly  TimePeriod = "yearly"
)

// TrendDirection indicates the direction of a spending trend
type TrendDirection string

const (
	TrendIncreasing TrendDirection = "increasing"
	TrendDecreasing TrendDirection = "decreasing"
	TrendStable     TrendDirection = "stable"
)

// AnomalyType indicates the type of spending anomaly
type AnomalyType string

const (
	AnomalyUnusuallyHigh    AnomalyType = "unusually_high"
	AnomalyUnusuallyLow     AnomalyType = "unusually_low"
	AnomalyNewCategory      AnomalyType = "new_category"
	AnomalyNewMerchant      AnomalyType = "new_merchant"
	AnomalyUnusualTime      AnomalyType = "unusual_time"
	AnomalyDuplicateCharge  AnomalyType = "duplicate_charge"
	AnomalyLargeTransaction AnomalyType = "large_transaction"
)

// AnomalySeverity indicates how significant an anomaly is
type AnomalySeverity string

const (
	SeverityLow    AnomalySeverity = "low"
	SeverityMedium AnomalySeverity = "medium"
	SeverityHigh   AnomalySeverity = "high"
)

// Transaction represents a spending transaction for analysis
type Transaction struct {
	ID              string
	UserID          string
	Amount          float64
	Category        SpendingCategory
	MerchantName    string
	TransactionDate time.Time
	Description     string
	IsRecurring     bool
	Tags            []string
}

// CategorySpending represents spending for a single category in a time period
type CategorySpending struct {
	Category       SpendingCategory `json:"category"`
	Amount         float64          `json:"amount"`
	TransactionCount int            `json:"transaction_count"`
	Percentage     float64          `json:"percentage"`
	AverageTransaction float64      `json:"average_transaction"`
}

// PeriodSpending represents spending for a time period
type PeriodSpending struct {
	StartDate        time.Time                       `json:"start_date"`
	EndDate          time.Time                       `json:"end_date"`
	TotalAmount      float64                         `json:"total_amount"`
	TransactionCount int                             `json:"transaction_count"`
	ByCategory       map[SpendingCategory]CategorySpending `json:"by_category"`
}

// SpendingOverTime represents spending by category over multiple time periods
type SpendingOverTime struct {
	UserID           string                                `json:"user_id"`
	Period           TimePeriod                            `json:"period"`
	StartDate        time.Time                             `json:"start_date"`
	EndDate          time.Time                             `json:"end_date"`
	Periods          []PeriodSpending                      `json:"periods"`
	CategoryTotals   map[SpendingCategory]float64          `json:"category_totals"`
	TotalSpending    float64                               `json:"total_spending"`
	AveragePerPeriod float64                               `json:"average_per_period"`
	TopCategories    []CategorySpending                    `json:"top_categories"`
}

// SpendingTrend represents a detected spending trend
type SpendingTrend struct {
	Category        SpendingCategory `json:"category"`
	Direction       TrendDirection   `json:"direction"`
	ChangePercent   float64          `json:"change_percent"`
	ChangeAmount    float64          `json:"change_amount"`
	StartAmount     float64          `json:"start_amount"`
	EndAmount       float64          `json:"end_amount"`
	Slope           float64          `json:"slope"`
	RSquared        float64          `json:"r_squared"`
	Confidence      float64          `json:"confidence"`
	PeriodCount     int              `json:"period_count"`
	Description     string           `json:"description"`
}

// TrendAnalysisResult represents the result of trend analysis
type TrendAnalysisResult struct {
	UserID            string          `json:"user_id"`
	AnalysisPeriod    TimePeriod      `json:"analysis_period"`
	StartDate         time.Time       `json:"start_date"`
	EndDate           time.Time       `json:"end_date"`
	Trends            []SpendingTrend `json:"trends"`
	OverallTrend      SpendingTrend   `json:"overall_trend"`
	SignificantTrends []SpendingTrend `json:"significant_trends"`
	AnalyzedAt        time.Time       `json:"analyzed_at"`
}

// SpendingAnomaly represents a detected spending anomaly
type SpendingAnomaly struct {
	ID              string           `json:"id"`
	Type            AnomalyType      `json:"type"`
	Severity        AnomalySeverity  `json:"severity"`
	Category        SpendingCategory `json:"category,omitempty"`
	MerchantName    string           `json:"merchant_name,omitempty"`
	Amount          float64          `json:"amount"`
	ExpectedAmount  float64          `json:"expected_amount,omitempty"`
	Deviation       float64          `json:"deviation"`
	ZScore          float64          `json:"z_score"`
	TransactionID   string           `json:"transaction_id,omitempty"`
	TransactionDate time.Time        `json:"transaction_date"`
	Description     string           `json:"description"`
	Confidence      float64          `json:"confidence"`
}

// AnomalyDetectionResult represents the result of anomaly detection
type AnomalyDetectionResult struct {
	UserID          string            `json:"user_id"`
	StartDate       time.Time         `json:"start_date"`
	EndDate         time.Time         `json:"end_date"`
	Anomalies       []SpendingAnomaly `json:"anomalies"`
	AnomalyCount    int               `json:"anomaly_count"`
	HighSeverity    int               `json:"high_severity_count"`
	MediumSeverity  int               `json:"medium_severity_count"`
	LowSeverity     int               `json:"low_severity_count"`
	AnalyzedAt      time.Time         `json:"analyzed_at"`
}

// SpendingAnalysisConfig holds configuration for spending analysis
type SpendingAnalysisConfig struct {
	// Trend detection settings
	MinPeriodsForTrend     int     // Minimum periods needed for trend detection
	TrendSignificanceLevel float64 // R-squared threshold for significant trend
	MinChangePercent       float64 // Minimum change to report as trend

	// Anomaly detection settings
	AnomalyZScoreThreshold float64 // Z-score threshold for anomaly detection
	LargeTransactionMultiple float64 // Multiple of average for large transaction
	DuplicateTimeWindowHours int    // Hours window for duplicate detection
	MinTransactionsForStats  int    // Minimum transactions for statistical analysis

	// General settings
	DefaultLookbackDays int // Default days to look back for analysis
}

// DefaultSpendingAnalysisConfig returns a config with reasonable defaults
func DefaultSpendingAnalysisConfig() SpendingAnalysisConfig {
	return SpendingAnalysisConfig{
		MinPeriodsForTrend:       3,
		TrendSignificanceLevel:   0.5,
		MinChangePercent:         10.0,
		AnomalyZScoreThreshold:   2.0,
		LargeTransactionMultiple: 3.0,
		DuplicateTimeWindowHours: 24,
		MinTransactionsForStats:  5,
		DefaultLookbackDays:      90,
	}
}

// TransactionRepository defines the interface for retrieving transactions
type TransactionRepository interface {
	GetByUserID(ctx context.Context, userID string, startDate, endDate time.Time) ([]Transaction, error)
	GetByCategory(ctx context.Context, userID string, category SpendingCategory, startDate, endDate time.Time) ([]Transaction, error)
}

// SpendingService provides spending pattern analysis
type SpendingService struct {
	config SpendingAnalysisConfig
	repo   TransactionRepository
}

// NewSpendingService creates a new spending analysis service
func NewSpendingService(repo TransactionRepository, config SpendingAnalysisConfig) *SpendingService {
	return &SpendingService{
		config: config,
		repo:   repo,
	}
}

// NewSpendingServiceWithDefaults creates a new spending service with default config
func NewSpendingServiceWithDefaults(repo TransactionRepository) *SpendingService {
	return NewSpendingService(repo, DefaultSpendingAnalysisConfig())
}

// AnalyzeSpendingByCategory analyzes spending by category over time
func (s *SpendingService) AnalyzeSpendingByCategory(
	ctx context.Context,
	userID string,
	startDate, endDate time.Time,
	period TimePeriod,
) (*SpendingOverTime, error) {
	if userID == "" {
		return nil, errors.New("userID is required")
	}
	if endDate.Before(startDate) {
		return nil, errors.New("endDate must be after startDate")
	}

	transactions, err := s.repo.GetByUserID(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	periods := s.groupTransactionsByPeriod(transactions, startDate, endDate, period)
	categoryTotals := make(map[SpendingCategory]float64)
	totalSpending := 0.0

	for _, p := range periods {
		for cat, spending := range p.ByCategory {
			categoryTotals[cat] += spending.Amount
		}
		totalSpending += p.TotalAmount
	}

	avgPerPeriod := 0.0
	if len(periods) > 0 {
		avgPerPeriod = totalSpending / float64(len(periods))
	}

	topCategories := s.getTopCategories(categoryTotals, totalSpending, 5)

	return &SpendingOverTime{
		UserID:           userID,
		Period:           period,
		StartDate:        startDate,
		EndDate:          endDate,
		Periods:          periods,
		CategoryTotals:   categoryTotals,
		TotalSpending:    totalSpending,
		AveragePerPeriod: avgPerPeriod,
		TopCategories:    topCategories,
	}, nil
}

// DetectTrends analyzes spending patterns to detect trends
func (s *SpendingService) DetectTrends(
	ctx context.Context,
	userID string,
	startDate, endDate time.Time,
	period TimePeriod,
) (*TrendAnalysisResult, error) {
	if userID == "" {
		return nil, errors.New("userID is required")
	}

	spendingData, err := s.AnalyzeSpendingByCategory(ctx, userID, startDate, endDate, period)
	if err != nil {
		return nil, err
	}

	if len(spendingData.Periods) < s.config.MinPeriodsForTrend {
		return &TrendAnalysisResult{
			UserID:         userID,
			AnalysisPeriod: period,
			StartDate:      startDate,
			EndDate:        endDate,
			Trends:         []SpendingTrend{},
			AnalyzedAt:     time.Now(),
		}, nil
	}

	var trends []SpendingTrend
	var significantTrends []SpendingTrend

	// Analyze trends for each category
	for category := range spendingData.CategoryTotals {
		trend := s.calculateCategoryTrend(spendingData.Periods, category)
		if trend != nil {
			trends = append(trends, *trend)
			if trend.RSquared >= s.config.TrendSignificanceLevel &&
				math.Abs(trend.ChangePercent) >= s.config.MinChangePercent {
				significantTrends = append(significantTrends, *trend)
			}
		}
	}

	// Calculate overall spending trend
	overallTrend := s.calculateOverallTrend(spendingData.Periods)

	// Sort trends by absolute change percent
	sort.Slice(significantTrends, func(i, j int) bool {
		return math.Abs(significantTrends[i].ChangePercent) > math.Abs(significantTrends[j].ChangePercent)
	})

	return &TrendAnalysisResult{
		UserID:            userID,
		AnalysisPeriod:    period,
		StartDate:         startDate,
		EndDate:           endDate,
		Trends:            trends,
		OverallTrend:      overallTrend,
		SignificantTrends: significantTrends,
		AnalyzedAt:        time.Now(),
	}, nil
}

// DetectAnomalies identifies unusual spending patterns
func (s *SpendingService) DetectAnomalies(
	ctx context.Context,
	userID string,
	startDate, endDate time.Time,
) (*AnomalyDetectionResult, error) {
	if userID == "" {
		return nil, errors.New("userID is required")
	}

	transactions, err := s.repo.GetByUserID(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	var anomalies []SpendingAnomaly

	// Calculate statistics for anomaly detection
	stats := s.calculateSpendingStatistics(transactions)

	// Detect various types of anomalies
	anomalies = append(anomalies, s.detectAmountAnomalies(transactions, stats)...)
	anomalies = append(anomalies, s.detectCategoryAnomalies(transactions, stats)...)
	anomalies = append(anomalies, s.detectDuplicateCharges(transactions)...)
	anomalies = append(anomalies, s.detectLargeTransactions(transactions, stats)...)

	// Sort anomalies by severity and date
	sort.Slice(anomalies, func(i, j int) bool {
		if anomalies[i].Severity != anomalies[j].Severity {
			return severityRank(anomalies[i].Severity) > severityRank(anomalies[j].Severity)
		}
		return anomalies[i].TransactionDate.After(anomalies[j].TransactionDate)
	})

	// Count by severity
	var high, medium, low int
	for _, a := range anomalies {
		switch a.Severity {
		case SeverityHigh:
			high++
		case SeverityMedium:
			medium++
		case SeverityLow:
			low++
		}
	}

	return &AnomalyDetectionResult{
		UserID:         userID,
		StartDate:      startDate,
		EndDate:        endDate,
		Anomalies:      anomalies,
		AnomalyCount:   len(anomalies),
		HighSeverity:   high,
		MediumSeverity: medium,
		LowSeverity:    low,
		AnalyzedAt:     time.Now(),
	}, nil
}

// GetCategoryBreakdown returns spending breakdown for a specific time range
func (s *SpendingService) GetCategoryBreakdown(
	ctx context.Context,
	userID string,
	startDate, endDate time.Time,
) ([]CategorySpending, error) {
	if userID == "" {
		return nil, errors.New("userID is required")
	}

	transactions, err := s.repo.GetByUserID(ctx, userID, startDate, endDate)
	if err != nil {
		return nil, err
	}

	categoryMap := make(map[SpendingCategory]*CategorySpending)
	totalAmount := 0.0

	for _, t := range transactions {
		totalAmount += t.Amount
		if cs, exists := categoryMap[t.Category]; exists {
			cs.Amount += t.Amount
			cs.TransactionCount++
		} else {
			categoryMap[t.Category] = &CategorySpending{
				Category:         t.Category,
				Amount:           t.Amount,
				TransactionCount: 1,
			}
		}
	}

	var result []CategorySpending
	for _, cs := range categoryMap {
		if totalAmount > 0 {
			cs.Percentage = (cs.Amount / totalAmount) * 100
		}
		if cs.TransactionCount > 0 {
			cs.AverageTransaction = cs.Amount / float64(cs.TransactionCount)
		}
		result = append(result, *cs)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Amount > result[j].Amount
	})

	return result, nil
}

// CompareSpendingPeriods compares spending between two time periods
func (s *SpendingService) CompareSpendingPeriods(
	ctx context.Context,
	userID string,
	period1Start, period1End time.Time,
	period2Start, period2End time.Time,
) (*SpendingComparisonResult, error) {
	if userID == "" {
		return nil, errors.New("userID is required")
	}

	breakdown1, err := s.GetCategoryBreakdown(ctx, userID, period1Start, period1End)
	if err != nil {
		return nil, err
	}

	breakdown2, err := s.GetCategoryBreakdown(ctx, userID, period2Start, period2End)
	if err != nil {
		return nil, err
	}

	// Calculate totals
	total1 := 0.0
	for _, cs := range breakdown1 {
		total1 += cs.Amount
	}
	total2 := 0.0
	for _, cs := range breakdown2 {
		total2 += cs.Amount
	}

	// Build category comparison map
	categoryMap1 := make(map[SpendingCategory]CategorySpending)
	for _, cs := range breakdown1 {
		categoryMap1[cs.Category] = cs
	}
	categoryMap2 := make(map[SpendingCategory]CategorySpending)
	for _, cs := range breakdown2 {
		categoryMap2[cs.Category] = cs
	}

	// Calculate changes
	var changes []CategoryChange
	allCategories := make(map[SpendingCategory]bool)
	for cat := range categoryMap1 {
		allCategories[cat] = true
	}
	for cat := range categoryMap2 {
		allCategories[cat] = true
	}

	for cat := range allCategories {
		cs1 := categoryMap1[cat]
		cs2 := categoryMap2[cat]

		change := CategoryChange{
			Category:      cat,
			Period1Amount: cs1.Amount,
			Period2Amount: cs2.Amount,
			ChangeAmount:  cs2.Amount - cs1.Amount,
		}
		if cs1.Amount > 0 {
			change.ChangePercent = ((cs2.Amount - cs1.Amount) / cs1.Amount) * 100
		} else if cs2.Amount > 0 {
			change.ChangePercent = 100.0 // New category
		}
		changes = append(changes, change)
	}

	sort.Slice(changes, func(i, j int) bool {
		return math.Abs(changes[i].ChangeAmount) > math.Abs(changes[j].ChangeAmount)
	})

	overallChange := 0.0
	if total1 > 0 {
		overallChange = ((total2 - total1) / total1) * 100
	}

	return &SpendingComparisonResult{
		UserID:               userID,
		Period1Start:         period1Start,
		Period1End:           period1End,
		Period2Start:         period2Start,
		Period2End:           period2End,
		Period1Total:         total1,
		Period2Total:         total2,
		TotalChangeAmount:    total2 - total1,
		TotalChangePercent:   overallChange,
		CategoryChanges:      changes,
		BiggestIncreases:     getTopIncreases(changes, 3),
		BiggestDecreases:     getTopDecreases(changes, 3),
	}, nil
}

// SpendingComparisonResult represents comparison between two periods
type SpendingComparisonResult struct {
	UserID             string           `json:"user_id"`
	Period1Start       time.Time        `json:"period1_start"`
	Period1End         time.Time        `json:"period1_end"`
	Period2Start       time.Time        `json:"period2_start"`
	Period2End         time.Time        `json:"period2_end"`
	Period1Total       float64          `json:"period1_total"`
	Period2Total       float64          `json:"period2_total"`
	TotalChangeAmount  float64          `json:"total_change_amount"`
	TotalChangePercent float64          `json:"total_change_percent"`
	CategoryChanges    []CategoryChange `json:"category_changes"`
	BiggestIncreases   []CategoryChange `json:"biggest_increases"`
	BiggestDecreases   []CategoryChange `json:"biggest_decreases"`
}

// CategoryChange represents a change in spending for a category
type CategoryChange struct {
	Category      SpendingCategory `json:"category"`
	Period1Amount float64          `json:"period1_amount"`
	Period2Amount float64          `json:"period2_amount"`
	ChangeAmount  float64          `json:"change_amount"`
	ChangePercent float64          `json:"change_percent"`
}

// spendingStatistics holds statistical data for anomaly detection
type spendingStatistics struct {
	Mean              float64
	StdDev            float64
	Median            float64
	TransactionCount  int
	CategoryMeans     map[SpendingCategory]float64
	CategoryStdDevs   map[SpendingCategory]float64
	MerchantHistory   map[string][]float64
}

// groupTransactionsByPeriod groups transactions into time periods
func (s *SpendingService) groupTransactionsByPeriod(
	transactions []Transaction,
	startDate, endDate time.Time,
	period TimePeriod,
) []PeriodSpending {
	periodMap := make(map[time.Time]*PeriodSpending)

	for _, t := range transactions {
		periodStart := s.getPeriodStart(t.TransactionDate, period)
		periodEnd := s.getPeriodEnd(periodStart, period)

		if ps, exists := periodMap[periodStart]; exists {
			ps.TotalAmount += t.Amount
			ps.TransactionCount++
			if _, catExists := ps.ByCategory[t.Category]; catExists {
				cat := ps.ByCategory[t.Category]
				cat.Amount += t.Amount
				cat.TransactionCount++
				ps.ByCategory[t.Category] = cat
			} else {
				ps.ByCategory[t.Category] = CategorySpending{
					Category:         t.Category,
					Amount:           t.Amount,
					TransactionCount: 1,
				}
			}
		} else {
			periodMap[periodStart] = &PeriodSpending{
				StartDate:        periodStart,
				EndDate:          periodEnd,
				TotalAmount:      t.Amount,
				TransactionCount: 1,
				ByCategory: map[SpendingCategory]CategorySpending{
					t.Category: {
						Category:         t.Category,
						Amount:           t.Amount,
						TransactionCount: 1,
					},
				},
			}
		}
	}

	// Convert map to sorted slice
	var periods []PeriodSpending
	for _, ps := range periodMap {
		// Calculate percentages and averages
		for cat, cs := range ps.ByCategory {
			if ps.TotalAmount > 0 {
				cs.Percentage = (cs.Amount / ps.TotalAmount) * 100
			}
			if cs.TransactionCount > 0 {
				cs.AverageTransaction = cs.Amount / float64(cs.TransactionCount)
			}
			ps.ByCategory[cat] = cs
		}
		periods = append(periods, *ps)
	}

	sort.Slice(periods, func(i, j int) bool {
		return periods[i].StartDate.Before(periods[j].StartDate)
	})

	return periods
}

// getPeriodStart returns the start of the period containing the given time
func (s *SpendingService) getPeriodStart(t time.Time, period TimePeriod) time.Time {
	switch period {
	case PeriodDaily:
		return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
	case PeriodWeekly:
		weekday := int(t.Weekday())
		return time.Date(t.Year(), t.Month(), t.Day()-weekday, 0, 0, 0, 0, t.Location())
	case PeriodMonthly:
		return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
	case PeriodYearly:
		return time.Date(t.Year(), 1, 1, 0, 0, 0, 0, t.Location())
	default:
		return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
	}
}

// getPeriodEnd returns the end of the period
func (s *SpendingService) getPeriodEnd(start time.Time, period TimePeriod) time.Time {
	switch period {
	case PeriodDaily:
		return start.AddDate(0, 0, 1).Add(-time.Nanosecond)
	case PeriodWeekly:
		return start.AddDate(0, 0, 7).Add(-time.Nanosecond)
	case PeriodMonthly:
		return start.AddDate(0, 1, 0).Add(-time.Nanosecond)
	case PeriodYearly:
		return start.AddDate(1, 0, 0).Add(-time.Nanosecond)
	default:
		return start.AddDate(0, 1, 0).Add(-time.Nanosecond)
	}
}

// getTopCategories returns the top N categories by spending
func (s *SpendingService) getTopCategories(
	categoryTotals map[SpendingCategory]float64,
	totalSpending float64,
	n int,
) []CategorySpending {
	var categories []CategorySpending
	for cat, amount := range categoryTotals {
		pct := 0.0
		if totalSpending > 0 {
			pct = (amount / totalSpending) * 100
		}
		categories = append(categories, CategorySpending{
			Category:   cat,
			Amount:     amount,
			Percentage: pct,
		})
	}

	sort.Slice(categories, func(i, j int) bool {
		return categories[i].Amount > categories[j].Amount
	})

	if len(categories) > n {
		return categories[:n]
	}
	return categories
}

// calculateCategoryTrend calculates the trend for a specific category
func (s *SpendingService) calculateCategoryTrend(
	periods []PeriodSpending,
	category SpendingCategory,
) *SpendingTrend {
	var amounts []float64
	for _, p := range periods {
		if cs, exists := p.ByCategory[category]; exists {
			amounts = append(amounts, cs.Amount)
		} else {
			amounts = append(amounts, 0)
		}
	}

	if len(amounts) < s.config.MinPeriodsForTrend {
		return nil
	}

	slope, _, rSquared := linearRegression(amounts)
	startAmount := amounts[0]
	endAmount := amounts[len(amounts)-1]
	changeAmount := endAmount - startAmount
	changePercent := 0.0
	if startAmount > 0 {
		changePercent = (changeAmount / startAmount) * 100
	}

	direction := TrendStable
	if slope > 0 && rSquared >= 0.3 {
		direction = TrendIncreasing
	} else if slope < 0 && rSquared >= 0.3 {
		direction = TrendDecreasing
	}

	description := generateTrendDescription(category, direction, changePercent)

	return &SpendingTrend{
		Category:      category,
		Direction:     direction,
		ChangePercent: changePercent,
		ChangeAmount:  changeAmount,
		StartAmount:   startAmount,
		EndAmount:     endAmount,
		Slope:         slope,
		RSquared:      rSquared,
		Confidence:    rSquared,
		PeriodCount:   len(amounts),
		Description:   description,
	}
}

// calculateOverallTrend calculates the overall spending trend
func (s *SpendingService) calculateOverallTrend(periods []PeriodSpending) SpendingTrend {
	var amounts []float64
	for _, p := range periods {
		amounts = append(amounts, p.TotalAmount)
	}

	if len(amounts) == 0 {
		return SpendingTrend{Direction: TrendStable}
	}

	slope, _, rSquared := linearRegression(amounts)
	startAmount := amounts[0]
	endAmount := amounts[len(amounts)-1]
	changeAmount := endAmount - startAmount
	changePercent := 0.0
	if startAmount > 0 {
		changePercent = (changeAmount / startAmount) * 100
	}

	direction := TrendStable
	if slope > 0 && rSquared >= 0.3 {
		direction = TrendIncreasing
	} else if slope < 0 && rSquared >= 0.3 {
		direction = TrendDecreasing
	}

	return SpendingTrend{
		Direction:     direction,
		ChangePercent: changePercent,
		ChangeAmount:  changeAmount,
		StartAmount:   startAmount,
		EndAmount:     endAmount,
		Slope:         slope,
		RSquared:      rSquared,
		Confidence:    rSquared,
		PeriodCount:   len(amounts),
		Description:   generateTrendDescription("overall", direction, changePercent),
	}
}

// calculateSpendingStatistics calculates statistical measures for transactions
func (s *SpendingService) calculateSpendingStatistics(transactions []Transaction) spendingStatistics {
	stats := spendingStatistics{
		CategoryMeans:   make(map[SpendingCategory]float64),
		CategoryStdDevs: make(map[SpendingCategory]float64),
		MerchantHistory: make(map[string][]float64),
	}

	if len(transactions) == 0 {
		return stats
	}

	// Extract amounts
	var amounts []float64
	categoryAmounts := make(map[SpendingCategory][]float64)

	for _, t := range transactions {
		amounts = append(amounts, t.Amount)
		categoryAmounts[t.Category] = append(categoryAmounts[t.Category], t.Amount)
		stats.MerchantHistory[t.MerchantName] = append(stats.MerchantHistory[t.MerchantName], t.Amount)
	}

	stats.TransactionCount = len(amounts)
	stats.Mean = mean(amounts)
	stats.StdDev = stdDev(amounts, stats.Mean)
	stats.Median = median(amounts)

	for cat, catAmounts := range categoryAmounts {
		catMean := mean(catAmounts)
		stats.CategoryMeans[cat] = catMean
		stats.CategoryStdDevs[cat] = stdDev(catAmounts, catMean)
	}

	return stats
}

// detectAmountAnomalies detects transactions with unusual amounts
func (s *SpendingService) detectAmountAnomalies(
	transactions []Transaction,
	stats spendingStatistics,
) []SpendingAnomaly {
	var anomalies []SpendingAnomaly

	if stats.TransactionCount < s.config.MinTransactionsForStats {
		return anomalies
	}

	for _, t := range transactions {
		// Check against overall statistics
		zScore := 0.0
		if stats.StdDev > 0 {
			zScore = (t.Amount - stats.Mean) / stats.StdDev
		}

		if math.Abs(zScore) >= s.config.AnomalyZScoreThreshold {
			anomalyType := AnomalyUnusuallyHigh
			if zScore < 0 {
				anomalyType = AnomalyUnusuallyLow
			}

			severity := determineSeverity(zScore)
			confidence := math.Min(math.Abs(zScore)/5.0, 1.0)

			anomalies = append(anomalies, SpendingAnomaly{
				ID:              generateAnomalyID(t.ID, anomalyType),
				Type:            anomalyType,
				Severity:        severity,
				Category:        t.Category,
				MerchantName:    t.MerchantName,
				Amount:          t.Amount,
				ExpectedAmount:  stats.Mean,
				Deviation:       t.Amount - stats.Mean,
				ZScore:          zScore,
				TransactionID:   t.ID,
				TransactionDate: t.TransactionDate,
				Description:     generateAnomalyDescription(anomalyType, t, stats.Mean, zScore),
				Confidence:      confidence,
			})
		}
	}

	return anomalies
}

// detectCategoryAnomalies detects unusual spending in specific categories
func (s *SpendingService) detectCategoryAnomalies(
	transactions []Transaction,
	stats spendingStatistics,
) []SpendingAnomaly {
	var anomalies []SpendingAnomaly

	for _, t := range transactions {
		catMean, hasCatMean := stats.CategoryMeans[t.Category]
		catStdDev := stats.CategoryStdDevs[t.Category]

		if !hasCatMean || catStdDev == 0 {
			continue
		}

		zScore := (t.Amount - catMean) / catStdDev

		if math.Abs(zScore) >= s.config.AnomalyZScoreThreshold {
			anomalyType := AnomalyUnusuallyHigh
			if zScore < 0 {
				anomalyType = AnomalyUnusuallyLow
			}

			severity := determineSeverity(zScore)
			confidence := math.Min(math.Abs(zScore)/5.0, 1.0)

			anomalies = append(anomalies, SpendingAnomaly{
				ID:              generateAnomalyID(t.ID, anomalyType),
				Type:            anomalyType,
				Severity:        severity,
				Category:        t.Category,
				MerchantName:    t.MerchantName,
				Amount:          t.Amount,
				ExpectedAmount:  catMean,
				Deviation:       t.Amount - catMean,
				ZScore:          zScore,
				TransactionID:   t.ID,
				TransactionDate: t.TransactionDate,
				Description:     generateCategoryAnomalyDescription(t.Category, t.Amount, catMean, zScore),
				Confidence:      confidence,
			})
		}
	}

	return anomalies
}

// detectDuplicateCharges identifies potential duplicate charges
func (s *SpendingService) detectDuplicateCharges(transactions []Transaction) []SpendingAnomaly {
	var anomalies []SpendingAnomaly
	seen := make(map[string][]Transaction)

	for _, t := range transactions {
		key := t.MerchantName + "|" + formatFloat(t.Amount)
		seen[key] = append(seen[key], t)
	}

	timeWindow := time.Duration(s.config.DuplicateTimeWindowHours) * time.Hour

	for _, txns := range seen {
		if len(txns) < 2 {
			continue
		}

		sort.Slice(txns, func(i, j int) bool {
			return txns[i].TransactionDate.Before(txns[j].TransactionDate)
		})

		for i := 1; i < len(txns); i++ {
			timeDiff := txns[i].TransactionDate.Sub(txns[i-1].TransactionDate)
			if timeDiff <= timeWindow {
				anomalies = append(anomalies, SpendingAnomaly{
					ID:              generateAnomalyID(txns[i].ID, AnomalyDuplicateCharge),
					Type:            AnomalyDuplicateCharge,
					Severity:        SeverityMedium,
					Category:        txns[i].Category,
					MerchantName:    txns[i].MerchantName,
					Amount:          txns[i].Amount,
					TransactionID:   txns[i].ID,
					TransactionDate: txns[i].TransactionDate,
					Description:     generateDuplicateDescription(txns[i], txns[i-1]),
					Confidence:      0.7,
				})
			}
		}
	}

	return anomalies
}

// detectLargeTransactions identifies unusually large transactions
func (s *SpendingService) detectLargeTransactions(
	transactions []Transaction,
	stats spendingStatistics,
) []SpendingAnomaly {
	var anomalies []SpendingAnomaly

	if stats.Mean == 0 {
		return anomalies
	}

	threshold := stats.Mean * s.config.LargeTransactionMultiple

	for _, t := range transactions {
		if t.Amount >= threshold {
			zScore := 0.0
			if stats.StdDev > 0 {
				zScore = (t.Amount - stats.Mean) / stats.StdDev
			}

			severity := SeverityMedium
			if t.Amount >= threshold*2 {
				severity = SeverityHigh
			}

			anomalies = append(anomalies, SpendingAnomaly{
				ID:              generateAnomalyID(t.ID, AnomalyLargeTransaction),
				Type:            AnomalyLargeTransaction,
				Severity:        severity,
				Category:        t.Category,
				MerchantName:    t.MerchantName,
				Amount:          t.Amount,
				ExpectedAmount:  stats.Mean,
				Deviation:       t.Amount - stats.Mean,
				ZScore:          zScore,
				TransactionID:   t.ID,
				TransactionDate: t.TransactionDate,
				Description:     generateLargeTransactionDescription(t, stats.Mean),
				Confidence:      0.9,
			})
		}
	}

	return anomalies
}

// UpdateConfig updates the analysis configuration
func (s *SpendingService) UpdateConfig(config SpendingAnalysisConfig) {
	s.config = config
}

// GetConfig returns the current configuration
func (s *SpendingService) GetConfig() SpendingAnalysisConfig {
	return s.config
}

// Helper functions

func linearRegression(y []float64) (slope, intercept, rSquared float64) {
	n := float64(len(y))
	if n < 2 {
		return 0, 0, 0
	}

	var sumX, sumY, sumXY, sumX2 float64
	for i, val := range y {
		x := float64(i)
		sumX += x
		sumY += val
		sumXY += x * val
		sumX2 += x * x
	}

	denominator := n*sumX2 - sumX*sumX
	if denominator == 0 {
		return 0, mean(y), 0
	}

	slope = (n*sumXY - sumX*sumY) / denominator
	intercept = (sumY - slope*sumX) / n

	// Calculate R-squared
	yMean := sumY / n
	var ssRes, ssTot float64
	for i, val := range y {
		predicted := slope*float64(i) + intercept
		ssRes += (val - predicted) * (val - predicted)
		ssTot += (val - yMean) * (val - yMean)
	}

	if ssTot > 0 {
		rSquared = 1 - (ssRes / ssTot)
	}

	return slope, intercept, rSquared
}

func mean(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	sum := 0.0
	for _, v := range values {
		sum += v
	}
	return sum / float64(len(values))
}

func stdDev(values []float64, mean float64) float64 {
	if len(values) < 2 {
		return 0
	}
	sumSquares := 0.0
	for _, v := range values {
		diff := v - mean
		sumSquares += diff * diff
	}
	return math.Sqrt(sumSquares / float64(len(values)-1))
}

func median(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	sorted := make([]float64, len(values))
	copy(sorted, values)
	sort.Float64s(sorted)

	mid := len(sorted) / 2
	if len(sorted)%2 == 0 {
		return (sorted[mid-1] + sorted[mid]) / 2
	}
	return sorted[mid]
}

func severityRank(s AnomalySeverity) int {
	switch s {
	case SeverityHigh:
		return 3
	case SeverityMedium:
		return 2
	case SeverityLow:
		return 1
	default:
		return 0
	}
}

func determineSeverity(zScore float64) AnomalySeverity {
	absZ := math.Abs(zScore)
	if absZ >= 4.0 {
		return SeverityHigh
	}
	if absZ >= 3.0 {
		return SeverityMedium
	}
	return SeverityLow
}

func generateAnomalyID(transactionID string, anomalyType AnomalyType) string {
	return transactionID + "-" + string(anomalyType)
}

func formatFloat(f float64) string {
	return fmt.Sprintf("%.2f", math.Floor(f*100)/100)
}

func generateTrendDescription(category interface{}, direction TrendDirection, changePercent float64) string {
	catStr := "Spending"
	if cat, ok := category.(SpendingCategory); ok {
		catStr = string(cat) + " spending"
	}

	switch direction {
	case TrendIncreasing:
		return catStr + " has increased by " + formatPercent(changePercent)
	case TrendDecreasing:
		return catStr + " has decreased by " + formatPercent(math.Abs(changePercent))
	default:
		return catStr + " has remained stable"
	}
}

func formatPercent(p float64) string {
	return fmt.Sprintf("%.1f%%", math.Floor(p*10)/10)
}

func generateAnomalyDescription(anomalyType AnomalyType, t Transaction, expected float64, zScore float64) string {
	switch anomalyType {
	case AnomalyUnusuallyHigh:
		return "Transaction amount is unusually high compared to typical spending"
	case AnomalyUnusuallyLow:
		return "Transaction amount is unusually low compared to typical spending"
	default:
		return "Unusual transaction detected"
	}
}

func generateCategoryAnomalyDescription(category SpendingCategory, amount, expected, zScore float64) string {
	if amount > expected {
		return "Spending in " + string(category) + " is unusually high compared to typical patterns"
	}
	return "Spending in " + string(category) + " is unusually low compared to typical patterns"
}

func generateDuplicateDescription(t1, t2 Transaction) string {
	return "Potential duplicate charge: same amount at " + t1.MerchantName + " within a short time period"
}

func generateLargeTransactionDescription(t Transaction, avgAmount float64) string {
	return "Large transaction at " + t.MerchantName + " significantly exceeds your average spending"
}

func getTopIncreases(changes []CategoryChange, n int) []CategoryChange {
	var increases []CategoryChange
	for _, c := range changes {
		if c.ChangeAmount > 0 {
			increases = append(increases, c)
		}
	}
	sort.Slice(increases, func(i, j int) bool {
		return increases[i].ChangeAmount > increases[j].ChangeAmount
	})
	if len(increases) > n {
		return increases[:n]
	}
	return increases
}

func getTopDecreases(changes []CategoryChange, n int) []CategoryChange {
	var decreases []CategoryChange
	for _, c := range changes {
		if c.ChangeAmount < 0 {
			decreases = append(decreases, c)
		}
	}
	sort.Slice(decreases, func(i, j int) bool {
		return decreases[i].ChangeAmount < decreases[j].ChangeAmount
	})
	if len(decreases) > n {
		return decreases[:n]
	}
	return decreases
}
