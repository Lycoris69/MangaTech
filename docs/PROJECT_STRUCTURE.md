# 📁 Structure du Projet MangaTech

## Vue d'ensemble

```
MangaTech/
├── 📦 backend/                    # API Node.js/Express
├── 📱 mobile/                     # Application React Native
├── 🔄 shared/                     # Code partagé
├── 📚 docs/                       # Documentation
├── 🛠️ scripts/                    # Scripts utilitaires
├── 🐳 docker-compose.yml          # Configuration Docker
├── 📝 Makefile                    # Commandes automatisées
└── 📖 README.md                   # Documentation principale
```

---

## 📦 Backend (`/backend`)

### Structure complète

```
backend/
├── src/
│   ├── config/
│   │   └── database.js           # Configuration PostgreSQL
│   │
│   ├── controllers/              # Logique métier des routes
│   │   ├── auth.controller.js    # Authentification (register, login)
│   │   ├── bookmark.controller.js # Gestion des signets
│   │   ├── chapter.controller.js  # Gestion des chapitres
│   │   ├── manga.controller.js    # CRUD mangas
│   │   ├── notification.controller.js # Notifications
│   │   └── progress.controller.js # Progression de lecture
│   │
│   ├── database/
│   │   ├── migrations/           # 🆕 Migrations SQL
│   │   │   ├── 001_create_users.sql
│   │   │   ├── 002_create_mangas.sql
│   │   │   ├── 003_create_reading_progress.sql
│   │   │   ├── 004_create_bookmarks.sql
│   │   │   └── 005_create_notifications.sql
│   │   │
│   │   ├── seeds/                # 🆕 Données de test
│   │   │   └── test_data.sql
│   │   │
│   │   └── migrate.js            # Script de migration
│   │
│   ├── middleware/               # Middlewares Express
│   │   └── auth.middleware.js    # Vérification JWT
│   │
│   ├── models/                   # 🆕 Modèles de données
│   │   ├── User.js               # À créer
│   │   ├── Manga.js              # À créer
│   │   ├── ReadingProgress.js    # À créer
│   │   ├── Bookmark.js           # À créer
│   │   ├── Notification.js       # À créer
│   │   └── README.md             # ✅ Créé
│   │
│   ├── routes/                   # Endpoints API
│   │   ├── auth.routes.js
│   │   ├── bookmark.routes.js
│   │   ├── chapter.routes.js
│   │   ├── manga.routes.js
│   │   ├── notification.routes.js
│   │   └── progress.routes.js
│   │
│   ├── services/                 # Services métier
│   │   └── notification.service.js
│   │
│   ├── utils/                    # 🆕 Utilitaires
│   │   ├── validators.js         # À créer - Validation
│   │   ├── logger.js             # À créer - Logging
│   │   ├── errors.js             # À créer - Erreurs custom
│   │   └── README.md             # ✅ Créé
│   │
│   └── server.js                 # Point d'entrée
│
├── .env.example                  # 🆕 Template de configuration
├── package.json
└── README.md
```

### Responsabilités

- **Controllers** : Logique métier, validation, appels aux modèles
- **Models** : Interaction avec la base de données (CRUD)
- **Routes** : Définition des endpoints et middlewares
- **Services** : Logique complexe (notifications, scraping futur)
- **Utils** : Fonctions réutilisables
- **Middleware** : Authentification, validation, gestion d'erreurs

---

## 📱 Mobile (`/mobile`)

### Structure complète

```
mobile/
├── src/
│   ├── components/               # 🆕 Composants réutilisables
│   │   ├── common/               # À créer
│   │   │   ├── Button.js
│   │   │   ├── Input.js
│   │   │   └── Card.js
│   │   │
│   │   ├── manga/                # À créer
│   │   │   ├── MangaCard.js
│   │   │   ├── MangaList.js
│   │   │   └── ChapterItem.js
│   │   │
│   │   ├── reader/               # À créer - Release 1
│   │   │   ├── AutoScroller.js
│   │   │   ├── ReaderControls.js
│   │   │   └── PageViewer.js
│   │   │
│   │   └── README.md             # ✅ Créé
│   │
│   ├── config/
│   │   └── index.js              # Configuration générale
│   │
│   ├── contexts/                 # Context API React
│   │   └── AuthContext.js        # Gestion authentification
│   │
│   ├── navigation/
│   │   └── AppNavigator.js       # React Navigation
│   │
│   ├── screens/                  # Écrans de l'application
│   │   ├── HomeScreen.js         # Liste des mangas
│   │   ├── LoginScreen.js        # Connexion
│   │   ├── MainScreen.js         # Écran principal
│   │   ├── NotificationsScreen.js # Notifications
│   │   ├── ProfileScreen.js      # Profil utilisateur
│   │   ├── RegisterScreen.js     # Inscription
│   │   └── ReaderScreen.js       # 🚧 À créer - Lecteur
│   │
│   ├── services/
│   │   ├── api.js                # Client API
│   │   └── index.js              # Export services
│   │
│   └── utils/                    # 🆕 Utilitaires
│       ├── storage.js            # À créer - AsyncStorage
│       ├── formatters.js         # À créer - Formatage dates/nombres
│       ├── validators.js         # À créer - Validation
│       └── README.md             # ✅ Créé
│
├── assets/                       # Images, fonts, etc.
├── App.js                        # Point d'entrée
├── app.json                      # Config Expo
├── index.js
├── .env.example                  # 🆕 Template de configuration
└── package.json
```

