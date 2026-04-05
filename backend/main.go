package main

import (
	"context"
	"log"
	"time"

	"github.com/user/financas-api/config"
	"github.com/user/financas-api/routes"

	"github.com/gin-gonic/gin"
)

// main é o ponto de entrada da aplicação.
// Responsável por carregar configurações, conectar ao banco de dados
// e iniciar o servidor HTTP com todas as rotas configuradas.
// Análogo ao Program.cs no .NET — bootstrap da aplicação.
func main() {
	// Carrega variáveis de ambiente do arquivo .env.
	// Analogia .NET: builder.Configuration / appsettings.json
	cfg := config.Load()

	// Cria contexto com timeout de 10 segundos para a conexão inicial.
	// Em Go, contextos controlam cancelamento e prazos de operações assíncronas.
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Estabelece conexão com o MongoDB e valida com ping.
	// Analogia .NET: services.AddDbContext<AppDbContext>()
	db, err := config.ConnectMongoDB(ctx, cfg)
	if err != nil {
		log.Fatalf("❌ Falha ao conectar ao MongoDB: %v", err)
	}

	log.Println("✅ Conectado ao MongoDB com sucesso")

	// Inicializa o router Gin — framework HTTP leve e performático.
	// Analogia .NET: WebApplication.CreateBuilder().Build()
	router := gin.Default()

	// Registra todas as rotas e injeta as dependências (DI manual).
	// Analogia .NET: Program.cs — app.MapControllers() + builder.Services
	routes.Setup(router, db)

	log.Printf("🚀 Servidor rodando em http://localhost:%s\n", cfg.Port)

	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("❌ Falha ao iniciar servidor: %v", err)
	}
}
