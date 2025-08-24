#!/bin/bash

echo "🔍 Verificando sistema macOS..."

# Verificar versión de macOS
MACOS_VERSION=$(sw_vers -productVersion)
echo "🍎 macOS: $MACOS_VERSION"

# Verificar arquitectura
ARCH=$(uname -m)
echo "🏗️  Arquitectura: $ARCH"

# Verificar Homebrew
if command -v brew &> /dev/null; then
    echo "✅ Homebrew: $(brew --version | head -n1)"
else
    echo "❌ Homebrew: No instalado"
fi

# Verificar Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node -v)"
    echo "✅ npm: $(npm -v)"
else
    echo "❌ Node.js: No instalado"
fi

# Verificar PostgreSQL
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL: $(psql --version)"
    
    # Verificar si está ejecutándose
    if brew services list | grep -q "postgresql.*started"; then
        echo "✅ PostgreSQL: Ejecutándose"
    else
        echo "⚠️  PostgreSQL: No ejecutándose"
    fi
else
    echo "❌ PostgreSQL: No instalado"
fi

# Verificar Git
if command -v git &> /dev/null; then
    echo "✅ Git: $(git --version)"
else
    echo "❌ Git: No instalado"
fi

# Verificar Xcode Command Line Tools
if xcode-select -p &> /dev/null; then
    echo "✅ Xcode Command Line Tools: Instalado"
else
    echo "❌ Xcode Command Line Tools: No instalado"
fi

# Verificar espacio en disco
DISK_SPACE=$(df -h / | tail -1 | awk '{print $4}')
echo "💾 Espacio libre en disco: $DISK_SPACE"

# Verificar memoria RAM
RAM=$(system_profiler SPHardwareDataType | grep "Memory:" | awk '{print $2}')
echo "🧠 Memoria RAM: $RAM"

echo ""
echo "📋 Resumen de verificación completado"

