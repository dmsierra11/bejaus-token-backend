# 🚀 Inicio Rápido - Bejaus Studio Token

## ⚡ Instalación en 3 pasos

```bash
# 1. Clonar y entrar
git clone <repository-url>
cd bejaus-token-backend

# 2. Configuración automática
make setup

# 3. Ejecutar
make dev
```

## 🔧 Comandos esenciales

```bash
make help      # Ver todos los comandos
make setup     # Configuración completa
make dev       # Desarrollo
make build     # Compilar
make start     # Producción
make migrate   # Migrar base de datos
make studio    # Prisma Studio
```

## 📋 Flujo completo de desarrollo

```bash
# Configuración inicial
make setup

# Editar variables de entorno
nano .env

# Crear y migrar base de datos
make db-create
make migrate

# Desarrollo
make dev

# En otra terminal: Prisma Studio
make studio
```

## 🗄️ Gestión de base de datos

```bash
make db-start   # Iniciar PostgreSQL
make db-stop    # Detener PostgreSQL
make db-create  # Crear base de datos
make migrate    # Ejecutar migraciones
make generate   # Generar cliente Prisma
```

## 🔍 Verificar sistema

```bash
make check      # Estado del sistema
make clean      # Limpiar archivos
make reset      # Reinstalar todo
```

---

**¡Listo! Tu API estará ejecutándose en `http://localhost:3000`** 🎉

