// Pacote config centraliza o carregamento de variáveis de ambiente
// e a inicialização da conexão com o MongoDB.
// Analogia .NET: appsettings.json + IConfiguration + AddDbContext
package config

import (
	"context"
	"log"
	"os"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Config agrupa todas as configurações necessárias para a aplicação.
// Os valores são carregados do arquivo .env ou de variáveis de ambiente do sistema.
// Analogia .NET: classe de opções tipadas (IOptions<AppSettings>)
type Config struct {
	MongoURI string // URI de conexão com o MongoDB
	DBName   string // Nome do banco de dados
	Port     string // Porta HTTP do servidor
}

// Load lê o arquivo .env e retorna uma instância de Config preenchida.
// Caso o arquivo não exista, usa as variáveis de ambiente do sistema operacional.
// Analogia .NET: builder.Configuration.GetSection("AppSettings").Get<AppSettings>()
func Load() *Config {
	// Tenta carregar o .env — ignora silenciosamente se não existir (ex: produção)
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  Arquivo .env não encontrado — usando variáveis de ambiente do sistema")
	}

	return &Config{
		MongoURI: getEnv("MONGO_URI", "mongodb://localhost:27017"),
		DBName:   getEnv("DB_NAME", "financas_db"),
		Port:     getEnv("PORT", "8080"),
	}
}

// ConnectMongoDB cria e valida a conexão com o banco de dados MongoDB.
// Recebe um contexto para respeitar o timeout definido pelo chamador.
// Retorna o objeto *mongo.Database pronto para uso nos repositórios.
// Analogia .NET: DbContext + services.AddDbContext<T>(options => options.UseMongoDB(...))
func ConnectMongoDB(ctx context.Context, cfg *Config) (*mongo.Database, error) {
	clientOptions := options.Client().ApplyURI(cfg.MongoURI)

	// Cria o cliente — ainda não abre a conexão de rede
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, err
	}

	// Ping confirma que o servidor está acessível e a conexão está ativa
	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	return client.Database(cfg.DBName), nil
}

// getEnv retorna o valor de uma variável de ambiente ou o valor padrão
// caso a variável não esteja definida ou esteja vazia.
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
