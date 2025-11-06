# Architecture MangaTech

## Vue d'ensemble

MangaTech est structuré selon une architecture client-serveur avec une séparation claire entre le frontend mobile et le backend API.

```
┌─────────────────────┐
│                     │
│   Mobile App        │
│   (React Native)    │
│                     │
└──────────┬──────────┘
           │
           │ HTTP/REST
           │ (JWT Auth)
           ▼
┌─────────────────────┐
│                     │
│   API Backend       │
│   (Express.js)      │
│                     │
└──────────┬──────────┘
           │
           │ SQL
           ▼
┌─────────────────────┐
│                     │
│   PostgreSQL        │
│   Database          │
│                     │
└─────────────────────┘
```

## Frontend (Mobile)

### Technologies
- **React Native** avec **Expo** pour le développement cross-platform
- **React Navigation** pour la navigation
- **Context API** pour la gestion d'état
- **Axios** pour les requêtes HTTP
- **AsyncStorage** pour le cache local

### Structure des dossiers

```
mobile/src/
├── contexts/           # Contextes React (Auth, etc.)
│   └── AuthContext.js
├── navigation/         # Configuration de navigation
│   └── AppNavigator.js
├── screens/           # Écrans de l'application
│   ├── LoginScreen.js
│   ├── RegisterScreen.js
│   ├── HomeScreen.js
│   ├── NotificationsScreen.js
│   └── ProfileScreen.js
├── services/          # Services API
│   ├── api.js        # Client Axios configuré
│   └── index.js      # Exports de tous les services
└── components/        # Composants réutilisables (à venir)
```

### Navigation

```
AuthStack (Non authentifié)
├── LoginScreen
└── RegisterScreen

MainTabs (Authentifié)
├── HomeScreen (Bibliothèque)
├── NotificationsScreen
└── ProfileScreen
```

### Gestion de l'état

L'application utilise React Context API pour:
- **AuthContext**: Authentification et gestion de l'utilisateur
- Futurs contexts: Mangas, Preferences, OfflineStorage

### Flow d'authentification

```
1. L'utilisateur arrive sur LoginScreen
2. Saisie des credentials
3. Appel à authService.login()
4. Stockage du JWT dans AsyncStorage
5. Mise à jour du AuthContext
6. Navigation vers MainTabs
```

## Backend (API)

### Technologies
- **Node.js** avec **Express.js**
- **PostgreSQL** via le driver `pg`
- **JWT** pour l'authentification
- **bcryptjs** pour le hachage des mots de passe
- **node-cron** pour les tâches planifiées

### Architecture en couches

```
┌─────────────────────────────────────┐
│           Routes Layer              │
│  (Définition des endpoints)         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│        Middleware Layer             │
│  (Auth, Validation, Error handling) │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│        Controller Layer             │
│  (Logique métier)                   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Service Layer               │
│  (Opérations complexes)             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Database Layer              │
│  (Accès aux données)                │
└─────────────────────────────────────┘
```

### Structure des dossiers

```
backend/src/
├── config/              # Configuration
│   └── database.js      # Pool PostgreSQL
├── controllers/         # Logique métier
│   ├── auth.controller.js
│   ├── manga.controller.js
│   ├── bookmark.controller.js
│   ├── chapter.controller.js
│   ├── progress.controller.js
│   └── notification.controller.js
├── database/           # Migrations et seeds
│   └── migrate.js
├── middleware/         # Middlewares Express
│   └── auth.middleware.js
├── routes/            # Définition des routes
│   ├── auth.routes.js
│   ├── manga.routes.js
│   ├── bookmark.routes.js
│   ├── chapter.routes.js
│   ├── progress.routes.js
│   └── notification.routes.js
├── services/          # Services métier
│   └── notification.service.js
└── server.js          # Point d'entrée
```

### Routes API

#### Authentification (`/api/auth`)
- `POST /register` - Inscription
- `POST /login` - Connexion
- `GET /profile` - Profil (protégé)

#### Mangas (`/api/mangas`) - Protégé
- `GET /` - Liste
- `GET /:id` - Détails
- `POST /` - Créer
- `PUT /:id` - Modifier
- `DELETE /:id` - Supprimer

#### Signets (`/api/bookmarks`) - Protégé
- `GET /` - Bibliothèque
- `POST /` - Ajouter
- `PUT /:id` - Modifier
- `DELETE /:id` - Supprimer

#### Chapitres (`/api/chapters`) - Protégé
- `GET /manga/:manga_id` - Par manga
- `GET /:id` - Détails
- `POST /` - Créer

