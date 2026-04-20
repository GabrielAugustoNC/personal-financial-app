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
func main() {
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	db, err := config.ConnectMongoDB(ctx, cfg)
	if err != nil {
		log.Fatalf("❌ Falha ao conectar ao MongoDB: %v", err)
	}

	log.Println("✅ Conectado ao MongoDB com sucesso")

	router := gin.Default()

	// Setup registra rotas, faz DI e processa recorrências no startup
	routes.Setup(router, db)

	log.Printf("🚀 Servidor rodando em http://localhost:%s\n", cfg.Port)

	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("❌ Falha ao iniciar servidor: %v", err)
	}
}
