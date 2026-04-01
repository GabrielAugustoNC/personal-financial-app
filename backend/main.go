package main

import (
	"context"
	"log"
	"time"

	"github.com/user/financas-api/config"
	"github.com/user/financas-api/routes"

	"github.com/gin-gonic/gin"
)

func main() {
	// Carrega configurações do arquivo .env
	// Analogia .NET: builder.Configuration / appsettings.json
	cfg := config.Load()

	// Conecta ao MongoDB com timeout de 10 segundos
	// Analogia .NET: services.AddDbContext<AppDbContext>()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := config.ConnectMongoDB(ctx, cfg)
	if err != nil {
		log.Fatalf("❌ Falha ao conectar ao MongoDB: %v", err)
	}

	log.Println("✅ Conectado ao MongoDB com sucesso")

	// Inicializa o router Gin (equivalente ao WebApplication do .NET)
	router := gin.Default()

	// Configura todas as rotas e injeta dependências
	// Analogia .NET: Program.cs — app.MapControllers() + DI setup
	routes.Setup(router, db)

	log.Printf("🚀 Servidor rodando em http://localhost:%s\n", cfg.Port)

	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("❌ Falha ao iniciar servidor: %v", err)
	}
}
