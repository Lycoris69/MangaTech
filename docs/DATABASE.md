# 🗄️ Documentation Base de Données - MangaTech

## Schéma de la base de données

### Table: `users`
Gestion des utilisateurs de l'application.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Identifiant unique |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email de l'utilisateur |
| password | VARCHAR(255) | NOT NULL | Hash du mot de passe (bcrypt) |
| username | VARCHAR(50) | NOT NULL | Nom d'utilisateur |
| created_at | TIMESTAMP | DEFAULT NOW() | Date de création |
| updated_at | TIMESTAMP | DEFAULT NOW() | Date de modification |

**Index:**
- `idx_users_email` sur `email`

---

### Table: `mangas`
Catalogue des mangas suivis par les utilisateurs.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Identifiant unique |
| user_id | INTEGER | FOREIGN KEY (users.id) | Propriétaire du manga |
| title | VARCHAR(255) | NOT NULL | Titre du manga |
| url | TEXT | NOT NULL | URL du manga sur le site de scan |
| cover_url | TEXT | | URL de l'image de couverture |
| status | VARCHAR(20) | DEFAULT 'reading' | Statut de lecture |
| notification_enabled | BOOLEAN | DEFAULT true | Notifications activées |
| last_chapter_available | INTEGER | | Dernier chapitre disponible détecté |
| created_at | TIMESTAMP | DEFAULT NOW() | Date d'ajout |
| updated_at | TIMESTAMP | DEFAULT NOW() | Date de modification |

**Enum `status`:** `reading`, `completed`, `on_hold`, `dropped`, `not_started`

**Index:**
- `idx_mangas_user_id` sur `user_id`
- `idx_mangas_status` sur `status`

---

### Table: `reading_progress`
Suivi de la progression de lecture pour chaque manga.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Identifiant unique |
| user_id | INTEGER | FOREIGN KEY (users.id) | Utilisateur |
| manga_id | INTEGER | FOREIGN KEY (mangas.id) | Manga concerné |
| current_chapter | INTEGER | NOT NULL | Chapitre en cours |
| current_page | INTEGER | DEFAULT 1 | Page actuelle |
| last_read_at | TIMESTAMP | DEFAULT NOW() | Dernière lecture |
| created_at | TIMESTAMP | DEFAULT NOW() | Date de création |
| updated_at | TIMESTAMP | DEFAULT NOW() | Date de modification |

**Contraintes:**
- `UNIQUE(user_id, manga_id)` - Un seul suivi par manga et utilisateur

**Index:**
- `idx_reading_progress_user_manga` sur `(user_id, manga_id)`

---

### Table: `bookmarks`
Signets de lecture pour marquer des pages importantes.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Identifiant unique |
| user_id | INTEGER | FOREIGN KEY (users.id) | Utilisateur |
| manga_id | INTEGER | FOREIGN KEY (mangas.id) | Manga concerné |
| chapter | INTEGER | NOT NULL | Numéro du chapitre |
| page | INTEGER | NOT NULL | Numéro de la page |
| note | TEXT | | Note personnelle (optionnelle) |
| created_at | TIMESTAMP | DEFAULT NOW() | Date de création |

**Index:**
- `idx_bookmarks_user_manga` sur `(user_id, manga_id)`

---

### Table: `notifications`
Historique des notifications envoyées.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Identifiant unique |
| user_id | INTEGER | FOREIGN KEY (users.id) | Destinataire |
| manga_id | INTEGER | FOREIGN KEY (mangas.id) | Manga concerné |
| chapter_number | INTEGER | NOT NULL | Numéro du nouveau chapitre |
| title | VARCHAR(255) | NOT NULL | Titre de la notification |
| body | TEXT | NOT NULL | Contenu de la notification |
| sent_at | TIMESTAMP | DEFAULT NOW() | Date d'envoi |
| read_at | TIMESTAMP | | Date de lecture |

**Index:**
- `idx_notifications_user` sur `user_id`
- `idx_notifications_sent_at` sur `sent_at`

---

### Table: `downloads` (Release 3)
Gestion des chapitres téléchargés pour lecture hors-ligne.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Identifiant unique |
| user_id | INTEGER | FOREIGN KEY (users.id) | Utilisateur |
| manga_id | INTEGER | FOREIGN KEY (mangas.id) | Manga |
| chapter_number | INTEGER | NOT NULL | Numéro du chapitre |
| status | VARCHAR(20) | DEFAULT 'pending' | Statut du téléchargement |
| file_path | TEXT | | Chemin du fichier téléchargé |
| file_size | BIGINT | | Taille en octets |
| downloaded_at | TIMESTAMP | | Date de téléchargement |
| created_at | TIMESTAMP | DEFAULT NOW() | Date de création |

**Enum `status`:** `pending`, `downloading`, `completed`, `failed`

**Index:**
- `idx_downloads_user_manga` sur `(user_id, manga_id)`
- `idx_downloads_status` sur `status`

---

## Relations

```
users (1) ──< (N) mangas
users (1) ──< (N) reading_progress
users (1) ──< (N) bookmarks
users (1) ──< (N) notifications
users (1) ──< (N) downloads

mangas (1) ──< (N) reading_progress
mangas (1) ──< (N) bookmarks
mangas (1) ──< (N) notifications
mangas (1) ──< (N) downloads
```

## Migrations

Les migrations sont gérées dans `backend/database/migrations/`.

### Exécuter les migrations
```bash
make db-migrate
```

### Réinitialiser la DB
```bash
make db-reset  # ⚠️ Supprime toutes les données
```

## Seeds (Données de test)

Pour peupler la DB avec des données de test :
```bash
npm run seed
```

Les seeds sont dans `backend/database/seeds/`.
