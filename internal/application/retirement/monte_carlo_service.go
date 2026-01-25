package retirement

import (
	"errors"
	"math"
	"math/rand"
	"sort"
	"sync"
	"time"
)

// SimulationConfig holds configurable parameters for Monte Carlo simulation
type SimulationConfig struct {
	// Number of simulation iterations to run
	NumIterations int

	// Initial portfolio value
	InitialPortfolio float64

	// Annual contribution during accumulation phase
	AnnualContribution float64

	// Annual withdrawal during retirement phase
	AnnualWithdrawal float64

	// Years until retirement
	YearsToRetirement int

	// Years in retirement
	YearsInRetirement int

	// Expected annual return (mean)
	ExpectedReturn float64

	// Standard deviation of returns (volatility)
	ReturnStdDev float64

	// Inflation rate
	InflationRate float64

	// Whether to adjust withdrawals for inflation
	InflationAdjustedWithdrawals bool

	// Random seed (0 for time-based seed)
	Seed int64

	// Number of parallel workers (0 for auto-detect)
	Workers int
}

// DefaultConfig returns a SimulationConfig with reasonable defaults
func DefaultConfig() SimulationConfig {
	return SimulationConfig{
		NumIterations:                10000,
		InitialPortfolio:             500000,
		AnnualContribution:           20000,
		AnnualWithdrawal:             40000,
		YearsToRetirement:            20,
		YearsInRetirement:            30,
		ExpectedReturn:               0.07,
		ReturnStdDev:                 0.15,
		InflationRate:                0.025,
		InflationAdjustedWithdrawals: true,
		Seed:                         0,
		Workers:                      0,
	}
}

// SimulationResult holds the outcome of a single simulation run
type SimulationResult struct {
	// Final portfolio value at end of retirement
	FinalValue float64

	// Whether the portfolio lasted through retirement
	Success bool

	// Year when portfolio was depleted (0 if successful)
	DepletionYear int

	// Peak portfolio value achieved
	PeakValue float64

	// Minimum portfolio value during retirement
	MinRetirementValue float64
}

// MonteCarloResults holds aggregate results from all simulations
type MonteCarloResults struct {
	// Success probability (0-1)
	SuccessProbability float64

	// Number of successful simulations
	SuccessCount int

	// Total number of simulations
	TotalSimulations int

	// Percentile values of final portfolio
	Percentiles PercentileResults

	// Average final portfolio value
	AverageFinalValue float64

	// Median final portfolio value
	MedianFinalValue float64

	// Standard deviation of final values
	FinalValueStdDev float64

	// Average depletion year for failed simulations
	AverageDepletionYear float64

	// All individual simulation results (optional, may be nil for memory efficiency)
	AllResults []SimulationResult

	// Simulation duration
	Duration time.Duration
}

// PercentileResults contains portfolio values at various percentiles
type PercentileResults struct {
	P5   float64 // 5th percentile (worst case)
	P10  float64 // 10th percentile
	P25  float64 // 25th percentile
	P50  float64 // 50th percentile (median)
	P75  float64 // 75th percentile
	P90  float64 // 90th percentile
	P95  float64 // 95th percentile (best case)
}

// MonteCarloService performs Monte Carlo simulations for retirement planning
type MonteCarloService struct {
	config SimulationConfig
	rng    *rand.Rand
	mu     sync.Mutex
}

// NewMonteCarloService creates a new Monte Carlo simulation service
func NewMonteCarloService(config SimulationConfig) (*MonteCarloService, error) {
	if err := validateConfig(config); err != nil {
		return nil, err
	}

	seed := config.Seed
	if seed == 0 {
		seed = time.Now().UnixNano()
	}

	return &MonteCarloService{
		config: config,
		rng:    rand.New(rand.NewSource(seed)),
	}, nil
}

// validateConfig validates the simulation configuration
func validateConfig(config SimulationConfig) error {
	if config.NumIterations <= 0 {
		return errors.New("NumIterations must be positive")
	}
	if config.InitialPortfolio < 0 {
		return errors.New("InitialPortfolio cannot be negative")
	}
	if config.YearsToRetirement < 0 {
		return errors.New("YearsToRetirement cannot be negative")
	}
	if config.YearsInRetirement <= 0 {
		return errors.New("YearsInRetirement must be positive")
	}
	if config.ReturnStdDev < 0 {
		return errors.New("ReturnStdDev cannot be negative")
	}
	if config.InflationRate < 0 {
		return errors.New("InflationRate cannot be negative")
	}
	return nil
}

