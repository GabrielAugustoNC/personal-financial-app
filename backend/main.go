package main

import (
	"context"
	"log"
	"time"

	"github.com/user/financas-api/config"
	"github.com/user/financas-api/repositories"
	"github.com/user/financas-api/routes"
	"github.com/user/financas-api/services"

	"github.com/gin-gonic/gin"
)

// main é o ponto de entrada da aplicação.
// Responsável por carregar configurações, conectar ao banco,
// processar recorrências pendentes e iniciar o servidor HTTP.
// Análogo ao Program.cs no .NET — bootstrap da aplicação.
func main() {
	// Carrega variáveis de ambiente do arquivo .env.
	cfg := config.Load()

	// Cria contexto com timeout para a inicialização.
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Conecta ao MongoDB.
	db, err := config.ConnectMongoDB(ctx, cfg)
	if err != nil {
		log.Fatalf("❌ Falha ao conectar ao MongoDB: %v", err)
	}

	log.Println("✅ Conectado ao MongoDB com sucesso")

	// Processa transações recorrentes vencidas no startup.
	// Garante que lançamentos pendentes sejam criados mesmo após
	// períodos de inatividade do servidor (ex: reinicializações).
	// Analogia .NET: IHostedService.StartAsync() com lógica de catch-up.
	txRepo := repositories.NewMongoTransactionRepository(db)
	recurringService := services.NewRecurringService(txRepo)
	if created, err := recurringService.ProcessDue(context.Background()); err != nil {
		log.Printf("⚠️  Erro ao processar recorrências: %v", err)
	} else if created > 0 {
		log.Printf("🔁 %d transações recorrentes criadas automaticamente", created)
	}

	// Inicializa o router Gin.
	router := gin.Default()

	// Registra todas as rotas e injeta as dependências.
	routes.Setup(router, db)

	log.Printf("🚀 Servidor rodando em http://localhost:%s\n", cfg.Port)

	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("❌ Falha ao iniciar servidor: %v", err)
	}
}
