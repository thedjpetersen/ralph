package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"clockzen-next/internal/application/dto"
	"clockzen-next/internal/presentation/http/handlers/retirement"
)

// TestExpenseHandlerCreate tests expense creation through the handler
func TestExpenseHandlerCreate(t *testing.T) {
	handler := retirement.NewExpenseHandler()

	t.Run("create valid expense", func(t *testing.T) {
		reqBody := retirement.CreateExpenseRequest{
			PlanID:      "plan-123",
			Category:    dto.ExpenseCategoryHousing,
			Name:        "Rent",
			Amount:      2000.00,
			GrowthRate:  0.03,
			Description: "Monthly rent payment",
		}

		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/retirement/expenses", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.HandleCreate(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var resp retirement.Expense
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.NotEmpty(t, resp.ID)
		assert.Equal(t, "plan-123", resp.PlanID)
		assert.Equal(t, dto.ExpenseCategoryHousing, resp.Category)
		assert.Equal(t, "Rent", resp.Name)
		assert.Equal(t, 2000.00, resp.Amount)
		assert.Equal(t, 0.03, resp.GrowthRate)
	})

	t.Run("create expense with invalid method", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/retirement/expenses", nil)
		w := httptest.NewRecorder()

		handler.HandleCreate(w, req)

		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})

	t.Run("create expense with invalid JSON", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/retirement/expenses",
			bytes.NewReader([]byte("invalid json")))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.HandleCreate(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("create expense with missing plan_id", func(t *testing.T) {
		reqBody := retirement.CreateExpenseRequest{
			PlanID:   "",
			Category: dto.ExpenseCategoryFood,
			Name:     "Groceries",
			Amount:   500.00,
		}

		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/retirement/expenses", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.HandleCreate(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		var errResp retirement.ErrorResponse
		json.Unmarshal(w.Body.Bytes(), &errResp)
		assert.Equal(t, "validation_error", errResp.Error)
		assert.Contains(t, errResp.Message, "plan_id")
	})

	t.Run("create expense with missing name", func(t *testing.T) {
		reqBody := retirement.CreateExpenseRequest{
			PlanID:   "plan-123",
			Category: dto.ExpenseCategoryFood,
			Name:     "",
			Amount:   500.00,
		}

		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/retirement/expenses", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.HandleCreate(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("create expense with negative amount", func(t *testing.T) {
		reqBody := retirement.CreateExpenseRequest{
			PlanID:   "plan-123",
			Category: dto.ExpenseCategoryFood,
			Name:     "Groceries",
			Amount:   -500.00,
		}

		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/retirement/expenses", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.HandleCreate(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("create expense with invalid growth rate", func(t *testing.T) {
		reqBody := retirement.CreateExpenseRequest{
			PlanID:     "plan-123",
			Category:   dto.ExpenseCategoryFood,
			Name:       "Groceries",
			Amount:     500.00,
			GrowthRate: 2.0, // > 1 is invalid
		}

		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/retirement/expenses", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.HandleCreate(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

// TestExpenseHandlerGet tests expense retrieval through the handler
func TestExpenseHandlerGet(t *testing.T) {
	handler := retirement.NewExpenseHandler()

	// Create a test expense first
	createReqBody := retirement.CreateExpenseRequest{
		PlanID:   "plan-get-test",
		Category: dto.ExpenseCategoryHealthcare,
		Name:     "Health Insurance",
		Amount:   500.00,
	}
	body, _ := json.Marshal(createReqBody)
	createReq := httptest.NewRequest(http.MethodPost, "/api/retirement/expenses", bytes.NewReader(body))
	createReq.Header.Set("Content-Type", "application/json")
	createW := httptest.NewRecorder()
	handler.HandleCreate(createW, createReq)

	var created retirement.Expense
	json.Unmarshal(createW.Body.Bytes(), &created)

	t.Run("get existing expense", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/retirement/expenses/"+created.ID, nil)
		w := httptest.NewRecorder()

		handler.HandleGet(w, req, created.ID)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp retirement.Expense
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.Equal(t, created.ID, resp.ID)
		assert.Equal(t, "Health Insurance", resp.Name)
	})

	t.Run("get non-existent expense", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/retirement/expenses/non-existent", nil)
		w := httptest.NewRecorder()

		handler.HandleGet(w, req, "non-existent")

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("get expense with wrong method", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/retirement/expenses/"+created.ID, nil)
		w := httptest.NewRecorder()

		handler.HandleGet(w, req, created.ID)

		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})
}

// TestExpenseHandlerList tests expense listing through the handler
func TestExpenseHandlerList(t *testing.T) {
	handler := retirement.NewExpenseHandler()

	// Create test expenses
	expenses := []retirement.CreateExpenseRequest{
		{PlanID: "plan-list-1", Category: dto.ExpenseCategoryHousing, Name: "Rent", Amount: 2000},
		{PlanID: "plan-list-1", Category: dto.ExpenseCategoryFood, Name: "Groceries", Amount: 500},
		{PlanID: "plan-list-2", Category: dto.ExpenseCategoryUtilities, Name: "Electric", Amount: 150},
	}

	for _, e := range expenses {
		body, _ := json.Marshal(e)
		req := httptest.NewRequest(http.MethodPost, "/api/retirement/expenses", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler.HandleCreate(w, req)
	}

	t.Run("list all expenses", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/retirement/expenses", nil)
		w := httptest.NewRecorder()

		handler.HandleList(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp retirement.ListExpensesResponse
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, resp.Total, 3)
	})

	t.Run("list expenses filtered by plan_id", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/retirement/expenses?plan_id=plan-list-1", nil)
		w := httptest.NewRecorder()

		handler.HandleList(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp retirement.ListExpensesResponse
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.Equal(t, 2, resp.Total)

		for _, e := range resp.Expenses {
			assert.Equal(t, "plan-list-1", e.PlanID)
		}
	})

	t.Run("list with wrong method", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/retirement/expenses", nil)
		w := httptest.NewRecorder()

		handler.HandleList(w, req)

		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})
}

// TestExpenseHandlerListByPlan tests listing expenses for a specific plan
func TestExpenseHandlerListByPlan(t *testing.T) {
	handler := retirement.NewExpenseHandler()

	// Create test expenses for a specific plan
	planID := "plan-by-plan-test"
	expenses := []retirement.CreateExpenseRequest{
		{PlanID: planID, Category: dto.ExpenseCategoryInsurance, Name: "Life Insurance", Amount: 200},
		{PlanID: planID, Category: dto.ExpenseCategoryTransportation, Name: "Car Payment", Amount: 400},
	}

	for _, e := range expenses {
		body, _ := json.Marshal(e)
		req := httptest.NewRequest(http.MethodPost, "/api/retirement/expenses", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler.HandleCreate(w, req)
	}

	t.Run("list by plan ID", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/retirement/plans/"+planID+"/expenses", nil)
		w := httptest.NewRecorder()

		handler.HandleListByPlan(w, req, planID)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp retirement.ListExpensesResponse
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.Equal(t, 2, resp.Total)
	})

	t.Run("list by non-existent plan ID", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/retirement/plans/non-existent/expenses", nil)
		w := httptest.NewRecorder()

		handler.HandleListByPlan(w, req, "non-existent")

		assert.Equal(t, http.StatusOK, w.Code)

		var resp retirement.ListExpensesResponse
		json.Unmarshal(w.Body.Bytes(), &resp)
		assert.Equal(t, 0, resp.Total)
	})
}

