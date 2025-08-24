# PostgreSQL Setup Tutorial

This tutorial will guide you through setting up PostgreSQL for the Bejaus Token project.

## Prerequisites

- macOS (for this tutorial)
- Homebrew installed
- Basic terminal knowledge

## Step 1: Install PostgreSQL

### Using Homebrew (Recommended)

```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Verify installation
psql --version
```

### Alternative: Download from Official Site

Visit [postgresql.org](https://www.postgresql.org/download/macosx/) and download the installer.

## Step 2: Create Database and User

```bash
# Connect to PostgreSQL as superuser
psql postgres

# Create a new user (replace 'bejaus_user' with your preferred username)
CREATE USER bejaus_user WITH PASSWORD 'your_secure_password';

# Create the database
CREATE DATABASE bejaus_token;

# Grant privileges to the user
GRANT ALL PRIVILEGES ON DATABASE bejaus_token TO bejaus_user;

# Connect to the new database
\c bejaus_token

# Grant schema privileges
GRANT ALL ON SCHEMA public TO bejaus_user;

# Exit psql
\q
```

## Step 3: Configure Environment Variables

Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

Update the `.env` file with your database credentials:

```env
DATABASE_URL="postgresql://bejaus_user:your_secure_password@localhost:5432/bejaus_token"
```

## Step 4: Install Prisma CLI

```bash
# Install Prisma CLI globally
npm install -g prisma

# Or use npx
npx prisma --version
```

## Step 5: Initialize and Migrate Database

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migrations
npx prisma migrate dev --name init

# Verify the database structure
npx prisma studio
```

## Step 6: Verify Setup

```bash
# Check database connection
npx prisma db pull

# View database schema
npx prisma format
```

## Troubleshooting

### Common Issues

1. **Connection Refused**

   ```bash
   # Check if PostgreSQL is running
   brew services list | grep postgresql

   # Restart if needed
   brew services restart postgresql@15
   ```

2. **Permission Denied**

   ```bash
   # Check user permissions
   psql -U bejaus_user -d bejaus_token -c "\du"
   ```

3. **Port Already in Use**

   ```bash
   # Check what's using port 5432
   lsof -i :5432

   # Kill process if needed
   kill -9 <PID>
   ```

### Reset Database (Development Only)

```bash
# Drop and recreate database
npx prisma migrate reset

# Or manually
dropdb bejaus_token
createdb bejaus_token
```

## Security Best Practices

1. **Use Strong Passwords**: Generate secure passwords for database users
2. **Limit Network Access**: Only allow local connections in development
3. **Regular Backups**: Set up automated database backups
4. **Update Regularly**: Keep PostgreSQL updated for security patches

## Production Considerations

1. **Connection Pooling**: Use PgBouncer for connection management
2. **SSL**: Enable SSL connections in production
3. **Monitoring**: Set up database monitoring and alerting
4. **Backup Strategy**: Implement automated backup and recovery procedures

## Next Steps

Once PostgreSQL is configured, proceed to:

- [JWT Configuration](./02-jwt-setup.md)
- [Stripe Setup](./03-stripe-setup.md)
- [ThirdWeb Configuration](./04-thirdweb-setup.md)

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Homebrew PostgreSQL](https://formulae.brew.sh/formula/postgresql@15)
