#!/bin/bash

# Script de setup initial pour MangaTech
# Vérifie les prérequis et configure l'environnement

set -e

echo "========================================="
echo "🚀 MangaTech - Setup Script"
echo "========================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de vérification
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✅ $1 is installed${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 is NOT installed${NC}"
        return 1
    fi
}

# Vérification des prérequis
echo -e "${BLUE}📋 Checking prerequisites...${NC}"
echo ""

MISSING_DEPS=0

check_command node || MISSING_DEPS=1
check_command npm || MISSING_DEPS=1
check_command docker || MISSING_DEPS=1
check_command docker-compose || MISSING_DEPS=1

echo ""

if [ $MISSING_DEPS -eq 1 ]; then
    echo -e "${RED}⚠️  Missing dependencies. Please install them first.${NC}"
    echo ""
    echo "Install instructions:"
    echo "  - Node.js: https://nodejs.org/"
    echo "  - Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Vérification des versions
echo -e "${BLUE}📊 Versions:${NC}"
echo "  Node: $(node --version)"
echo "  npm: $(npm --version)"
echo "  Docker: $(docker --version | cut -d' ' -f3)"
echo ""

# Création des fichiers .env si nécessaires
echo -e "${BLUE}📝 Creating environment files...${NC}"

if [ ! -f backend/.env ]; then
    echo -e "${YELLOW}Creating backend/.env${NC}"
    cat > backend/.env << EOF
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://mangatech_user:mangatech_password@localhost:5432/mangatech
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d
EOF
    echo -e "${GREEN}✅ backend/.env created${NC}"
else
    echo -e "${GREEN}✅ backend/.env already exists${NC}"
fi

if [ ! -f mobile/.env ]; then
    echo -e "${YELLOW}Creating mobile/.env${NC}"
    cat > mobile/.env << EOF
API_URL=http://localhost:3000
EOF
    echo -e "${GREEN}✅ mobile/.env created${NC}"
else
    echo -e "${GREEN}✅ mobile/.env already exists${NC}"
fi

echo ""

# Installation des dépendances
echo -e "${BLUE}📦 Installing dependencies...${NC}"
echo ""

echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd backend && npm install
cd ..

echo -e "${YELLOW}Installing mobile dependencies...${NC}"
cd mobile && npm install
cd ..

echo ""

# Démarrage de Docker
echo -e "${BLUE}🐳 Starting PostgreSQL...${NC}"
docker-compose up -d

echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
sleep 5

echo ""

# Exécution des migrations
echo -e "${BLUE}📊 Running database migrations...${NC}"
cd backend && npm run migrate
cd ..

echo ""
echo "========================================="
echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Start the project: make start"
echo "  2. Or start services separately:"
echo "     - Backend: make backend"
echo "     - Mobile: make mobile"
echo ""
echo "For more info: make help"
echo ""
