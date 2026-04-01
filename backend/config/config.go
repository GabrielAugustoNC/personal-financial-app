package config

import (
	"context"
	"log"
	"os"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Config representa as configurações da aplicação.
// Analogia .NET: classe AppSettings / IConfiguration
type Config struct {
	MongoURI string
	DBName   string
	Port     string
}

// Load carrega as variáveis de ambiente do arquivo .env.
// Analogia .NET: builder.Configuration.GetSection("AppSettings")
func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  Arquivo .env não encontrado — usando variáveis de ambiente do sistema")
	}

	return &Config{
		MongoURI: getEnv("MONGO_URI", "mongodb://localhost:27017"),
		DBName:   getEnv("DB_NAME", "financas_db"),
		Port:     getEnv("PORT", "8080"),
	}
}

// ConnectMongoDB estabelece e valida a conexão com o banco de dados.
// Analogia .NET: DbContext + services.AddDbContext<T>()
func ConnectMongoDB(ctx context.Context, cfg *Config) (*mongo.Database, error) {
	clientOptions := options.Client().ApplyURI(cfg.MongoURI)

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, err
	}

	// Ping valida que a conexão está ativa
	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	return client.Database(cfg.DBName), nil
}

// getEnv retorna a variável de ambiente ou um valor padrão.
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