### Responsabilités

- **Screens** : Pages complètes de l'application
- **Components** : Éléments réutilisables (boutons, cartes, etc.)
- **Contexts** : État global (authentification, préférences)
- **Services** : Communication avec l'API backend
- **Utils** : Fonctions helpers (formatage, validation, stockage)

---

## 🔄 Shared (`/shared`)

Code partagé entre backend et mobile pour garantir la cohérence.

```
shared/
├── types.js                      # ✅ Créé - Énumérations et types
├── constants.js                  # ✅ Créé - Constantes API
└── README.md                     # ✅ Créé - Documentation
```

### Contenu

- **types.js** : `ReadingStatus`, `DownloadStatus`, `NotificationStatus`
- **constants.js** : `ENDPOINTS`, `ERROR_CODES`, `AUTO_SCROLL_SPEEDS`

### Utilisation

**Backend :**
```javascript
const { ReadingStatus } = require('../shared/types');
```

**Mobile :**
```javascript
import { ReadingStatus } from '../../shared/types';
```

---

## 📚 Documentation (`/docs`)

Documentation technique complète du projet.

```
docs/
├── GETTING_STARTED.md            # ✅ Guide de démarrage
├── API.md                        # ✅ Documentation complète de l'API
├── DATABASE.md                   # ✅ Schéma de la base de données
└── PROJECT_STRUCTURE.md          # ✅ Ce fichier
```

### Contenu

- **GETTING_STARTED.md** : Installation, configuration, premiers pas
- **API.md** : Tous les endpoints, exemples de requêtes/réponses
- **DATABASE.md** : Schéma, relations, migrations
- **PROJECT_STRUCTURE.md** : Architecture et organisation

---

## 🛠️ Scripts (`/scripts`)

Scripts d'automatisation et utilitaires.

```
scripts/
├── setup.sh                      # ✅ Setup automatique du projet
└── seed-db.js                    # ✅ Peuplement de la DB
```

### Scripts disponibles

- **setup.sh** : Installation complète (dépendances, .env, DB)
- **seed-db.js** : Créer des données de test

### Utilisation

```bash
# Setup complet
./scripts/setup.sh

# Seed de la DB
node scripts/seed-db.js
```

---

## 📝 Fichiers racine

### Configuration

- **docker-compose.yml** : PostgreSQL containerisé
- **Makefile** : Commandes automatisées (start, stop, migrate, etc.)
- **.gitignore** : Fichiers ignorés par Git

### Documentation

- **README.md** : Documentation principale
- **ARCHITECTURE.md** : Architecture technique détaillée
- **USER_STORIES.md** : User stories et roadmap
- **project.txt** : Description originale du projet

---

## 🎯 Prochaines étapes

### À créer (Release 1 - 25%)

#### Backend
- [ ] Migrations SQL (users, mangas, reading_progress, bookmarks)
- [ ] Modèles de données (User, Manga, ReadingProgress, Bookmark)
- [ ] Utilitaires (validators.js, logger.js, errors.js)

#### Mobile
- [ ] ReaderScreen.js (écran de lecture)
- [ ] Composants reader (AutoScroller, ReaderControls, PageViewer)
- [ ] Composants manga (MangaCard, MangaList)
- [ ] Composants common (Button, Input, Card)
- [ ] Utilitaires (storage.js, formatters.js)

### Release 2 (50%)
- [ ] Système de scraping (backend/services/scraper.service.js)
- [ ] Système de notifications (Firebase)
- [ ] Recherche de mangas

### Release 3 (75%)
- [ ] Système de téléchargement
- [ ] Mode hors-ligne
- [ ] Gestion du stockage

---

## 📊 État actuel

| Module | Statut | Progression |
|--------|--------|-------------|
| Backend - Structure | ✅ Complet | 100% |
| Backend - API | ✅ Complet | 100% |
| Backend - Migrations | ❌ À faire | 0% |
| Backend - Modèles | ❌ À faire | 0% |
| Mobile - Structure | ✅ Complet | 100% |
| Mobile - Auth | ✅ Complet | 100% |
| Mobile - Reader | ❌ À faire | 0% |
| Mobile - Components | ❌ À faire | 0% |
| Shared | ✅ Complet | 100% |
| Documentation | ✅ Complet | 100% |
| Scripts | ✅ Complet | 100% |

**Progression globale Release 1 : ~40%**

---

## 💡 Bonnes pratiques

### Nommage

- **Fichiers** : camelCase.js ou PascalCase.js (composants React)
- **Dossiers** : lowercase ou kebab-case
- **Variables** : camelCase
- **Constantes** : UPPER_SNAKE_CASE
- **Classes** : PascalCase

### Organisation

- Un fichier = Une responsabilité
- Grouper par fonctionnalité, pas par type
- README.md dans chaque dossier important
- Commentaires JSDoc pour les fonctions publiques

### Git

- Commits atomiques et explicites
- Branches feature pour nouvelles fonctionnalités
- Pull requests pour review de code

---

**Dernière mise à jour** : 6 Novembre 2025
