# MangaTech 📚

Application mobile personnelle pour la lecture de mangas en ligne, développée avec React Native (Expo) et Node.js/Express/PostgreSQL.

## 🎯 Concept

MangaTech est une application inspirée de MangaFox qui optimise l'expérience de lecture de mangas en automatisant la navigation et en offrant des fonctionnalités avancées comme le suivi de progression, les notifications de nouveaux chapitres et le mode hors-ligne.

## ✨ Fonctionnalités

### Implémentées ✅
- **Authentification** : Inscription et connexion sécurisées avec JWT
- **Bibliothèque personnelle** : Gestion de vos mangas favoris
- **Suivi de progression** : Mémorisation de votre position de lecture
- **Notifications** : Infrastructure prête pour alertes de nouveaux chapitres
- **API REST complète** : Backend entièrement fonctionnel

### En développement 🔄
- Lecteur de chapitres avec navigation automatique
- Mode plein-écran
- Détection automatique de nouveaux chapitres
- Mode hors-ligne avec téléchargement

Voir [USER_STORIES.md](./USER_STORIES.md) pour la liste complète.

## 🏗️ Architecture

```
MangaTech/
├── backend/          # API Node.js/Express
│   ├── src/
│   │   ├── config/       # Configuration (database, etc.)
│   │   ├── controllers/  # Logique métier
│   │   ├── database/     # Migrations
│   │   ├── middleware/   # Auth, validation
│   │   ├── routes/       # Endpoints API
│   │   ├── services/     # Services (notifications, etc.)
│   │   └── server.js     # Point d'entrée
│   ├── package.json
│   └── .env
│
├── mobile/           # App React Native/Expo
│   ├── src/
│   │   ├── contexts/     # Context API (Auth)
│   │   ├── navigation/   # React Navigation
│   │   ├── screens/      # Écrans de l'app
│   │   └── services/     # API client
│   ├── App.js
│   └── package.json
│
├── docker-compose.yml    # PostgreSQL en container
├── ARCHITECTURE.md       # Documentation détaillée
└── USER_STORIES.md       # User stories et roadmap
```

Voir [ARCHITECTURE.md](./ARCHITECTURE.md) pour plus de détails.

## 🚀 Installation

### Prérequis

- **Node.js** 18+ et npm
- **Docker** et Docker Compose
- **Expo CLI** : `npm install -g expo-cli`
- Un smartphone avec **Expo Go** (iOS/Android) OU un émulateur

### 1. Cloner le projet

```bash
git clone https://github.com/Lycoris69/MangaTech.git
cd MangaTech
```

### 2. Backend Setup

#### a) Démarrer PostgreSQL

```bash
# Démarrer PostgreSQL avec Docker
docker-compose up -d

# Vérifier que le container est bien démarré
docker ps | grep postgres
```

#### b) Configuration

```bash
cd backend

# Installer les dépendances
npm install

# Le fichier .env est déjà configuré avec :
# - DB_HOST=172.19.0.2 (IP du container Docker)
# - DB_USER=mangatech_user
# - DB_PASSWORD=mangatech_password
# - DB_NAME=mangatech
```

> **Note**: L'IP `172.19.0.2` est l'adresse du container PostgreSQL. Si elle change, mettez à jour `.env` avec la nouvelle IP obtenue via :
> ```bash
> docker inspect mangatech-postgres | grep IPAddress
> ```

#### c) Migrations

```bash
# Créer les tables de la base de données
npm run migrate
```

Vous devriez voir :
```
📊 Connected to PostgreSQL database
✅ All database tables created successfully
Migration completed
```

#### d) Démarrer le serveur

```bash
# Mode développement avec auto-reload
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

### 3. Mobile Setup

```bash
cd ../mobile

# Installer les dépendances
npm install

# Démarrer Expo
npm start
```

#### Scanner le QR code

- **iOS** : Ouvrez l'app Caméra et scannez le QR code
- **Android** : Ouvrez Expo Go et scannez le QR code

Ou utilisez un émulateur :
- `i` pour iOS Simulator (macOS uniquement)
- `a` pour Android Emulator

## 📡 API Endpoints

### Authentification
```
POST /api/auth/register  - Inscription
POST /api/auth/login     - Connexion
GET  /api/auth/profile   - Profil (protégé)
```

### Mangas
```
GET    /api/mangas       - Liste des mangas
GET    /api/mangas/:id   - Détails
POST   /api/mangas       - Créer
PUT    /api/mangas/:id   - Modifier
DELETE /api/mangas/:id   - Supprimer
```

### Signets (Bibliothèque)
```
GET    /api/bookmarks       - Ma bibliothèque
POST   /api/bookmarks       - Ajouter un manga
PUT    /api/bookmarks/:id   - Modifier
DELETE /api/bookmarks/:id   - Supprimer
```

### Chapitres
```
GET  /api/chapters/manga/:manga_id  - Chapitres par manga
GET  /api/chapters/:id              - Détails
POST /api/chapters                  - Créer
```

### Progression
```
GET  /api/progress                    - Historique
POST /api/progress                    - Mettre à jour
GET  /api/progress/manga/:id/last     - Dernière lecture
```

### Notifications
```
GET    /api/notifications           - Liste
PUT    /api/notifications/:id/read  - Marquer comme lu
PUT    /api/notifications/read-all  - Tout marquer lu
DELETE /api/notifications/:id       - Supprimer
```

Tous les endpoints (sauf `/auth/register` et `/auth/login`) nécessitent un token JWT :
```
Authorization: Bearer <token>
```

## 🗄️ Schéma de base de données

7 tables créées :

- `users` - Utilisateurs
- `mangas` - Catalogue de mangas
- `bookmarks` - Bibliothèque utilisateur (relation users-mangas)
- `chapters` - Chapitres des mangas
- `reading_progress` - Progression de lecture
- `notifications` - Notifications
- `downloaded_chapters` - Chapitres téléchargés (mode hors-ligne)

## 🛠️ Commandes utiles

### Backend

```bash
# Développement
npm run dev

