package routes

import (
	"github.com/user/financas-api/handlers"
	"github.com/user/financas-api/repositories"
	"github.com/user/financas-api/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
)

// Setup configura todas as rotas e faz o wiring de dependências.
//
// Analogia .NET: Program.cs — combinação de:
//   - builder.Services.AddScoped<IRepo, Repo>() (injeção de dependência)
//   - app.MapControllers() (roteamento)
//
// Em Go, não há container DI automático. O wiring é feito manualmente,
// o que torna o fluxo mais explícito e fácil de depurar.
func Setup(router *gin.Engine, db *mongo.Database) {
	// CORS — permite que o frontend React em localhost:5173 acesse a API
	// Analogia .NET: app.UseCors(policy => policy.WithOrigins("..."))
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// ---- Wiring de Dependências (Composition Root) ----
	transactionRepo    := repositories.NewMongoTransactionRepository(db)
	transactionService := services.NewTransactionService(transactionRepo)
	transactionHandler := handlers.NewTransactionHandler(transactionService)

	analyticsRepo    := repositories.NewMongoAnalyticsRepository(db)
	analyticsService := services.NewAnalyticsService(analyticsRepo)
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsService)

	// ---- Definição de Rotas ----
	api := router.Group("/api")
	{
		tx := api.Group("/transactions")
		{
			tx.GET("",                transactionHandler.GetAll)
			tx.GET("/summary",        transactionHandler.GetSummary)
			tx.GET("/:id",            transactionHandler.GetByID)
			tx.POST("",               transactionHandler.Create)
			tx.POST("/bulk-import",   transactionHandler.BulkImport)
			tx.PUT("/:id",            transactionHandler.Update)
			tx.DELETE("/:id",         transactionHandler.Delete)
		}

		an := api.Group("/analytics")
		{
			an.GET("/overview", analyticsHandler.GetOverview)
		}
	}
}
