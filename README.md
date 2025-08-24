# Bejaus Studio Token Backend

Backend MVP para "Bejaus Studio Token" - Una plataforma de tokens ERC20 en Polygon con sistema de pagos, perks y gobernanza.

## 🚀 Características

- **Autenticación**: Sistema de login/registro con JWT
- **Pagos**: Integración con Stripe para compra de tokens
- **Blockchain**: Mint de tokens ERC20 en Polygon usando Thirdweb
- **Perks**: Sistema de recompensas canjeables con QR codes
- **Gobernanza**: Sistema de votaciones para holders de tokens
- **Transparencia**: Ledger completo de todas las transacciones
- **API REST**: Endpoints bien documentados y validados

## 🛠️ Stack Tecnológico

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL con Prisma ORM
- **Payments**: Stripe
- **Blockchain**: Thirdweb SDK (Polygon)
- **Validation**: Zod
- **Security**: Helmet, CORS, Rate Limiting

## 📋 Prerrequisitos

- Node.js 20 o superior
- PostgreSQL 12 o superior
- Cuenta de Stripe (para pagos)
- Cuenta de Thirdweb (para blockchain)

### 🍎 Requisitos Específicos para macOS

- **Homebrew** (gestor de paquetes)
- **zsh** (shell por defecto en macOS moderno)
- **Xcode Command Line Tools** (para compilación)

## 🚀 Instalación

### 🍎 Instalación Rápida con Make

```bash
# Clonar el repositorio
git clone <repository-url>
cd bejaus-token-backend

# Configuración automática completa
make setup
```

### 📋 Instalación Manual

#### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd bejaus-token-backend
```

#### 2. Instalar dependencias

```bash
npm install
```

#### 3. Configurar variables de entorno

```bash
cp env.example .env
```

Editar `.env` con tus valores:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/bejaus_token"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Thirdweb
THIRDWEB_PRIVATE_KEY="0x..."
CONTRACT_ADDRESS="0x..."

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"

# Server
PORT=3000
NODE_ENV=development
```

#### 4. Configurar base de datos

```bash
# Generar cliente de Prisma
make generate

# Ejecutar migraciones
make migrate
```

#### 5. Ejecutar la aplicación

```bash
# Desarrollo
make dev

# Producción
make build
make start
```

## 📚 Scripts Disponibles

### 🚀 Comandos Principales

- `npm run dev` - Ejecutar en modo desarrollo con hot reload
- `npm run build` - Compilar TypeScript a JavaScript
- `npm start` - Ejecutar versión compilada
- `npm run setup` - Configuración completa del proyecto

### 🗄️ Base de Datos

- `npm run prisma:migrate` - Ejecutar migraciones de base de datos
- `npm run prisma:generate` - Generar cliente de Prisma
- `npm run prisma:studio` - Abrir Prisma Studio

## 🔧 Comandos Make (Recomendados)

### 📋 Ver todos los comandos disponibles

```bash
make help
```

### 🚀 Configuración y desarrollo

```bash
make setup      # Configuración completa
make install    # Solo instalar dependencias
make dev        # Ejecutar en desarrollo
make build      # Compilar proyecto
make start      # Ejecutar versión compilada
```

### 🗄️ Gestión de base de datos

```bash
make migrate    # Ejecutar migraciones
make generate   # Generar cliente Prisma
make studio     # Abrir Prisma Studio
make db-create  # Crear base de datos
make db-start   # Iniciar PostgreSQL
make db-stop    # Detener PostgreSQL
```

### 🔍 Utilidades

```bash
make check      # Verificar sistema
make clean      # Limpiar archivos generados
make reset      # Reinstalación completa
```

## 🗄️ Estructura de la Base de Datos

### Tablas Principales

- **users** - Usuarios del sistema
- **products** - Productos de tokens disponibles
- **orders** - Órdenes de compra
- **payments** - Pagos procesados
- **mints** - Tokens minteados
- **perks** - Recompensas disponibles
- **perk_claims** - Claims de perks por usuarios
- **votes** - Votaciones de gobernanza
- **vote_options** - Opciones de voto
- **vote_ballots** - Votos emitidos
- **ledger** - Registro de transparencia

## 🔌 Endpoints de la API

### Autenticación

- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `GET /api/auth/me` - Obtener usuario actual

### Pagos

- `POST /api/payments/checkout` - Crear checkout Stripe
- `POST /api/payments/webhook` - Webhook de Stripe
- `GET /api/payments/orders` - Órdenes del usuario

### Tokens

