// Pacote routes configura todas as rotas HTTP e faz o wiring manual de dependências.
// Em Go não há container DI automático — as dependências são construídas explicitamente.
// Esta abordagem torna o fluxo completamente transparente e fácil de depurar.
// Analogia .NET: Program.cs combinando builder.Services (DI) com app.MapControllers() (rotas)
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

// Setup registra todos os middlewares, constrói o grafo de dependências
// e mapeia cada handler para sua rota correspondente.
// Deve ser chamado uma única vez no main.go após a conexão com o banco.
// Analogia .NET: configuração completa do pipeline HTTP no Program.cs
func Setup(router *gin.Engine, db *mongo.Database) {
	// Configura o middleware de CORS para aceitar requisições do frontend React.
	// Permite origem local durante desenvolvimento (porta 5173 e 5174 do Vite).
	// Analogia .NET: app.UseCors(policy => policy.WithOrigins(...).AllowAnyMethod())
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:5174"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// ---- Auth — wiring independente (rotas públicas) ----
	userRepo    := repositories.NewMongoUserRepository(db)
	authService := services.NewAuthService(userRepo)
	authHandler := handlers.NewAuthHandler(authService)

	// ---- Composition Root — Construção do grafo de dependências ----
	// A ordem de construção é sempre: Repository → Service → Handler
	// Cada camada recebe a interface da camada inferior — nunca a implementação concreta.
	// Isso garante baixo acoplamento e facilita a substituição por mocks em testes.

	// Dependências de transações
	transactionRepo    := repositories.NewMongoTransactionRepository(db)
	transactionService := services.NewTransactionService(transactionRepo)
	transactionHandler := handlers.NewTransactionHandler(transactionService)

	// Dependências de analytics
	analyticsRepo    := repositories.NewMongoAnalyticsRepository(db)
	analyticsService := services.NewAnalyticsService(analyticsRepo)
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsService)

	// Dependências da carteira
	walletRepo    := repositories.NewMongoWalletRepository(db)
	walletService := services.NewWalletService(walletRepo)
	walletHandler := handlers.NewWalletHandler(walletService)

	// Dependências de categorias
	categoryRepo    := repositories.NewMongoCategoryRepository(db)
	categoryService := services.NewCategoryService(categoryRepo)
	categoryHandler := handlers.NewCategoryHandler(categoryService, transactionService)

	// Popula categorias padrão se a collection estiver vazia
	_ = categoryService.EnsureDefaults(context.Background())

	// Dependências de detalhes de cartão
	cardDetailRepo    := repositories.NewMongoCardDetailRepository(db)
	cardDetailService := services.NewCardDetailService(cardDetailRepo)
	cardDetailHandler := handlers.NewCardDetailHandler(cardDetailService, transactionService)

	// Dependências de metas financeiras
	goalRepo    := repositories.NewMongoGoalRepository(db)
	goalService := services.NewGoalService(goalRepo)
	goalHandler := handlers.NewGoalHandler(goalService)

	// Dependências de metas financeiras
	// GoalService depende de transactionRepo para calcular gastos reais do mês
	goalRepo    := repositories.NewMongoGoalRepository(db)
	goalService := services.NewGoalService(goalRepo, transactionRepo)
	goalHandler := handlers.NewGoalHandler(goalService)

	// Dependências de metas financeiras
	// GoalService precisa de transactionRepo para calcular gastos do mês atual
	goalRepo    := repositories.NewMongoGoalRepository(db)
	goalService := services.NewGoalService(goalRepo, transactionRepo)
	goalHandler := handlers.NewGoalHandler(goalService)

	// ---- Definição das rotas agrupadas por recurso ----
	// Rotas públicas de auth — não passam pelo middleware JWT
	authGroup := router.Group("/api/auth")
	{
		authGroup.POST("/register", authHandler.Register)
		authGroup.POST("/login",    authHandler.Login)
	}

	// Rotas protegidas — todas passam pelo middleware JWT
	api := router.Group("/api")
	api.Use(middleware.Auth(authService))
	{
		// Rotas de transações — CRUD completo + importação em massa
		tx := api.Group("/transactions")
		{
			tx.GET("",                transactionHandler.GetAll)
			tx.GET("/summary",        transactionHandler.GetSummary) // deve vir antes de /:id
			tx.GET("/:id",            transactionHandler.GetByID)
			tx.POST("",               transactionHandler.Create)
			tx.POST("/bulk-import",   transactionHandler.BulkImport)
			tx.PUT("/:id",            transactionHandler.Update)
			tx.DELETE("/:id",         transactionHandler.Delete)
		}

		// Rotas de analytics — métricas e projeções financeiras
		an := api.Group("/analytics")
		{
			an.GET("/overview", analyticsHandler.GetOverview) // aceita ?months=N
		}

		// Rotas da carteira — saldo manual do usuário (singleton)
		w := api.Group("/wallet")
		{
			w.GET("", walletHandler.Get)
			w.PUT("", walletHandler.Update)
		}

		// Rota protegida de auth — valida token e retorna dados do usuário
		api.GET("/auth/me", authHandler.Me)

		// Categorias — listagem, criação, remoção e propagação em massa
		cat := api.Group("/categories")
		{
			cat.GET("",             categoryHandler.GetAll)
			cat.POST("",            categoryHandler.Create)
			cat.DELETE("/:id",      categoryHandler.Delete)
			cat.POST("/bulk-update", categoryHandler.UpdateCategoryBulk)
		}

		// Detalhes de cartão — vinculados a uma transação específica
		tx.GET("/:id/card-details",  cardDetailHandler.GetByTransaction)
		tx.POST("/:id/card-details", cardDetailHandler.Import)

		// Metas financeiras por categoria
		goals := api.Group("/goals")
		{
			goals.GET("",      goalHandler.GetAll)
			goals.POST("",     goalHandler.Upsert)
			goals.DELETE("/:id", goalHandler.Delete)
		}

		// Metas financeiras por categoria
		goals := api.Group("/goals")
		{
			goals.GET("",                goalHandler.GetAll)
			goals.GET("/progress",       goalHandler.GetProgress)
			goals.POST("",               goalHandler.Upsert)
			goals.DELETE("/:category",   goalHandler.Delete)
		}

		// Metas financeiras — CRUD com progresso calculado em tempo real
		goals := api.Group("/goals")
		{
			goals.GET("",      goalHandler.GetAll)
			goals.POST("",     goalHandler.Create)
			goals.PUT("/:id",  goalHandler.Update)
			goals.DELETE("/:id", goalHandler.Delete)
		}
	}
}