// TestExpenseHandlerUpdate tests expense updates through the handler
func TestExpenseHandlerUpdate(t *testing.T) {
	handler := retirement.NewExpenseHandler()

	// Create a test expense
	createReq := retirement.CreateExpenseRequest{
		PlanID:   "plan-update-test",
		Category: dto.ExpenseCategoryDiscretionary,
		Name:     "Entertainment",
		Amount:   300.00,
	}
	body, _ := json.Marshal(createReq)
	req := httptest.NewRequest(http.MethodPost, "/api/retirement/expenses", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	handler.HandleCreate(w, req)

	var created retirement.Expense
	json.Unmarshal(w.Body.Bytes(), &created)

	t.Run("update expense amount", func(t *testing.T) {
		newAmount := 350.00
		updateReq := retirement.UpdateExpenseRequest{
			Amount: &newAmount,
		}
		body, _ := json.Marshal(updateReq)
		req := httptest.NewRequest(http.MethodPut, "/api/retirement/expenses/"+created.ID, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.HandleUpdate(w, req, created.ID)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp retirement.Expense
		json.Unmarshal(w.Body.Bytes(), &resp)
		assert.Equal(t, 350.00, resp.Amount)
		assert.Equal(t, "Entertainment", resp.Name) // Name unchanged
	})

	t.Run("update expense name and category", func(t *testing.T) {
		newName := "Hobbies"
		newCategory := dto.ExpenseCategoryOther
		updateReq := retirement.UpdateExpenseRequest{
			Name:     &newName,
			Category: &newCategory,
		}
		body, _ := json.Marshal(updateReq)
		req := httptest.NewRequest(http.MethodPatch, "/api/retirement/expenses/"+created.ID, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.HandleUpdate(w, req, created.ID)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp retirement.Expense
		json.Unmarshal(w.Body.Bytes(), &resp)
		assert.Equal(t, "Hobbies", resp.Name)
		assert.Equal(t, dto.ExpenseCategoryOther, resp.Category)
	})

	t.Run("update non-existent expense", func(t *testing.T) {
		newAmount := 100.00
		updateReq := retirement.UpdateExpenseRequest{
			Amount: &newAmount,
		}
		body, _ := json.Marshal(updateReq)
		req := httptest.NewRequest(http.MethodPut, "/api/retirement/expenses/non-existent", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.HandleUpdate(w, req, "non-existent")

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("update with invalid JSON", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPut, "/api/retirement/expenses/"+created.ID,
			bytes.NewReader([]byte("invalid")))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.HandleUpdate(w, req, created.ID)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

// TestExpenseHandlerDelete tests expense deletion through the handler
func TestExpenseHandlerDelete(t *testing.T) {
	handler := retirement.NewExpenseHandler()

	// Create a test expense
	createReq := retirement.CreateExpenseRequest{
		PlanID:   "plan-delete-test",
		Category: dto.ExpenseCategoryFood,
		Name:     "Restaurants",
		Amount:   200.00,
	}
	body, _ := json.Marshal(createReq)
	req := httptest.NewRequest(http.MethodPost, "/api/retirement/expenses", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	handler.HandleCreate(w, req)

	var created retirement.Expense
	json.Unmarshal(w.Body.Bytes(), &created)

	t.Run("delete existing expense", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/retirement/expenses/"+created.ID, nil)
		w := httptest.NewRecorder()

		handler.HandleDelete(w, req, created.ID)

		assert.Equal(t, http.StatusNoContent, w.Code)

		// Verify it's deleted
		getReq := httptest.NewRequest(http.MethodGet, "/api/retirement/expenses/"+created.ID, nil)
		getW := httptest.NewRecorder()
		handler.HandleGet(getW, getReq, created.ID)
		assert.Equal(t, http.StatusNotFound, getW.Code)
	})

	t.Run("delete non-existent expense", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/retirement/expenses/non-existent", nil)
		w := httptest.NewRecorder()

		handler.HandleDelete(w, req, "non-existent")

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("delete with wrong method", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/retirement/expenses/some-id", nil)
		w := httptest.NewRecorder()

		handler.HandleDelete(w, req, "some-id")

		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})
}

// TestExpenseBreakdown tests expense breakdown calculation
func TestExpenseBreakdown(t *testing.T) {
	handler := retirement.NewExpenseHandler()

	planID := "plan-breakdown-test"

	// Create expenses for each category
	expenses := []retirement.CreateExpenseRequest{
		{PlanID: planID, Category: dto.ExpenseCategoryHousing, Name: "Rent", Amount: 2000},
		{PlanID: planID, Category: dto.ExpenseCategoryHousing, Name: "Home Insurance", Amount: 100},
		{PlanID: planID, Category: dto.ExpenseCategoryHealthcare, Name: "Health Insurance", Amount: 500},
		{PlanID: planID, Category: dto.ExpenseCategoryFood, Name: "Groceries", Amount: 600},
		{PlanID: planID, Category: dto.ExpenseCategoryTransportation, Name: "Car", Amount: 400},
		{PlanID: planID, Category: dto.ExpenseCategoryUtilities, Name: "Electric", Amount: 150},
		{PlanID: planID, Category: dto.ExpenseCategoryInsurance, Name: "Life Insurance", Amount: 200},
		{PlanID: planID, Category: dto.ExpenseCategoryDiscretionary, Name: "Entertainment", Amount: 300},
		{PlanID: planID, Category: dto.ExpenseCategoryOther, Name: "Miscellaneous", Amount: 250},
	}

	for _, e := range expenses {
		body, _ := json.Marshal(e)
		req := httptest.NewRequest(http.MethodPost, "/api/retirement/expenses", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		handler.HandleCreate(w, req)
	}

	t.Run("get expense breakdown", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/retirement/plans/"+planID+"/expense-breakdown", nil)
		w := httptest.NewRecorder()

		handler.HandleGetExpenseBreakdown(w, req, planID)

		assert.Equal(t, http.StatusOK, w.Code)

		var breakdown retirement.ExpenseBreakdownSummary
		err := json.Unmarshal(w.Body.Bytes(), &breakdown)
		require.NoError(t, err)

		assert.Equal(t, 2100.00, breakdown.HousingExpense)       // 2000 + 100
		assert.Equal(t, 500.00, breakdown.HealthcareExpense)
		assert.Equal(t, 600.00, breakdown.FoodExpense)
		assert.Equal(t, 400.00, breakdown.TransportationExpense)
		assert.Equal(t, 150.00, breakdown.UtilitiesExpense)
		assert.Equal(t, 200.00, breakdown.InsuranceExpense)
		assert.Equal(t, 300.00, breakdown.DiscretionaryExpense)
		assert.Equal(t, 250.00, breakdown.OtherExpenses)

		expectedTotal := 2100.0 + 500.0 + 600.0 + 400.0 + 150.0 + 200.0 + 300.0 + 250.0
		assert.Equal(t, expectedTotal, breakdown.TotalExpenses)
	})

	t.Run("get breakdown for empty plan", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/retirement/plans/empty-plan/expense-breakdown", nil)
		w := httptest.NewRecorder()

		handler.HandleGetExpenseBreakdown(w, req, "empty-plan")

		assert.Equal(t, http.StatusOK, w.Code)

		var breakdown retirement.ExpenseBreakdownSummary
		json.Unmarshal(w.Body.Bytes(), &breakdown)
		assert.Equal(t, 0.0, breakdown.TotalExpenses)
	})

	t.Run("breakdown with wrong method", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/retirement/plans/"+planID+"/expense-breakdown", nil)
		w := httptest.NewRecorder()

		handler.HandleGetExpenseBreakdown(w, req, planID)

		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})
}

// TestExpenseCategories tests all expense category types
func TestExpenseCategories(t *testing.T) {
	categories := []dto.ExpenseCategoryType{
		dto.ExpenseCategoryHousing,
		dto.ExpenseCategoryHealthcare,
		dto.ExpenseCategoryFood,
		dto.ExpenseCategoryTransportation,
		dto.ExpenseCategoryUtilities,
		dto.ExpenseCategoryInsurance,
		dto.ExpenseCategoryDiscretionary,
		dto.ExpenseCategoryOther,
	}

	handler := retirement.NewExpenseHandler()

	for _, cat := range categories {
		t.Run("create expense with category "+string(cat), func(t *testing.T) {
			createReq := retirement.CreateExpenseRequest{
				PlanID:   "plan-category-test",
				Category: cat,
				Name:     "Test " + string(cat),
				Amount:   100.00,
			}
			body, _ := json.Marshal(createReq)
			req := httptest.NewRequest(http.MethodPost, "/api/retirement/expenses", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			handler.HandleCreate(w, req)

			assert.Equal(t, http.StatusCreated, w.Code)

			var resp retirement.Expense
			json.Unmarshal(w.Body.Bytes(), &resp)
			assert.Equal(t, cat, resp.Category)
		})
	}
}

// TestRouterIntegration tests the full router with expenses
func TestRouterIntegration(t *testing.T) {
	router := retirement.NewDefaultRouter()

	mux := http.NewServeMux()
	router.RegisterRoutes(mux)

	t.Run("create and retrieve expense through router", func(t *testing.T) {
		// Create expense
		createReq := retirement.CreateExpenseRequest{
			PlanID:   "router-test-plan",
			Category: dto.ExpenseCategoryHousing,
			Name:     "Router Test Expense",
			Amount:   1000.00,
		}
		body, _ := json.Marshal(createReq)
		req := httptest.NewRequest(http.MethodPost, "/api/retirement/expenses", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		mux.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var created retirement.Expense
		json.Unmarshal(w.Body.Bytes(), &created)

		// List expenses
		listReq := httptest.NewRequest(http.MethodGet, "/api/retirement/expenses?plan_id=router-test-plan", nil)
		listW := httptest.NewRecorder()

		mux.ServeHTTP(listW, listReq)

		assert.Equal(t, http.StatusOK, listW.Code)

		var listResp retirement.ListExpensesResponse
		json.Unmarshal(listW.Body.Bytes(), &listResp)
		assert.GreaterOrEqual(t, listResp.Total, 1)
	})

	t.Run("full CRUD cycle through router", func(t *testing.T) {
		// Create
		createReq := retirement.CreateExpenseRequest{
			PlanID:   "crud-test-plan",
			Category: dto.ExpenseCategoryFood,
			Name:     "CRUD Test",
			Amount:   500.00,
		}
		body, _ := json.Marshal(createReq)
		req := httptest.NewRequest(http.MethodPost, "/api/retirement/expenses", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)
		require.Equal(t, http.StatusCreated, w.Code)

		var created retirement.Expense
		json.Unmarshal(w.Body.Bytes(), &created)

		// Read
		getReq := httptest.NewRequest(http.MethodGet, "/api/retirement/expenses/"+created.ID, nil)
		getW := httptest.NewRecorder()
		mux.ServeHTTP(getW, getReq)
		assert.Equal(t, http.StatusOK, getW.Code)

		// Update
		newAmount := 600.00
		updateReq := retirement.UpdateExpenseRequest{Amount: &newAmount}
		updateBody, _ := json.Marshal(updateReq)
		putReq := httptest.NewRequest(http.MethodPut, "/api/retirement/expenses/"+created.ID, bytes.NewReader(updateBody))
		putReq.Header.Set("Content-Type", "application/json")
		putW := httptest.NewRecorder()
		mux.ServeHTTP(putW, putReq)
		assert.Equal(t, http.StatusOK, putW.Code)

		var updated retirement.Expense
		json.Unmarshal(putW.Body.Bytes(), &updated)
		assert.Equal(t, 600.00, updated.Amount)

		// Delete
		delReq := httptest.NewRequest(http.MethodDelete, "/api/retirement/expenses/"+created.ID, nil)
		delW := httptest.NewRecorder()
		mux.ServeHTTP(delW, delReq)
		assert.Equal(t, http.StatusNoContent, delW.Code)

		// Verify deleted
		verifyReq := httptest.NewRequest(http.MethodGet, "/api/retirement/expenses/"+created.ID, nil)
		verifyW := httptest.NewRecorder()
		mux.ServeHTTP(verifyW, verifyReq)
		assert.Equal(t, http.StatusNotFound, verifyW.Code)
	})
}

// TestBudgetDatabaseIntegration tests budget operations with database integration
func TestBudgetDatabaseIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	db := SetupTestDatabase(t)
	defer db.Cleanup(t)

	ctx := context.Background()

	t.Run("database connection is active", func(t *testing.T) {
		// Verify we can query the database
		count, err := db.Client.GoogleDriveConnection.Query().Count(ctx)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, count, 0)
	})

	t.Run("database schema is properly migrated", func(t *testing.T) {
		// Check that all tables exist by querying them
		_, err := db.Client.GoogleDriveConnection.Query().Limit(1).All(ctx)
		require.NoError(t, err)

		_, err = db.Client.EmailConnection.Query().Limit(1).All(ctx)
		require.NoError(t, err)

		_, err = db.Client.GoogleDriveFolder.Query().Limit(1).All(ctx)
		require.NoError(t, err)

		_, err = db.Client.EmailLabel.Query().Limit(1).All(ctx)
		require.NoError(t, err)
	})
}

// TestConcurrentExpenseOperations tests thread safety of expense operations
func TestConcurrentExpenseOperations(t *testing.T) {
	handler := retirement.NewExpenseHandler()

	// Create initial expense
	createReq := retirement.CreateExpenseRequest{
		PlanID:   "concurrent-test-plan",
		Category: dto.ExpenseCategoryOther,
		Name:     "Concurrent Test",
		Amount:   100.00,
	}
	body, _ := json.Marshal(createReq)
	req := httptest.NewRequest(http.MethodPost, "/api/retirement/expenses", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	handler.HandleCreate(w, req)

	var created retirement.Expense
	json.Unmarshal(w.Body.Bytes(), &created)

	t.Run("concurrent reads", func(t *testing.T) {
		done := make(chan bool)

		for i := 0; i < 10; i++ {
			go func() {
				req := httptest.NewRequest(http.MethodGet, "/api/retirement/expenses/"+created.ID, nil)
				w := httptest.NewRecorder()
				handler.HandleGet(w, req, created.ID)
				assert.Equal(t, http.StatusOK, w.Code)
				done <- true
			}()
		}

		for i := 0; i < 10; i++ {
			<-done
		}
	})

	t.Run("concurrent creates", func(t *testing.T) {
		done := make(chan bool)

		for i := 0; i < 10; i++ {
			go func(idx int) {
				createReq := retirement.CreateExpenseRequest{
					PlanID:   "concurrent-create-plan",
					Category: dto.ExpenseCategoryOther,
					Name:     "Concurrent Create Test",
					Amount:   float64(100 + idx),
				}
				body, _ := json.Marshal(createReq)
				req := httptest.NewRequest(http.MethodPost, "/api/retirement/expenses", bytes.NewReader(body))
				req.Header.Set("Content-Type", "application/json")
				w := httptest.NewRecorder()
				handler.HandleCreate(w, req)
				assert.Equal(t, http.StatusCreated, w.Code)
				done <- true
			}(i)
		}

		for i := 0; i < 10; i++ {
			<-done
		}
	})
}
