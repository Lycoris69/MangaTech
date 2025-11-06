# 🎨 Organisation MangaTech - Vue Visuelle

```
MangaTech/
│
├── 📦 BACKEND (Node.js + Express + PostgreSQL)
│   │
│   ├── 📁 src/
│   │   ├── config/           ✅ Configuration (database.js)
│   │   ├── controllers/      ✅ Logique métier (auth, manga, etc.)
│   │   ├── middleware/       ✅ Authentification JWT
│   │   ├── routes/           ✅ Endpoints API REST
│   │   ├── services/         ✅ Services (notifications)
│   │   └── server.js         ✅ Point d'entrée
│   │
│   ├── 📁 database/
│   │   ├── migrations/       🆕 Migrations SQL (à créer)
│   │   ├── seeds/            🆕 Données de test
│   │   └── migrate.js        ✅ Script de migration
│   │
│   ├── 📁 models/            🆕 Modèles de données (à créer)
│   │   └── README.md         ✅
│   │
│   ├── 📁 utils/             🆕 Utilitaires (validators, logger)
│   │   └── README.md         ✅
│   │
│   └── 📄 Configuration
│       ├── .env              ✅ Variables d'environnement
│       ├── .env.example      ✅ Template
│       └── package.json      ✅
│
├── 📱 MOBILE (React Native + Expo)
│   │
│   ├── 📁 src/
│   │   ├── components/       🆕 Composants réutilisables
│   │   │   ├── common/       🚧 Button, Input, Card
│   │   │   ├── manga/        🚧 MangaCard, MangaList
│   │   │   └── reader/       🚧 AutoScroller, ReaderControls
│   │   │
│   │   ├── screens/          ✅ Écrans de l'app
│   │   │   ├── HomeScreen.js         ✅ Liste mangas
│   │   │   ├── LoginScreen.js        ✅ Connexion
│   │   │   ├── RegisterScreen.js     ✅ Inscription
│   │   │   ├── ProfileScreen.js      ✅ Profil
│   │   │   ├── NotificationsScreen.js ✅ Notifications
│   │   │   └── ReaderScreen.js       🚧 À créer
│   │   │
│   │   ├── contexts/         ✅ État global
│   │   │   └── AuthContext.js        ✅ Authentification
│   │   │
│   │   ├── navigation/       ✅ Navigation
│   │   │   └── AppNavigator.js       ✅
│   │   │
│   │   ├── services/         ✅ Communication API
│   │   │   └── api.js                ✅
│   │   │
│   │   ├── utils/            🆕 Utilitaires
│   │   │   └── README.md             ✅
│   │   │
│   │   └── config/           ✅ Configuration
│   │       └── index.js              ✅
│   │
│   ├── 📁 assets/            ✅ Images, icons
│   │
│   └── 📄 Configuration
│       ├── App.js            ✅ Point d'entrée
│       ├── app.json          ✅ Config Expo
│       ├── .env.example      ✅ Template
│       └── package.json      ✅
│
├── 🔄 SHARED (Code partagé)
│   ├── types.js              ✅ Énumérations (ReadingStatus, etc.)
│   ├── constants.js          ✅ Constantes API (ENDPOINTS, ERROR_CODES)
│   └── README.md             ✅ Documentation
│
├── 📚 DOCS (Documentation)
│   ├── GETTING_STARTED.md    ✅ Guide de démarrage
│   ├── QUICK_START.md        ✅ Démarrage rapide
│   ├── API.md                ✅ Documentation API complète
│   ├── DATABASE.md           ✅ Schéma de la base
│   └── PROJECT_STRUCTURE.md  ✅ Architecture détaillée
│
├── 🛠️ SCRIPTS (Automatisation)
│   ├── setup.sh              ✅ Installation automatique
│   └── seed-db.js            ✅ Données de test
│
└── 📄 FICHIERS RACINE
    ├── docker-compose.yml    ✅ PostgreSQL
    ├── Makefile              ✅ Commandes automatisées
    ├── README.md             ✅ Documentation principale
    ├── ARCHITECTURE.md       ✅ Architecture technique
    ├── USER_STORIES.md       ✅ User stories
    └── .gitignore            ✅ Fichiers ignorés
```

---

## 📊 Progression par module

### Backend - 70% ✅

| Composant | Statut | Fichiers |
|-----------|--------|----------|
| API REST | ✅ Complet | routes/, controllers/ |
| Configuration | ✅ Complet | config/, .env |
| Authentification | ✅ Complet | auth.middleware.js |
| Migrations | ❌ À faire | database/migrations/ |
| Modèles | ❌ À faire | models/ |
| Utilitaires | ❌ À faire | utils/ |

