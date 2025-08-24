#!/bin/bash

echo "🚀 Configurando Bejaus Studio Token Backend..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js 20 o superior."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Se requiere Node.js 20 o superior. Versión actual: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detectado"

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado."
    exit 1
fi

echo "✅ npm $(npm -v) detectado"

# Instalar dependencias
echo "📦 Instalando dependencias..."
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

echo ""
echo "🎉 Configuración completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Edita el archivo .env con tus credenciales"
echo "2. Configura tu base de datos PostgreSQL"
echo "3. Ejecuta: npm run prisma:migrate"
echo "4. Ejecuta: npm run dev"
echo ""
echo "📚 Para más información, consulta el README.md"

