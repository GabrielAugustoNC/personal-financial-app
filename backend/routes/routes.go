// Pacote routes configura todas as rotas HTTP e faz o wiring manual de dependências.
// Analogia .NET: Program.cs combinando builder.Services (DI) com app.MapControllers()
package routes

import (
	"context"

	"github.com/user/financas-api/handlers"
	"github.com/user/financas-api/middleware"
	"github.com/user/financas-api/repositories"
	"github.com/user/financas-api/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

// Setup registra middlewares, constrói o grafo de dependências e mapeia as rotas.
func Setup(router *gin.Engine, db *mongo.Database) {

	// ---- CORS ----
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:5174"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// ---- Composition Root ----
	userRepo    := repositories.NewMongoUserRepository(db)
	authService := services.NewAuthService(userRepo)
	authHandler := handlers.NewAuthHandler(authService)

	transactionRepo    := repositories.NewMongoTransactionRepository(db)
	transactionService := services.NewTransactionService(transactionRepo)
	transactionHandler := handlers.NewTransactionHandler(transactionService)

	analyticsRepo    := repositories.NewMongoAnalyticsRepository(db)
	analyticsService := services.NewAnalyticsService(analyticsRepo)
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsService)

	walletRepo    := repositories.NewMongoWalletRepository(db)
	walletService := services.NewWalletService(walletRepo)
	walletHandler := handlers.NewWalletHandler(walletService)

	categoryRepo    := repositories.NewMongoCategoryRepository(db)
	categoryService := services.NewCategoryService(categoryRepo)
	categoryHandler := handlers.NewCategoryHandler(categoryService, transactionService)
	_ = categoryService.EnsureDefaults(context.Background())

	cardDetailRepo    := repositories.NewMongoCardDetailRepository(db)
	cardDetailService := services.NewCardDetailService(cardDetailRepo)
	cardDetailHandler := handlers.NewCardDetailHandler(cardDetailService, transactionService)

	goalRepo    := repositories.NewMongoGoalRepository(db)
	goalService := services.NewGoalService(goalRepo)
	goalHandler := handlers.NewGoalHandler(goalService)

	recurringSvc     := services.NewRecurringService(transactionRepo)
	recurringHandler := handlers.NewRecurringHandler(recurringSvc)

	// ---- Rotas públicas ----
	authPublic := router.Group("/api/auth")
	{
		authPublic.POST("/register", authHandler.Register)
		authPublic.POST("/login",    authHandler.Login)
	}

	// ---- Rotas protegidas ----
	api := router.Group("/api")
	api.Use(middleware.Auth(authService))
	{
		api.GET("/auth/me", authHandler.Me)

		tx := api.Group("/transactions")
		{
			tx.GET("",               transactionHandler.GetAll)
			tx.GET("/summary",       transactionHandler.GetSummary)
			tx.GET("/:id",           transactionHandler.GetByID)
			tx.POST("",              transactionHandler.Create)
			tx.POST("/bulk-import",  transactionHandler.BulkImport)
			tx.PUT("/:id",           transactionHandler.Update)
			tx.DELETE("/:id",        transactionHandler.Delete)
			tx.GET("/:id/card-details",  cardDetailHandler.GetByTransaction)
			tx.POST("/:id/card-details", cardDetailHandler.Import)
		}

		api.GET("/analytics/overview", analyticsHandler.GetOverview)

		w := api.Group("/wallet")
		{
			w.GET("", walletHandler.Get)
			w.PUT("", walletHandler.Update)
		}

		cat := api.Group("/categories")
		{
			cat.GET("",              categoryHandler.GetAll)
			cat.POST("",             categoryHandler.Create)
			cat.DELETE("/:id",       categoryHandler.Delete)
			cat.POST("/bulk-update", categoryHandler.UpdateCategoryBulk)
		}

		goals := api.Group("/goals")
		{
			goals.GET("",        goalHandler.GetAll)
			goals.POST("",       goalHandler.Upsert)
			goals.DELETE("/:id", goalHandler.Delete)
		}

		api.POST("/recurring/process", recurringHandler.ProcessDue)
	}
}