### Mobile - 60% ✅

| Composant | Statut | Fichiers |
|-----------|--------|----------|
| Navigation | ✅ Complet | AppNavigator.js |
| Authentification | ✅ Complet | AuthContext.js, Login/Register |
| Écrans de base | ✅ Complet | Home, Profile, Notifications |
| Services API | ✅ Complet | services/api.js |
| Lecteur | ❌ À faire | ReaderScreen.js |
| Composants | ❌ À faire | components/ |
| Utilitaires | ❌ À faire | utils/ |

### Infrastructure - 100% ✅

| Composant | Statut |
|-----------|--------|
| Docker | ✅ Complet |
| Makefile | ✅ Complet |
| Scripts | ✅ Complet |
| Documentation | ✅ Complet |
| Code partagé | ✅ Complet |

---

## 🎯 Roadmap Release 1 (25%)

### ✅ Terminé (60%)
- [x] Structure du projet
- [x] Backend API REST
- [x] Authentification JWT
- [x] Navigation mobile
- [x] Écrans de base
- [x] Documentation complète
- [x] Scripts d'automatisation

### 🚧 En cours (40%)
- [ ] Migrations SQL (5 tables)
- [ ] Modèles de données (5 modèles)
- [ ] ReaderScreen.js (écran de lecture)
- [ ] Composants reader (AutoScroller, ReaderControls)
- [ ] Composants manga (MangaCard, MangaList)
- [ ] Défilement automatique

---

## 🏗️ Architecture technique

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   MOBILE    │         │   BACKEND    │         │  DATABASE   │
│             │         │              │         │             │
│ React Native│◄───────►│  Express.js  │◄───────►│ PostgreSQL  │
│   (Expo)    │  HTTP   │   Node.js    │   SQL   │             │
│             │  REST   │              │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │
      │                        │
      ▼                        ▼
┌─────────────┐         ┌──────────────┐
│   SHARED    │         │   DOCKER     │
│             │         │              │
│  Types &    │         │  Container   │
│ Constants   │         │  PostgreSQL  │
│             │         │              │
└─────────────┘         └──────────────┘
```

---

## 🔑 Points d'entrée principaux

### Backend
```bash
cd backend
npm run dev            # Lance server.js
```
**Fichier** : `backend/src/server.js`
- Configure Express
- Charge les routes
- Connecte à PostgreSQL
- Écoute sur port 3000

### Mobile
```bash
cd mobile
npm start             # Lance Expo
```
**Fichier** : `mobile/App.js`
- Initialise AuthContext
- Configure la navigation
- Charge les écrans

### Base de données
```bash
make db-migrate       # Lance migrate.js
```
**Fichier** : `backend/database/migrate.js`
- Exécute les migrations SQL
- Crée les tables

---

## 📂 Fichiers clés par fonctionnalité

### Authentification
- Backend : `controllers/auth.controller.js`, `middleware/auth.middleware.js`
- Mobile : `contexts/AuthContext.js`, `screens/LoginScreen.js`

### Gestion des mangas
- Backend : `controllers/manga.controller.js`, `routes/manga.routes.js`
- Mobile : `screens/HomeScreen.js` (liste), à créer `screens/ReaderScreen.js`

### Progression de lecture
- Backend : `controllers/progress.controller.js`
- Mobile : à créer dans `utils/storage.js`

### Notifications
- Backend : `services/notification.service.js`
- Mobile : `screens/NotificationsScreen.js`

---

## 🚀 Commandes rapides

```bash
# Démarrage complet
make start

# Vérifier que tout fonctionne
make status

# Voir les logs
make logs

# Arrêter tout
make stop

# Nettoyer et recommencer
make clean
make install
make start
```

---

## 📖 Documentation

| Document | Description | Audience |
|----------|-------------|----------|
| README.md | Vue d'ensemble | Tous |
| QUICK_START.md | Démarrage rapide | Développeurs |
| GETTING_STARTED.md | Guide détaillé | Nouveaux contributeurs |
| API.md | Endpoints API | Développeurs frontend |
| DATABASE.md | Schéma BDD | Développeurs backend |
| PROJECT_STRUCTURE.md | Architecture | Tous les développeurs |
| ARCHITECTURE.md | Détails techniques | Développeurs avancés |

---

**Légende** :
- ✅ Terminé et fonctionnel
- 🆕 Créé mais vide (à remplir)
- 🚧 En cours de développement
- ❌ Pas encore créé

**Dernière mise à jour** : 6 Novembre 2025