# Production
npm start

# Migrations
npm run migrate

# Accéder à PostgreSQL
docker exec -it mangatech-postgres psql -U mangatech_user -d mangatech

# Lister les tables
docker exec -it mangatech-postgres psql -U mangatech_user -d mangatech -c "\dt"

# Voir les logs
docker logs mangatech-postgres
```

### Mobile

```bash
# Démarrer Expo
npm start

# Lancer sur iOS
npm run ios

# Lancer sur Android
npm run android

# Lancer sur le web
npm run web

# Clear cache
expo start -c
```

### Docker

```bash
# Démarrer les services
docker-compose up -d

# Arrêter les services
docker-compose down

# Arrêter et supprimer les volumes (ATTENTION : supprime les données)
docker-compose down -v

# Voir les logs
docker-compose logs -f
```

## 🧪 Test de l'API

Vous pouvez tester l'API avec curl ou Postman :

```bash
# Test de santé
curl http://localhost:3000/health

# Inscription
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "username": "testuser"
  }'

# Connexion
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Profil (avec token)
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🐛 Troubleshooting

### PostgreSQL ne démarre pas

```bash
# Vérifier les logs
docker logs mangatech-postgres

# Redémarrer le container
docker-compose restart

# Si nécessaire, recréer le container
docker-compose down
docker-compose up -d
```

### Erreur de connexion à la base de données

```bash
# Obtenir l'IP du container
docker inspect mangatech-postgres | grep IPAddress

# Mettre à jour backend/.env avec la nouvelle IP
DB_HOST=<nouvelle_ip>

# Tester la connexion
cd backend
node test-connection.js
```

### Le serveur backend ne démarre pas

```bash
# Vérifier les variables d'environnement
cat backend/.env

# Vérifier que PostgreSQL est accessible
docker ps | grep postgres

# Réinstaller les dépendances
cd backend
rm -rf node_modules package-lock.json
npm install
```

### L'app mobile ne se connecte pas au backend

Sur Expo, l'app mobile doit utiliser l'IP locale de votre machine, pas `localhost`.

1. Trouvez votre IP locale :
   ```bash
   # Linux
   ip addr show | grep inet

   # macOS
   ifconfig | grep inet
   ```

2. Modifiez `mobile/src/services/api.js` :
   ```javascript
   const API_URL = 'http://192.168.X.X:3000/api';
   ```

## 📝 Utilisation personnelle

Cette application est développée dans un cadre **strictement personnel**, sans intention commerciale. Elle vise à améliorer l'expérience de lecture de mangas en automatisant les tâches répétitives.

## 🔐 Sécurité

- Mots de passe hashés avec bcryptjs
- Authentification JWT
- Variables d'environnement pour les secrets
- Requêtes SQL paramétrées (protection contre injection SQL)
- CORS configuré

**Pour la production**, pensez à :
- Changer `JWT_SECRET` dans `.env`
- Utiliser HTTPS
- Ajouter rate limiting
- Configurer un reverse proxy (nginx)

## 🚧 Roadmap

### Phase 1 - MVP ✅
- [x] Backend API fonctionnel
- [x] Authentification
- [x] Gestion des signets
- [x] Base de données configurée

### Phase 2 - Lecteur 🔄
- [ ] Écran de détails du manga
- [ ] Lecteur de chapitres
- [ ] Navigation automatique
- [ ] Mode plein-écran

### Phase 3 - Automatisation 📝
- [ ] Web scraping des sites de mangas
- [ ] Détection automatique de nouveaux chapitres
- [ ] Notifications push

### Phase 4 - Mode Hors-ligne 📝
- [ ] Téléchargement de chapitres
- [ ] Lecture hors-ligne
- [ ] Gestion du stockage

## 📚 Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture détaillée du projet
- [USER_STORIES.md](./USER_STORIES.md) - User stories et statuts

## 🤝 Contributing

Ce projet est personnel, mais les suggestions sont les bienvenues ! N'hésitez pas à ouvrir une issue pour :
- Signaler un bug
- Proposer une fonctionnalité
- Améliorer la documentation

## 📄 License

MIT License - Voir LICENSE pour plus de détails

---

**Version**: 1.0.0  
**Dernière mise à jour**: 6 Novembre 2025  
**Auteur**: Lycoris69
