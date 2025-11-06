# 📡 Documentation API - MangaTech

Base URL: `http://localhost:3000/api/v1`

## Authentification

Toutes les routes (sauf `/auth/*`) nécessitent un token JWT dans le header :
```
Authorization: Bearer <token>
```

### POST /auth/register
Créer un nouveau compte utilisateur.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "username": "johndoe"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /auth/login
Se connecter avec un compte existant.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Mangas

### GET /mangas
Récupérer la liste des mangas de l'utilisateur.

**Query params:**
- `status` (optional): `reading`, `completed`, `on_hold`, `dropped`
- `page` (optional): Numéro de page (default: 1)
- `limit` (optional): Nombre par page (default: 20)

**Response:** `200 OK`
```json
{
  "mangas": [
    {
      "id": 1,
      "title": "One Piece",
      "url": "https://mangafox.com/one-piece",
      "cover_url": "https://...",
      "status": "reading",
      "last_chapter_read": 1050,
      "total_chapters": 1098,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-20T15:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

### POST /mangas
Ajouter un nouveau manga.

**Body:**
```json
{
  "title": "One Piece",
  "url": "https://mangafox.com/one-piece",
  "cover_url": "https://..."
}
```

**Response:** `201 Created`
```json
{
  "manga": {
    "id": 1,
    "title": "One Piece",
    "url": "https://mangafox.com/one-piece",
    "status": "reading"
  }
}
```

### GET /mangas/:id
Récupérer les détails d'un manga.

**Response:** `200 OK`
```json
{
  "id": 1,
  "title": "One Piece",
  "url": "https://mangafox.com/one-piece",
  "cover_url": "https://...",
  "status": "reading",
  "last_chapter_read": 1050,
  "notification_enabled": true,
  "created_at": "2024-01-15T10:00:00Z"
}
```

### PUT /mangas/:id
Mettre à jour un manga.

**Body:**
```json
{
  "status": "completed",
  "notification_enabled": false
}
```

**Response:** `200 OK`

### DELETE /mangas/:id
Supprimer un manga.

**Response:** `204 No Content`

---

## Progression

### GET /progress/:mangaId
Récupérer la progression de lecture.

**Response:** `200 OK`
```json
{
  "manga_id": 1,
  "current_chapter": 1050,
  "current_page": 15,
  "last_read_at": "2024-01-20T15:30:00Z"
}
```

### PUT /progress/:mangaId
Mettre à jour la progression.

**Body:**
```json
{
  "current_chapter": 1051,
  "current_page": 1
}
```

**Response:** `200 OK`

---

## Chapitres

### GET /mangas/:mangaId/chapters
Liste des chapitres disponibles (via scraping).

**Response:** `200 OK`
```json
{
  "chapters": [
    {
      "number": 1098,
      "title": "The Birth of Luffy's Dream",
      "url": "https://...",
      "release_date": "2024-01-15"
    }
  ]
}
```

### GET /mangas/:mangaId/chapters/:chapterId
Contenu d'un chapitre (images).

**Response:** `200 OK`
```json
{
  "chapter": {
    "number": 1098,
    "title": "The Birth of Luffy's Dream",
    "pages": [
      "https://.../page1.jpg",
      "https://.../page2.jpg"
    ]
  }
}
```

---

## Bookmarks

### GET /bookmarks
Liste des signets.

**Response:** `200 OK`
```json
{
  "bookmarks": [
    {
      "id": 1,
      "manga_id": 1,
      "chapter": 1050,
      "page": 15,
      "note": "Epic fight scene",
      "created_at": "2024-01-20T10:00:00Z"
    }
  ]
}
```

### POST /bookmarks
Ajouter un signet.

**Body:**
```json
{
  "manga_id": 1,
  "chapter": 1050,
  "page": 15,
  "note": "Epic fight scene"
}
```

**Response:** `201 Created`

---

## Notifications

### GET /notifications/preferences
Préférences de notifications.

**Response:** `200 OK`
```json
{
  "global_enabled": true,
  "mangas": [
    {
      "manga_id": 1,
      "enabled": true
    }
  ]
}
```

### PUT /notifications/toggle/:mangaId
Activer/désactiver les notifications pour un manga.

**Body:**
```json
{
  "enabled": false
}
```

**Response:** `200 OK`

---

## Codes d'erreur

| Code | Message |
|------|---------|
| 400 | Bad Request - Données invalides |
| 401 | Unauthorized - Token manquant ou invalide |
| 403 | Forbidden - Accès refusé |
| 404 | Not Found - Ressource introuvable |
| 409 | Conflict - Ressource déjà existante |
| 500 | Internal Server Error |

**Format d'erreur:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": {}
  }
}
```
