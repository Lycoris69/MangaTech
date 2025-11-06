# 🚀 Guide de démarrage - MangaTech

## Prérequis

- **Node.js** >= 18.x
- **Docker** et **Docker Compose**
- **Expo Go** (app mobile sur iOS/Android)
- **Git**

## Installation rapide

```bash
# 1. Installer les dépendances
make install

# 2. Démarrer le projet complet
make start
```

C'est tout ! Le Makefile s'occupe de tout :
- Démarrage de PostgreSQL
- Exécution des migrations
- Lancement du backend
- Affichage du QR code pour l'app mobile

## Installation détaillée

### 1. Cloner le projet

```bash
git clone https://github.com/Lycoris69/MangaTech.git
cd MangaTech
```

### 2. Configuration

Créer les fichiers d'environnement :

**Backend** - `backend/.env`
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://mangatech_user:mangatech_password@localhost:5432/mangatech
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

**Mobile** - `mobile/.env`
```env
API_URL=http://localhost:3000
```

### 3. Démarrage

```bash
# Installation complète
make install

# Démarrer tout
make start
```

### 4. Scanner le QR Code

Une fois le projet démarré, scannez le QR code affiché dans le terminal avec l'app **Expo Go** sur votre téléphone.

## Commandes Make disponibles

| Commande | Description |
|----------|-------------|
| `make help` | Affiche toutes les commandes |
| `make install` | Installe les dépendances |
| `make start` | Démarre tout le projet |
| `make stop` | Arrête tous les services |
| `make status` | Affiche le statut des services |
| `make logs` | Affiche les logs |
| `make db-migrate` | Exécute les migrations |
| `make db-reset` | Réinitialise la DB (⚠️ supprime les données) |
| `make clean` | Nettoie tout |

## Développement séparé

### Backend uniquement
```bash
make db-start      # Démarre PostgreSQL
make backend       # Démarre le backend
```

### Mobile uniquement
```bash
make mobile        # Démarre Expo
```

## Vérification

Testez que tout fonctionne :

```bash
# Vérifier le statut
make status

# Tester l'API
curl http://localhost:3000/health
```

## Troubleshooting

### PostgreSQL ne démarre pas
```bash
docker-compose down -v
docker-compose up -d
```

### Backend ne répond pas
```bash
# Voir les logs
make logs

# Redémarrer
make stop
make start
```

### QR Code ne s'affiche pas
```bash
cd mobile
npx expo start --offline
```

## Prochaines étapes

1. Créer un compte dans l'app mobile
2. Ajouter votre premier manga
3. Tester la lecture automatique

Pour plus d'infos, consultez :
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Architecture technique
- [USER_STORIES.md](../USER_STORIES.md) - Fonctionnalités
- [API.md](./API.md) - Documentation API
