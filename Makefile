.PHONY: help install start stop clean db-migrate db-reset logs status qr

# Couleurs pour l'affichage
BLUE=\033[0;34m
GREEN=\033[0;32m
YELLOW=\033[1;33m
RED=\033[0;31m
NC=\033[0m # No Color

all:
	@$(MAKE) start

help: ## Affiche l'aide
	@printf "\033[0;34mMangaTech - Commandes disponibles\033[0m\n"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[0;32m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Installe toutes les dépendances (backend + mobile)
	@printf "\033[0;34m📦 Installation des dépendances...\033[0m\n"
	@printf "\033[1;33mInstalling backend dependencies...\033[0m\n"
	cd backend && npm install
	@printf "\033[1;33mInstalling mobile dependencies...\033[0m\n"
	cd mobile && npm install
	@printf "\033[0;32m✅ Installation terminée !\033[0m\n"

db-start: ## Démarre PostgreSQL avec Docker
	@printf "\033[0;34m🐘 Démarrage de PostgreSQL...\033[0m\n"
	docker-compose up -d
	@sleep 3
	@printf "\033[0;32m✅ PostgreSQL démarré !\033[0m\n"

db-migrate: db-start ## Exécute les migrations de base de données
	@printf "\033[0;34m📊 Exécution des migrations...\033[0m\n"
	cd backend && npm run migrate
	@printf "\033[0;32m✅ Migrations terminées !\033[0m\n"

db-reset: ## Réinitialise la base de données (ATTENTION: supprime toutes les données)
	@printf "\033[0;31m⚠️  Réinitialisation de la base de données...\033[0m\n"
	docker-compose down -v
	@$(MAKE) db-migrate

backend: ## Démarre uniquement le backend
	@printf "\033[0;34m🚀 Démarrage du backend...\033[0m\n"
	cd backend && npm run dev

mobile: ## Démarre uniquement l'app mobile
	@printf "\033[0;34m📱 Démarrage de l'app mobile...\033[0m\n"
	cd mobile && npx expo start --offline

start: ## Démarre tout le projet (DB + Backend + Mobile avec QR code)
	@printf "\033[0;34m========================================\033[0m\n"
	@printf "\033[0;34m🚀 Démarrage de MangaTech...\033[0m\n"
	@printf "\033[0;34m========================================\033[0m\n"
	@echo ""
	@$(MAKE) db-start
	@echo ""
	@printf "\033[1;33m⏳ Attente du démarrage de PostgreSQL...\033[0m\n"
	@sleep 5
	@echo ""
	@$(MAKE) db-migrate-if-needed
	@echo ""
	@printf "\033[0;34m🚀 Démarrage du backend...\033[0m\n"
	@printf "\033[1;33mOuvrez un nouveau terminal pour voir les logs du backend\033[0m\n"
	@(cd backend && npm run dev > ../backend.log 2>&1 &)
	@sleep 5
	@printf "\033[0;32m✅ Backend démarré sur http://localhost:3000\033[0m\n"
	@echo ""
	@printf "\033[0;34m📱 Démarrage de l'application mobile...\033[0m\n"
	@printf "\033[0;32m========================================\033[0m\n"
	@printf "\033[0;32m📱 Scannez le QR code ci-dessous :\033[0m\n"
	@printf "\033[0;32m========================================\033[0m\n"
	@echo ""
	cd mobile && npx expo start -c --offline

start-bg: ## Démarre tout en arrière-plan et affiche le QR code
	@printf "\033[0;34m========================================\033[0m\n"
	@printf "\033[0;34m🚀 Démarrage de MangaTech...\033[0m\n"
	@printf "\033[0;34m========================================\033[0m\n"
	@echo ""
	@$(MAKE) db-start
	@echo ""
	@printf "\033[1;33m⏳ Attente du démarrage de PostgreSQL...\033[0m\n"
	@sleep 5
	@echo ""
	@$(MAKE) db-migrate-if-needed
	@echo ""
	@printf "\033[0;34m🚀 Démarrage du backend en arrière-plan...\033[0m\n"
	@(cd backend && npm run dev > ../backend.log 2>&1 &)
	@sleep 5
	@if curl -s http://localhost:3000/health > /dev/null; then \
		printf "\033[0;32m✅ Backend démarré sur http://localhost:3000\033[0m\n"; \
	else \
		printf "\033[0;31m❌ Erreur: Le backend n'a pas démarré correctement\033[0m\n"; \
		printf "\033[1;33mConsultez backend.log pour plus d'informations\033[0m\n"; \
	fi
	@echo ""
	@printf "\033[0;34m📱 Démarrage de l'application mobile...\033[0m\n"
	@printf "\033[0;32m========================================\033[0m\n"
	@printf "\033[0;32m📱 Scannez le QR code ci-dessous :\033[0m\n"
	@printf "\033[0;32m========================================\033[0m\n"
	@echo ""
	cd mobile && npx expo start --offline

db-migrate-if-needed: ## Exécute les migrations si nécessaire
	@if docker exec mangatech-postgres psql -U mangatech_user -d mangatech -c "\dt" 2>/dev/null | grep -q users; then \
		printf "\033[0;32m✅ Tables déjà créées\033[0m\n"; \
	else \
		printf "\033[1;33m📊 Création des tables...\033[0m\n"; \
		cd backend && npm run migrate; \
	fi

stop: ## Arrête tous les services
	@printf "\033[1;33m🛑 Arrêt des services...\033[0m\n"
	@pkill -f "node.*server.js" || true
	@pkill -f "expo start" || true
	docker-compose down
	@printf "\033[0;32m✅ Services arrêtés !\033[0m\n"

clean: stop ## Arrête tout et nettoie (supprime node_modules et logs)
	@printf "\033[1;33m🧹 Nettoyage...\033[0m\n"
	rm -rf backend/node_modules
	rm -rf mobile/node_modules
	rm -f backend.log
	@printf "\033[0;32m✅ Nettoyage terminé !\033[0m\n"

logs: ## Affiche les logs
	@printf "\033[0;34m📋 Logs PostgreSQL:\033[0m\n"
	@docker logs --tail 50 mangatech-postgres
	@echo ""
	@printf "\033[0;34m📋 Logs Backend:\033[0m\n"
	@tail -50 backend.log 2>/dev/null || printf "\033[1;33mPas de logs backend\033[0m\n"

status: ## Affiche le statut des services
	@printf "\033[0;34m📊 Statut des services:\033[0m\n"
	@echo ""
	@printf "\033[1;33mPostgreSQL:\033[0m\n"
	@if docker ps | grep -q mangatech-postgres; then \
		printf "  \033[0;32m✅ Running\033[0m\n"; \
		docker ps | grep mangatech-postgres | awk '{print "  Port: " $$NF}'; \
	else \
		printf "  \033[0;31m❌ Stopped\033[0m\n"; \
	fi
	@echo ""
	@printf "\033[1;33mBackend:\033[0m\n"
	@if curl -s http://localhost:3000/health > /dev/null 2>&1; then \
		printf "  \033[0;32m✅ Running on http://localhost:3000\033[0m\n"; \
	else \
		printf "  \033[0;31m❌ Stopped\033[0m\n"; \
	fi
	@echo ""
	@printf "\033[1;33mBase de données:\033[0m\n"
	@if docker exec mangatech-postgres psql -U mangatech_user -d mangatech -c "\dt" 2>/dev/null | grep -q users; then \
		printf "  \033[0;32m✅ Tables créées\033[0m\n"; \
	else \
		printf "  \033[1;33m⚠️  Tables non créées (exécutez 'make db-migrate')\033[0m\n"; \
	fi

qr: ## Affiche uniquement le QR code de l'app mobile
	@printf "\033[0;34m📱 QR Code de l'application mobile:\033[0m\n"
	cd mobile && npx expo start --offline

test-api: ## Teste l'API backend
	@printf "\033[0;34m🧪 Test de l'API...\033[0m\n"
	@echo ""
	@printf "\033[1;33mHealth check:\033[0m\n"
	@curl -s http://localhost:3000/health && echo "" || printf "\033[0;31m❌ Backend non accessible\033[0m\n"

.DEFAULT_GOAL := all
