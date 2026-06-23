# EduConnect Production Deployment Script
Write-Host 'Starting EduConnect Production Deployment...' -ForegroundColor Green

# Check if .env.production exists
if (-not (Test-Path .env.production)) {
    Write-Host 'ERROR: .env.production not found!' -ForegroundColor Red
    Write-Host 'Create .env.production from .env.production.example' -ForegroundColor Yellow
    exit 1
}

# Build and start services
Write-Host 'Building Docker images...' -ForegroundColor Cyan
docker-compose -f docker-compose.yml build

Write-Host 'Starting services...' -ForegroundColor Cyan
docker-compose -f docker-compose.yml up -d

Write-Host 'Running database migrations...' -ForegroundColor Cyan
docker-compose exec api npx prisma migrate deploy

Write-Host 'Deployment complete!' -ForegroundColor Green
Write-Host 'API: http://localhost:3000' -ForegroundColor White
Write-Host 'Mobile: http://localhost' -ForegroundColor White
Write-Host 'Health Check: http://localhost:3000/health' -ForegroundColor White
