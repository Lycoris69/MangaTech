# 🚀 Quick Start Guide - MangaTech

Guide de démarrage rapide pour développer sur MangaTech.

---

## ⚡ Installation Express (3 minutes)

```bash
# 1. Cloner et entrer dans le projet
git clone https://github.com/Lycoris69/MangaTech.git
cd MangaTech

# 2. Setup automatique
./scripts/setup.sh

# 3. Tout démarre !
make start
```

Scanner le QR code avec Expo Go sur votre téléphone. C'est prêt ! 🎉

---

## 🎮 Commandes essentielles

### Commandes Make (recommandé)

```bash
make help          # Liste toutes les commandes
make install       # Installe les dépendances
make start         # Démarre tout (DB + Backend + Mobile)
make stop          # Arrête tous les services
make status        # Vérifie le statut
make logs          # Affiche les logs
```

### Développement séparé

```bash
# Backend uniquement
make db-start      # Démarre PostgreSQL
make backend       # Démarre le backend

# Mobile uniquement
make mobile        # Démarre Expo
```

### Base de données

```bash
make db-migrate    # Exécute les migrations
make db-reset      # Réinitialise la DB (⚠️ supprime tout)
```

---

## 📂 Où trouver quoi ?

### Je veux modifier...

| Quoi | Où |
|------|-----|
| Une route API | `backend/src/routes/` |
| La logique métier | `backend/src/controllers/` |
| La base de données | `backend/database/migrations/` |
| Un écran mobile | `mobile/src/screens/` |
| Un composant React | `mobile/src/components/` |
| L'authentification | `mobile/src/contexts/AuthContext.js` |
| Les appels API | `mobile/src/services/api.js` |

### Je veux ajouter...

| Quoi | Fichier à créer |
|------|----------------|
| Une nouvelle table | `backend/database/migrations/00X_create_table.sql` |
| Un nouveau modèle | `backend/src/models/MonModele.js` |
| Une nouvelle route | `backend/src/routes/maroute.routes.js` |
| Un nouvel écran | `mobile/src/screens/MonEcran.js` |
| Un composant réutilisable | `mobile/src/components/common/MonComposant.js` |

---

## 🔧 Développement typique

### 1️⃣ Démarrer la journée

```bash
# Vérifier que tout fonctionne
make status

# Si pas tout démarré
make start
```

### 2️⃣ Créer une nouvelle fonctionnalité

**Exemple : Ajouter un système de favoris**

```bash
# 1. Créer la migration
touch backend/database/migrations/006_create_favorites.sql

# 2. Exécuter la migration
make db-migrate

# 3. Créer le modèle
touch backend/src/models/Favorite.js

# 4. Créer le controller
touch backend/src/controllers/favorite.controller.js

# 5. Créer les routes
touch backend/src/routes/favorite.routes.js

# 6. Créer l'écran mobile
touch mobile/src/screens/FavoritesScreen.js
```

### 3️⃣ Tester

```bash
# Backend - Tester une route
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}'

# Mobile - Recharger l'app
# Secouez votre téléphone et cliquez sur "Reload"
```

### 4️⃣ Déboguer

```bash
# Voir les logs backend
make logs

# Voir les logs PostgreSQL
docker logs mangatech-postgres

# Vérifier la DB
docker exec -it mangatech-postgres psql -U mangatech_user -d mangatech
```

---

## 🐛 Problèmes fréquents

### PostgreSQL ne démarre pas

```bash
docker-compose down -v
docker-compose up -d
```

### Backend ne répond pas

```bash
# Voir ce qui ne va pas
make logs

# Redémarrer
make stop
make start
```

### Mobile ne se connecte pas à l'API

```bash
# Vérifier l'IP dans mobile/src/services/api.js
# Doit être l'IP de votre machine, pas localhost

# Trouver votre IP
ip addr show | grep inet  # Linux
ifconfig | grep inet      # macOS
```

### Les migrations ne fonctionnent pas

```bash
# Vérifier que PostgreSQL est démarré
make status

# Vérifier la connexion
cd backend
node -e "require('./src/config/database')"

# Réinitialiser et refaire
make db-reset
```

### Cache Expo bloqué

```bash
cd mobile
npx expo start -c  # Clear cache
```

---

## 📚 Documentation complète

- **[docs/GETTING_STARTED.md](./GETTING_STARTED.md)** - Guide détaillé
- **[docs/API.md](./API.md)** - Documentation API
- **[docs/DATABASE.md](./DATABASE.md)** - Schéma de la base
- **[docs/PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Architecture
- **[README.md](../README.md)** - Documentation principale

---

## 🎯 Prochaines étapes (Release 1)

Checklist pour atteindre 100% de la Release 1 :

- [ ] Créer les migrations SQL
- [ ] Créer les modèles de données
- [ ] Créer ReaderScreen.js
- [ ] Implémenter le défilement automatique
- [ ] Créer les composants manga (MangaCard, MangaList)
- [ ] Ajouter le mode plein-écran

Voir la todo list complète avec `make help`.

---

## 💬 Besoin d'aide ?

1. Consultez d'abord la [documentation](./GETTING_STARTED.md)
2. Vérifiez les [issues GitHub](https://github.com/Lycoris69/MangaTech/issues)
3. Ouvrez une nouvelle issue si nécessaire

---

**Version** : 1.0.0  
**Dernière mise à jour** : 6 Novembre 2025