- `GET /api/tokens/balance` - Saldo de tokens
- `GET /api/tokens/info` - Información del token
- `POST /api/tokens/mint` - Mint de tokens (admin)
- `POST /api/tokens/transfer` - Transferir tokens

### Perks

- `GET /api/perks` - Listar perks disponibles
- `POST /api/perks/claim` - Reclamar perk
- `POST /api/perks/redeem` - Canjear perk (staff)

### Votaciones

- `GET /api/votes` - Listar votaciones activas
- `POST /api/votes/:id/ballot` - Emitir voto
- `GET /api/votes/:id/results` - Resultados de votación

### Transparencia

- `GET /api/transparency/summary` - Resumen del ledger
- `GET /api/transparency/ledger` - Entradas del ledger
- `GET /api/transparency/export/csv` - Exportar a CSV

## 🔐 Sistema de Permisos

### Roles de Usuario

- **Usuario regular**: Puede comprar tokens, reclamar perks, votar
- **Staff**: Puede canjear perks, ver claims
- **Admin**: Acceso completo (mint tokens, crear perks, gestionar votaciones)

### Verificación de Permisos

Los permisos se verifican por email:

- `admin@example.com` → Permisos de administrador
- `staff@example.com` → Permisos de staff
- Otros emails → Usuario regular

## 💳 Flujo de Pagos

1. Usuario selecciona producto de tokens
2. Se crea orden en estado "pending"
3. Se genera sesión de checkout de Stripe
4. Usuario completa pago en Stripe
5. Webhook de Stripe actualiza orden a "completed"
6. Se ejecuta mint de tokens en Polygon
7. Se registra transacción en ledger

## 🎯 Casos de Uso

### Compra de Tokens

```bash
# 1. Login
POST /api/auth/login
{"email": "user@example.com"}

# 2. Crear checkout
POST /api/payments/checkout
{"productId": "product_id"}
Authorization: Bearer <jwt_token>

# 3. Completar pago en Stripe
# 4. Tokens se mintean automáticamente
```

### Reclamar Perk

```bash
# 1. Ver perks disponibles
GET /api/perks

# 2. Reclamar perk
POST /api/perks/claim
{"perkId": "perk_id"}
Authorization: Bearer <jwt_token>

# 3. Staff canjea perk
POST /api/perks/redeem
{"claimId": "claim_id"}
Authorization: Bearer <staff_jwt_token>
```

### Votación

```bash
# 1. Ver votaciones activas
GET /api/votes

# 2. Emitir voto
POST /api/votes/:vote_id/ballot
{"optionId": "option_id"}
Authorization: Bearer <jwt_token>

# 3. Ver resultados
GET /api/votes/:vote_id/results
```

## 🧪 Testing

```bash
# Ejecutar tests (cuando estén implementados)
npm test

# Tests en modo watch
npm run test:watch
```

## 📊 Monitoreo

### Health Check

```bash
GET /health
```

### Logs

La aplicación incluye logging estructurado con niveles:

- ERROR: Errores críticos
- WARN: Advertencias
- INFO: Información general
- DEBUG: Información detallada (solo en desarrollo)

### Métricas

- Rate limiting por IP
- Logs de todas las operaciones
- Auditoría completa en ledger

## 🚀 Despliegue

### Variables de Entorno de Producción

```env
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
THIRDWEB_PRIVATE_KEY="0x..."
CONTRACT_ADDRESS="0x..."
JWT_SECRET="very-long-secure-secret"
```

### Docker (opcional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Para soporte técnico o preguntas:

- Crear un issue en GitHub
- Contactar al equipo de desarrollo

## 🔧 Troubleshooting en macOS

### Problema: Error de permisos con scripts

```bash
chmod +x scripts/*.sh
```

### Problema: PostgreSQL no inicia

```bash
brew services restart postgresql@15
```

### Problema: Node.js versión incorrecta

```bash
brew unlink node
brew link node@20
```

### Problema: PATH no actualizado

```bash
source ~/.zshrc
# o reiniciar la terminal
```

### Problema: Dependencias de Thirdweb

```bash
# Limpiar cache de npm
npm cache clean --force

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

## 🔮 Roadmap

- [ ] Tests automatizados
- [ ] Documentación con Swagger/OpenAPI
- [ ] Dashboard de administración
- [ ] Notificaciones push
- [ ] Integración con más blockchains
- [ ] Sistema de referidos
- [ ] Analytics avanzados

---

**Bejaus Studio Token** - Construyendo el futuro de la gobernanza descentralizada 🚀