// RunSimulation executes the Monte Carlo simulation and returns aggregate results
func (s *MonteCarloService) RunSimulation() (*MonteCarloResults, error) {
	return s.RunSimulationWithConfig(s.config)
}

// RunSimulationWithConfig executes simulation with custom config
func (s *MonteCarloService) RunSimulationWithConfig(config SimulationConfig) (*MonteCarloResults, error) {
	if err := validateConfig(config); err != nil {
		return nil, err
	}

	startTime := time.Now()

	workers := config.Workers
	if workers <= 0 {
		workers = 4 // Default to 4 workers
	}

	results := make([]SimulationResult, config.NumIterations)

	// Run simulations in parallel
	var wg sync.WaitGroup
	iterationsPerWorker := config.NumIterations / workers
	remainder := config.NumIterations % workers

	startIdx := 0
	for w := 0; w < workers; w++ {
		count := iterationsPerWorker
		if w < remainder {
			count++
		}

		wg.Add(1)
		go func(start, count int, workerSeed int64) {
			defer wg.Done()
			rng := rand.New(rand.NewSource(workerSeed))
			for i := 0; i < count; i++ {
				results[start+i] = s.runSingleSimulation(config, rng)
			}
		}(startIdx, count, s.getNewSeed())

		startIdx += count
	}

	wg.Wait()

	// Calculate aggregate results
	aggregateResults := s.calculateAggregateResults(results, startTime)

	return aggregateResults, nil
}

// getNewSeed generates a new random seed for worker threads
func (s *MonteCarloService) getNewSeed() int64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.rng.Int63()
}

// runSingleSimulation runs one simulation iteration
func (s *MonteCarloService) runSingleSimulation(config SimulationConfig, rng *rand.Rand) SimulationResult {
	portfolio := config.InitialPortfolio
	peakValue := portfolio
	minRetirementValue := math.MaxFloat64

	// Accumulation phase
	for year := 1; year <= config.YearsToRetirement; year++ {
		// Add annual contribution
		portfolio += config.AnnualContribution

		// Apply random return using normal distribution
		annualReturn := s.generateNormalReturn(config.ExpectedReturn, config.ReturnStdDev, rng)
		portfolio *= (1 + annualReturn)

		if portfolio > peakValue {
			peakValue = portfolio
		}

		if portfolio <= 0 {
			return SimulationResult{
				FinalValue:         0,
				Success:            false,
				DepletionYear:      year,
				PeakValue:          peakValue,
				MinRetirementValue: 0,
			}
		}
	}

	// Retirement phase
	currentWithdrawal := config.AnnualWithdrawal
	minRetirementValue = portfolio

	for year := 1; year <= config.YearsInRetirement; year++ {
		// Adjust withdrawal for inflation if configured
		if config.InflationAdjustedWithdrawals && year > 1 {
			currentWithdrawal *= (1 + config.InflationRate)
		}

		// Withdraw at beginning of year
		portfolio -= currentWithdrawal

		if portfolio <= 0 {
			return SimulationResult{
				FinalValue:         0,
				Success:            false,
				DepletionYear:      config.YearsToRetirement + year,
				PeakValue:          peakValue,
				MinRetirementValue: 0,
			}
		}

		// Apply random return
		annualReturn := s.generateNormalReturn(config.ExpectedReturn, config.ReturnStdDev, rng)
		portfolio *= (1 + annualReturn)

		if portfolio > peakValue {
			peakValue = portfolio
		}

		if portfolio < minRetirementValue && portfolio > 0 {
			minRetirementValue = portfolio
		}
	}

	return SimulationResult{
		FinalValue:         portfolio,
		Success:            true,
		DepletionYear:      0,
		PeakValue:          peakValue,
		MinRetirementValue: minRetirementValue,
	}
}

// generateNormalReturn generates a random return using Box-Muller transform
func (s *MonteCarloService) generateNormalReturn(mean, stdDev float64, rng *rand.Rand) float64 {
	// Box-Muller transform for normal distribution
	u1 := rng.Float64()
	u2 := rng.Float64()

	// Avoid log(0)
	for u1 == 0 {
		u1 = rng.Float64()
	}

	z := math.Sqrt(-2*math.Log(u1)) * math.Cos(2*math.Pi*u2)
	return mean + stdDev*z
}

