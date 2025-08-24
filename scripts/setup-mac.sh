#!/bin/bash

echo "🍎 Configurando Bejaus Studio Token Backend en macOS..."

# Verificar Homebrew
if ! command -v brew &> /dev/null; then
    echo "⚠️  Homebrew no está instalado"
    echo "📦 Instalando Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    if [ $? -ne 0 ]; then
        echo "❌ Error al instalar Homebrew"
        exit 1
    fi
    
    echo "✅ Homebrew instalado correctamente"
else
    echo "✅ Homebrew detectado: $(brew --version)"
fi

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js 20..."
    brew install node@20
    
    if [ $? -ne 0 ]; then
        echo "❌ Error al instalar Node.js"
        exit 1
    fi
    
    # Agregar Node.js 20 al PATH
    echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
    source ~/.zshrc
else
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        echo "⚠️  Actualizando Node.js a versión 20..."
        brew upgrade node@20
    fi
fi

echo "✅ Node.js $(node -v) detectado"

# Verificar PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "📦 Instalando PostgreSQL..."
    brew install postgresql@15
    
    if [ $? -ne 0 ]; then
        echo "❌ Error al instalar PostgreSQL"
        exit 1
    fi
    
    # Iniciar PostgreSQL
    brew services start postgresql@15
    
    # Agregar PostgreSQL al PATH
    echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
    source ~/.zshrc
    
    echo "✅ PostgreSQL instalado y iniciado"
else
    echo "✅ PostgreSQL detectado: $(psql --version)"
fi

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado"
    exit 1
fi

echo "✅ npm $(npm -v) detectado"

# Instalar dependencias
echo "📦 Instalando dependencias del proyecto..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error al instalar dependencias"
    exit 1
fi

echo "✅ Dependencias instaladas correctamente"

# Generar cliente de Prisma
echo "🗄️ Generando cliente de Prisma..."
npm run prisma:generate

if [ $? -ne 0 ]; then
    echo "❌ Error al generar cliente de Prisma"
    exit 1
fi

echo "✅ Cliente de Prisma generado"

# Verificar archivo .env
if [ ! -f .env ]; then
    echo "⚠️  Archivo .env no encontrado"
    echo "📝 Copiando archivo de ejemplo..."
    cp env.example .env
    echo "✅ Archivo .env creado. Por favor edítalo con tus valores."
else
    echo "✅ Archivo .env encontrado"
fi

# Crear base de datos si no existe
echo "🗄️ Configurando base de datos..."
DB_NAME="bejaus_token"
if ! psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "📝 Creando base de datos '$DB_NAME'..."
    createdb $DB_NAME
    echo "✅ Base de datos creada"
else
    echo "✅ Base de datos '$DB_NAME' ya existe"
fi

echo ""
echo "🎉 Configuración completada en macOS!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Edita el archivo .env con tus credenciales"
echo "2. Ejecuta: npm run prisma:migrate"
echo "3. Ejecuta: npm run dev"
echo ""
echo "🔧 Comandos útiles:"
echo "- Iniciar PostgreSQL: brew services start postgresql@15"
echo "- Detener PostgreSQL: brew services stop postgresql@15"
echo "- Ver estado PostgreSQL: brew services list | grep postgresql"
echo ""
echo "📚 Para más información, consulta el README.md"

