# Models

Ce dossier contient les modèles de données pour interagir avec la base de données.

## Structure

Chaque modèle correspond à une table de la base de données :

- `User.js` - Gestion des utilisateurs
- `Manga.js` - Gestion des mangas
- `ReadingProgress.js` - Progression de lecture
- `Bookmark.js` - Signets
- `Notification.js` - Notifications
- `Download.js` - Téléchargements (Release 3)

## Exemple d'utilisation

```javascript
const User = require('./models/User');

// Créer un utilisateur
const user = await User.create({
  email: 'user@example.com',
  password: 'hashedpassword',
  username: 'johndoe'
});

// Trouver un utilisateur
const user = await User.findByEmail('user@example.com');

// Mettre à jour
await User.update(userId, { username: 'newname' });
```

## Conventions

- Méthodes statiques pour les opérations CRUD
- Validation des données avant insertion
- Gestion des erreurs avec try/catch
- Utilisation de transactions si nécessaire