// calculateAggregateResults computes aggregate statistics from simulation results
func (s *MonteCarloService) calculateAggregateResults(results []SimulationResult, startTime time.Time) *MonteCarloResults {
	n := len(results)
	if n == 0 {
		return &MonteCarloResults{
			Duration: time.Since(startTime),
		}
	}

	var (
		successCount     int
		totalFinalValue  float64
		depletionYearSum int
		depletionCount   int
	)

	finalValues := make([]float64, n)

	for i, result := range results {
		finalValues[i] = result.FinalValue
		totalFinalValue += result.FinalValue

		if result.Success {
			successCount++
		} else {
			depletionYearSum += result.DepletionYear
			depletionCount++
		}
	}

	// Sort final values for percentile calculation
	sort.Float64s(finalValues)

	// Calculate mean and standard deviation
	avgFinalValue := totalFinalValue / float64(n)

	variance := 0.0
	for _, v := range finalValues {
		diff := v - avgFinalValue
		variance += diff * diff
	}
	variance /= float64(n)
	stdDev := math.Sqrt(variance)

	// Calculate average depletion year for failed simulations
	avgDepletionYear := 0.0
	if depletionCount > 0 {
		avgDepletionYear = float64(depletionYearSum) / float64(depletionCount)
	}

	return &MonteCarloResults{
		SuccessProbability:   float64(successCount) / float64(n),
		SuccessCount:         successCount,
		TotalSimulations:     n,
		Percentiles:          s.calculatePercentiles(finalValues),
		AverageFinalValue:    avgFinalValue,
		MedianFinalValue:     s.getPercentile(finalValues, 50),
		FinalValueStdDev:     stdDev,
		AverageDepletionYear: avgDepletionYear,
		AllResults:           results,
		Duration:             time.Since(startTime),
	}
}

// calculatePercentiles computes percentile values from sorted data
func (s *MonteCarloService) calculatePercentiles(sortedValues []float64) PercentileResults {
	return PercentileResults{
		P5:  s.getPercentile(sortedValues, 5),
		P10: s.getPercentile(sortedValues, 10),
		P25: s.getPercentile(sortedValues, 25),
		P50: s.getPercentile(sortedValues, 50),
		P75: s.getPercentile(sortedValues, 75),
		P90: s.getPercentile(sortedValues, 90),
		P95: s.getPercentile(sortedValues, 95),
	}
}

// getPercentile returns the value at the given percentile (0-100)
func (s *MonteCarloService) getPercentile(sortedValues []float64, percentile float64) float64 {
	if len(sortedValues) == 0 {
		return 0
	}

	// Calculate index using linear interpolation
	rank := percentile / 100.0 * float64(len(sortedValues)-1)
	lowerIdx := int(math.Floor(rank))
	upperIdx := int(math.Ceil(rank))

	if lowerIdx == upperIdx || upperIdx >= len(sortedValues) {
		return sortedValues[lowerIdx]
	}

	// Linear interpolation between adjacent values
	fraction := rank - float64(lowerIdx)
	return sortedValues[lowerIdx] + fraction*(sortedValues[upperIdx]-sortedValues[lowerIdx])
}

// CalculateSuccessProbability is a convenience method to get just the success probability
func (s *MonteCarloService) CalculateSuccessProbability() (float64, error) {
	results, err := s.RunSimulation()
	if err != nil {
		return 0, err
	}
	return results.SuccessProbability, nil
}

// CalculatePercentileResults is a convenience method to get just the percentile results
func (s *MonteCarloService) CalculatePercentileResults() (*PercentileResults, error) {
	results, err := s.RunSimulation()
	if err != nil {
		return nil, err
	}
	return &results.Percentiles, nil
}

// UpdateConfig updates the simulation configuration
func (s *MonteCarloService) UpdateConfig(config SimulationConfig) error {
	if err := validateConfig(config); err != nil {
		return err
	}
	s.config = config
	return nil
}

// GetConfig returns the current simulation configuration
func (s *MonteCarloService) GetConfig() SimulationConfig {
	return s.config
}

// SetSeed sets a new random seed for reproducibility
func (s *MonteCarloService) SetSeed(seed int64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.rng = rand.New(rand.NewSource(seed))
}
