// Pacote routes configura todas as rotas HTTP e faz o wiring manual de dependências.
// Em Go não há container DI automático — as dependências são construídas explicitamente.
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
// Chamado uma única vez em main.go após a conexão com o MongoDB.
func Setup(router *gin.Engine, db *mongo.Database) {

	// ---- CORS ----
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:5174"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// ---- Composition Root ----
	// Ordem obrigatória: Repository → Service → Handler
	// Cada camada depende da interface da camada inferior — nunca da implementação concreta.

	// Auth
	userRepo    := repositories.NewMongoUserRepository(db)
	authService := services.NewAuthService(userRepo)
	authHandler := handlers.NewAuthHandler(authService)

	// Transações
	transactionRepo    := repositories.NewMongoTransactionRepository(db)
	transactionService := services.NewTransactionService(transactionRepo)
	transactionHandler := handlers.NewTransactionHandler(transactionService)

	// Analytics
	analyticsRepo    := repositories.NewMongoAnalyticsRepository(db)
	analyticsService := services.NewAnalyticsService(analyticsRepo)
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsService)

	// Carteira
	walletRepo    := repositories.NewMongoWalletRepository(db)
	walletService := services.NewWalletService(walletRepo)
	walletHandler := handlers.NewWalletHandler(walletService)

	// Categorias — seed automático de 16 categorias padrão na primeira execução
	categoryRepo    := repositories.NewMongoCategoryRepository(db)
	categoryService := services.NewCategoryService(categoryRepo)
	categoryHandler := handlers.NewCategoryHandler(categoryService, transactionService)
	_ = categoryService.EnsureDefaults(context.Background())

	// Detalhes de cartão de crédito
	cardDetailRepo    := repositories.NewMongoCardDetailRepository(db)
	cardDetailService := services.NewCardDetailService(cardDetailRepo)
	cardDetailHandler := handlers.NewCardDetailHandler(cardDetailService, transactionService)

	// Metas financeiras — GoalRepository acessa transactions para calcular gastos do mês
	goalRepo    := repositories.NewMongoGoalRepository(db)
	goalService := services.NewGoalService(goalRepo)
	goalHandler := handlers.NewGoalHandler(goalService)

	// Recorrências — processa lançamentos automáticos vencidos
	recurringService := services.NewRecurringService(transactionRepo)
	recurringHandler := handlers.NewRecurringHandler(recurringService)

	// ---- Rotas públicas (sem JWT) ----
	authPublic := router.Group("/api/auth")
	{
		authPublic.POST("/register", authHandler.Register)
		authPublic.POST("/login",    authHandler.Login)
	}

	// ---- Rotas protegidas (exigem Bearer token válido) ----
	api := router.Group("/api")
	api.Use(middleware.Auth(authService))
	{
		// Auth — dados do usuário autenticado
		api.GET("/auth/me", authHandler.Me)

		// Transações — CRUD + importação + detalhes de cartão
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

		// Analytics — métricas e projeções
		api.GET("/analytics/overview", analyticsHandler.GetOverview)

		// Carteira — saldo manual (singleton)
		w := api.Group("/wallet")
		{
			w.GET("", walletHandler.Get)
			w.PUT("", walletHandler.Update)
		}

		// Categorias — CRUD + propagação em massa por similaridade
		cat := api.Group("/categories")
		{
			cat.GET("",              categoryHandler.GetAll)
			cat.POST("",             categoryHandler.Create)
			cat.DELETE("/:id",       categoryHandler.Delete)
			cat.POST("/bulk-update", categoryHandler.UpdateCategoryBulk)
		}

		// Metas financeiras — upsert por categoria + progresso em tempo real
		goals := api.Group("/goals")
		{
			goals.GET("",       goalHandler.GetAll)
			goals.POST("",      goalHandler.Upsert)
			goals.DELETE("/:id", goalHandler.Delete)
		}

		// Recorrências — trigger manual (startup já processa automaticamente)
		api.POST("/recurring/process", recurringHandler.ProcessDue)
	}
}
