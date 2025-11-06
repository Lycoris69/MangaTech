# Shared Module

Ce dossier contient les types, constantes et utilitaires partagés entre le backend et l'application mobile.

## Structure

- `types.js` - Définitions des types et énumérations
- `constants.js` - Constantes partagées (endpoints API, codes d'erreur, etc.)

## Utilisation

### Backend
```javascript
const { ReadingStatus } = require('../shared/types');
const { ENDPOINTS } = require('../shared/constants');
```

### Mobile
```javascript
import { ReadingStatus } from '../../shared/types';
import { ENDPOINTS } from '../../shared/constants';
```

## Avantages

- **Cohérence** : Une seule source de vérité pour les structures de données
- **Maintenance** : Modifications centralisées
- **Type Safety** : Réduction des erreurs de typage
