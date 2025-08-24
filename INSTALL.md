# 🍎 Instalación en macOS

## 🚀 Instalación Rápida

```bash
# 1. Clonar el repositorio
git clone <repository-url>
cd bejaus-token-backend

# 2. Ejecutar configuración automática
npm run setup:mac
```

## 📋 Instalación Paso a Paso

### 1. Verificar Sistema

```bash
# Verificar que tu sistema cumple los requisitos
npm run check:system
```

### 2. Instalar Homebrew (si no está instalado)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 3. Instalar Node.js 20

```bash
brew install node@20
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### 4. Instalar PostgreSQL

```bash
brew install postgresql@15
brew services start postgresql@15
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### 5. Instalar Dependencias del Proyecto

```bash
npm install
```

### 6. Configurar Base de Datos

```bash
# Crear base de datos
createdb bejaus_token

# Generar cliente de Prisma
npm run prisma:generate

# Ejecutar migraciones
npm run prisma:migrate
```

### 7. Configurar Variables de Entorno

```bash
cp env.example .env
# Editar .env con tus credenciales
```

### 8. Ejecutar la Aplicación

```bash
npm run dev
```

## 🔧 Comandos Útiles

### Gestión de PostgreSQL

```bash
# Iniciar PostgreSQL
brew services start postgresql@15

# Detener PostgreSQL
brew services stop postgresql@15

# Ver estado
brew services list | grep postgresql

# Conectar a la base de datos
psql bejaus_token
```

### Gestión de Node.js

```bash
# Ver versión instalada
node --version

# Cambiar versión si es necesario
brew unlink node
brew link node@20
```

### Limpieza y Mantenimiento

```bash
# Limpiar cache de npm
npm cache clean --force

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# Actualizar Homebrew
brew update && brew upgrade
```

## 🚨 Solución de Problemas

### Error: "Permission denied" en scripts

```bash
chmod +x scripts/*.sh
```

### Error: PostgreSQL no inicia

```bash
brew services restart postgresql@15
```

### Error: Node.js versión incorrecta

```bash
brew unlink node
brew link node@20
source ~/.zshrc
```

### Error: PATH no actualizado

```bash
source ~/.zshrc
# o reiniciar la terminal
```

### Error: Dependencias de Thirdweb

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 📱 Verificación Final

Después de la instalación, verifica que todo funcione:

```bash
# 1. Verificar sistema
npm run check:system

# 2. Verificar base de datos
psql bejaus_token -c "\dt"

# 3. Verificar aplicación
npm run dev
```

La aplicación debería estar ejecutándose en `http://localhost:3000`

## 🆘 Soporte

Si encuentras problemas:

1. Ejecuta `npm run check:system` y comparte la salida
2. Verifica los logs de PostgreSQL: `brew services list`
3. Revisa el archivo `.env` y asegúrate de que las credenciales sean correctas
4. Crea un issue en GitHub con el error específico

---

**¡Listo para desarrollar en macOS! 🚀**

