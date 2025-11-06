# Utils

Fonctions utilitaires réutilisables dans tout le backend.

## Fichiers

- `validators.js` - Validation des données (email, URL, etc.)
- `logger.js` - Système de logging
- `errors.js` - Classes d'erreurs personnalisées
- `scraper.js` - Utilitaires de scraping (Release 2)
- `helpers.js` - Fonctions helper générales

## Exemple

```javascript
const { validateEmail, validateUrl } = require('./utils/validators');
const logger = require('./utils/logger');

if (!validateEmail(email)) {
  logger.error('Invalid email format');
  throw new ValidationError('Invalid email');
}
```
