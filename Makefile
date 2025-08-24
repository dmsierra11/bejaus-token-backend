# Bejaus Studio Token Backend - Makefile
.PHONY: help install setup dev build start clean test migrate generate studio check

# Variables
NODE_VERSION := 20
DB_NAME := bejaus_token
PORT := 3000

# Colores para output
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Mostrar esta ayuda
	@echo "$(GREEN)Bejaus Studio Token Backend - Comandos disponibles:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""

install: ## Instalar dependencias del proyecto
	@echo "$(GREEN)📦 Instalando dependencias...$(NC)"
	npm install
	@echo "$(GREEN)✅ Dependencias instaladas$(NC)"

setup: install ## Configuración completa del proyecto
	@echo "$(GREEN)🚀 Configurando proyecto...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)📝 Copiando archivo de variables de entorno...$(NC)"; \
		cp env.example .env; \
		echo "$(GREEN)✅ Archivo .env creado. Edítalo con tus credenciales.$(NC)"; \
	else \
		echo "$(GREEN)✅ Archivo .env ya existe$(NC)"; \
	fi
	@echo "$(GREEN)🗄️ Generando cliente de Prisma...$(NC)"
	npm run prisma:generate
	@echo "$(GREEN)✅ Configuración completada$(NC)"
	@echo "$(YELLOW)📋 Próximos pasos:$(NC)"
	@echo "  1. Edita el archivo .env con tus credenciales"
	@echo "  2. Ejecuta: make migrate"
	@echo "  3. Ejecuta: make dev"

dev: ## Ejecutar en modo desarrollo
	@echo "$(GREEN)🚀 Iniciando servidor de desarrollo...$(NC)"
	npm run dev

build: ## Compilar proyecto
	@echo "$(GREEN)🔨 Compilando proyecto...$(NC)"
	npm run build
	@echo "$(GREEN)✅ Compilación completada$(NC)"

start: build ## Ejecutar versión compilada
	@echo "$(GREEN)🚀 Iniciando servidor...$(NC)"
	npm start

clean: ## Limpiar archivos generados
	@echo "$(GREEN)🧹 Limpiando archivos...$(NC)"
	rm -rf dist/
	rm -rf node_modules/
	rm -f package-lock.json
	@echo "$(GREEN)✅ Limpieza completada$(NC)"

test: ## Ejecutar tests
	@echo "$(GREEN)🧪 Ejecutando tests...$(NC)"
	@if [ -f "package.json" ] && grep -q '"test"' package.json; then \
		npm test; \
	else \
		echo "$(YELLOW)⚠️  No hay tests configurados$(NC)"; \
	fi

migrate: ## Ejecutar migraciones de base de datos
	@echo "$(GREEN)🗄️ Ejecutando migraciones...$(NC)"
	npm run prisma:migrate
	@echo "$(GREEN)✅ Migraciones completadas$(NC)"

generate: ## Generar cliente de Prisma
	@echo "$(GREEN)🔧 Generando cliente de Prisma...$(NC)"
	npm run prisma:generate
	@echo "$(GREEN)✅ Cliente generado$(NC)"

studio: ## Abrir Prisma Studio
	@echo "$(GREEN)🎨 Abriendo Prisma Studio...$(NC)"
	npm run prisma:studio

check: ## Verificar sistema y dependencias
	@echo "$(GREEN)🔍 Verificando sistema...$(NC)"
	@echo "$(YELLOW)Node.js:$(NC) $(shell node --version 2>/dev/null || echo 'No instalado')"
	@echo "$(YELLOW)npm:$(NC) $(shell npm --version 2>/dev/null || echo 'No instalado')"
	@echo "$(YELLOW)PostgreSQL:$(NC) $(shell psql --version 2>/dev/null || echo 'No instalado')"
	@echo "$(YELLOW)Base de datos:$(NC) $(shell psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw $(DB_NAME) && echo 'Existe' || echo 'No existe')"
	@if [ -f .env ]; then \
		echo "$(YELLOW)Variables de entorno:$(NC) ✅ Configurado"; \
	else \
		echo "$(YELLOW)Variables de entorno:$(NC) ❌ No configurado"; \
	fi

db-create: ## Crear base de datos
	@echo "$(GREEN)🗄️ Creando base de datos '$(DB_NAME)'...$(NC)"
	@if command -v createdb >/dev/null 2>&1; then \
		createdb $(DB_NAME) 2>/dev/null && echo "$(GREEN)✅ Base de datos creada$(NC)" || echo "$(YELLOW)⚠️  Base de datos ya existe o error$(NC)"; \
	else \
		echo "$(RED)❌ Comando 'createdb' no disponible. Instala PostgreSQL.$(NC)"; \
	fi

db-start: ## Iniciar PostgreSQL (macOS con Homebrew)
	@echo "$(GREEN)🚀 Iniciando PostgreSQL...$(NC)"
	@if command -v brew >/dev/null 2>&1; then \
		brew services start postgresql@15 2>/dev/null && echo "$(GREEN)✅ PostgreSQL iniciado$(NC)" || echo "$(YELLOW)⚠️  PostgreSQL ya está ejecutándose o error$(NC)"; \
	else \
		echo "$(RED)❌ Homebrew no disponible. Inicia PostgreSQL manualmente.$(NC)"; \
	fi

db-stop: ## Detener PostgreSQL (macOS con Homebrew)
	@echo "$(GREEN)🛑 Deteniendo PostgreSQL...$(NC)"
	@if command -v brew >/dev/null 2>&1; then \
		brew services stop postgresql@15 2>/dev/null && echo "$(GREEN)✅ PostgreSQL detenido$(NC)" || echo "$(YELLOW)⚠️  Error al detener PostgreSQL$(NC)"; \
	else \
		echo "$(RED)❌ Homebrew no disponible. Detén PostgreSQL manualmente.$(NC)"; \
	fi

reset: clean install ## Reinstalar completamente
	@echo "$(GREEN)🔄 Reinstalación completada$(NC)"

# Comando por defecto
.DEFAULT_GOAL := help

