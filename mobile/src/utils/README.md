# Utils

Fonctions utilitaires réutilisables dans l'app mobile.

## Fichiers

- `api.js` - Helpers pour les appels API (déjà existant dans services/)
- `storage.js` - Gestion du stockage local (AsyncStorage)
- `validators.js` - Validation des données
- `formatters.js` - Formatage de dates, nombres, etc.
- `constants.js` - Constantes de l'application

## Exemple

```javascript
import { formatDate, formatChapterNumber } from './utils/formatters';
import { storeData, getData } from './utils/storage';

// Formater une date
const date = formatDate(new Date());

// Sauvegarder des données
await storeData('user_preferences', { theme: 'dark' });

// Récupérer des données
const prefs = await getData('user_preferences');
```