#### Progression (`/api/progress`) - Protégé
- `GET /` - Historique
- `POST /` - Mettre à jour
- `GET /manga/:manga_id/last` - Dernière lecture

#### Notifications (`/api/notifications`) - Protégé
- `GET /` - Liste
- `PUT /:id/read` - Marquer lu
- `PUT /read-all` - Tout marquer lu
- `DELETE /:id` - Supprimer

### Middleware d'authentification

```javascript
Authorization: Bearer <JWT_TOKEN>
```

Le middleware vérifie:
1. Présence du token dans le header
2. Validité du token JWT
3. Injection de `req.user` avec les données utilisateur

### Service de notifications

Le service tourne en arrière-plan avec `node-cron`:
- Vérification toutes les heures
- Scraping des sites de manga
- Détection de nouveaux chapitres
- Création de notifications pour les utilisateurs

## Base de données

### Schéma relationnel

```
users
├── id (PK)
├── email (UNIQUE)
├── password (hashed)
├── username
└── timestamps

mangas
├── id (PK)
├── title
├── url
├── cover_image
├── description
├── status
├── last_chapter_number
├── last_chapter_title
├── last_checked_at
└── timestamps

bookmarks (relation N:N users-mangas)
├── id (PK)
├── user_id (FK → users)
├── manga_id (FK → mangas)
├── is_favorite
├── notifications_enabled
└── timestamps

chapters
├── id (PK)
├── manga_id (FK → mangas)
├── chapter_number
├── title
├── url
├── release_date
├── page_count
└── created_at

reading_progress
├── id (PK)
├── user_id (FK → users)
├── chapter_id (FK → chapters)
├── manga_id (FK → mangas)
├── current_page
├── total_pages
├── is_completed
├── last_read_at
└── timestamps

notifications
├── id (PK)
├── user_id (FK → users)
├── manga_id (FK → mangas)
├── chapter_id (FK → chapters)
├── message
├── is_read
└── created_at

downloaded_chapters
├── id (PK)
├── user_id (FK → users)
├── chapter_id (FK → chapters)
├── local_path
├── file_size
└── downloaded_at
```

### Index pour performance

```sql
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_chapters_manga_id ON chapters(manga_id);
CREATE INDEX idx_progress_user_id ON reading_progress(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
```

## Sécurité

### Authentification
- JWT avec expiration configurable
- Tokens stockés dans AsyncStorage (mobile)
- Refresh automatique à implémenter

### Mots de passe
- Hachage avec bcryptjs (salt rounds: 10)
- Jamais stockés en clair
- Validation de complexité

### API
- CORS configuré
- Validation des inputs (express-validator)
- Protection contre les injections SQL via requêtes paramétrées
- Rate limiting à implémenter

## Flow de données

### Ajout d'un manga aux favoris

```
Mobile                    Backend                   Database
  │                         │                         │
  │  POST /bookmarks        │                         │
  ├────────────────────────>│                         │
  │                         │  INSERT INTO bookmarks  │
  │                         ├────────────────────────>│
  │                         │                         │
  │                         │<────────────────────────┤
  │      201 Created        │                         │
  │<────────────────────────┤                         │
  │                         │                         │
  │  Update local state     │                         │
  │                         │                         │
```

### Vérification de nouveaux chapitres

```
Cron Job                  Backend                   Database
  │                         │                         │
  │  Every hour             │                         │
  ├────────────────────────>│                         │
  │                         │  SELECT mangas with     │
  │                         │  notifications_enabled  │
  │                         ├────────────────────────>│
  │                         │<────────────────────────┤
  │                         │                         │
  │                         │  Scrape manga sites     │
  │                         │  (Cheerio + Axios)      │
  │                         │                         │
  │                         │  IF new chapter found   │
  │                         │  INSERT notification    │
  │                         ├────────────────────────>│
  │                         │                         │
  │                         │  Push notification      │
  │                         │  to mobile app          │
```

## Évolutions futures

### Optimisations
- [ ] Caching avec Redis
- [ ] CDN pour les images
- [ ] Pagination des listes
- [ ] Lazy loading des images

### Features
- [ ] WebSocket pour notifications temps réel
- [ ] GraphQL au lieu de REST
- [ ] Compression des téléchargements
- [ ] Statistiques de lecture

### Infrastructure
- [ ] Docker containerization
- [ ] CI/CD avec GitHub Actions
- [ ] Monitoring et logs (Sentry)
- [ ] Tests unitaires et d'intégration

---

**Version**: 1.0.0  
**Dernière mise à jour**: Novembre 2025
