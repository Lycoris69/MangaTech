# 📑 Index de la Documentation - MangaTech

Guide de navigation dans toute la documentation du projet.

---

## 🚀 Pour commencer

**Nouveau sur le projet ?** Commencez par là :

1. **[README.md](../README.md)** - Vue d'ensemble du projet
2. **[docs/QUICK_START.md](./QUICK_START.md)** - Démarrage en 3 minutes
3. **[docs/GETTING_STARTED.md](./GETTING_STARTED.md)** - Guide détaillé

---

## 📚 Documentation principale

### Vue d'ensemble
- **[README.md](../README.md)** - Documentation principale du projet
  - Concept, fonctionnalités, installation, API, troubleshooting
  - Audience : Tous

### Démarrage rapide
- **[docs/QUICK_START.md](./QUICK_START.md)** - Guide de démarrage express
  - Installation en 3 minutes, commandes essentielles, problèmes fréquents
  - Audience : Développeurs pressés

- **[docs/GETTING_STARTED.md](./GETTING_STARTED.md)** - Guide de démarrage complet
  - Prérequis, installation détaillée, configuration, premiers pas
  - Audience : Nouveaux contributeurs

### Architecture
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - Architecture technique détaillée
  - Stack technique, patterns, structure, choix de conception
  - Audience : Développeurs avancés

- **[docs/PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Structure du projet
  - Organisation des dossiers, responsabilités, conventions
  - Audience : Tous les développeurs

- **[docs/ORGANIZATION.md](./ORGANIZATION.md)** - Organisation visuelle
  - Vue d'ensemble visuelle, progression, roadmap
  - Audience : Tous

### API & Base de données
- **[docs/API.md](./API.md)** - Documentation complète de l'API
  - Tous les endpoints, exemples de requêtes/réponses, codes d'erreur
  - Audience : Développeurs frontend, testeurs

- **[docs/DATABASE.md](./DATABASE.md)** - Schéma de la base de données
  - Tables, relations, migrations, types de données
  - Audience : Développeurs backend

### User Stories
- **[USER_STORIES.md](../USER_STORIES.md)** - User stories et roadmap
  - Fonctionnalités par release, statuts, objectifs
  - Audience : Product owners, développeurs

---

## 📁 Documentation par module

### Backend

- **[backend/models/README.md](../backend/models/README.md)** - Guide des modèles
  - Structure, conventions, exemples d'utilisation
  
- **[backend/utils/README.md](../backend/utils/README.md)** - Utilitaires backend
  - Validators, logger, errors, helpers

### Mobile

- **[mobile/src/components/README.md](../mobile/src/components/README.md)** - Composants React Native
  - Structure, conventions, PropTypes, exemples

- **[mobile/src/utils/README.md](../mobile/src/utils/README.md)** - Utilitaires mobile
  - Storage, formatters, validators, constants

### Shared

- **[shared/README.md](../shared/README.md)** - Code partagé
  - Types, constantes, utilisation backend/mobile

---

## 🎯 Documentation par cas d'usage

### Je veux installer le projet
1. **[docs/QUICK_START.md](./QUICK_START.md)** - Installation rapide
2. **[docs/GETTING_STARTED.md](./GETTING_STARTED.md)** - Installation détaillée

### Je veux comprendre l'architecture
1. **[docs/ORGANIZATION.md](./ORGANIZATION.md)** - Vue visuelle
2. **[docs/PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Structure détaillée
3. **[ARCHITECTURE.md](../ARCHITECTURE.md)** - Architecture technique

### Je veux développer une nouvelle fonctionnalité
1. **[docs/PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Où créer les fichiers
2. **[docs/API.md](./API.md)** - Endpoints existants
3. **[docs/DATABASE.md](./DATABASE.md)** - Schéma de la base
4. **[backend/models/README.md](../backend/models/README.md)** - Créer un modèle
5. **[mobile/src/components/README.md](../mobile/src/components/README.md)** - Créer un composant

### Je veux tester l'API
1. **[docs/API.md](./API.md)** - Documentation complète
2. **[docs/QUICK_START.md](./QUICK_START.md)** - Exemples de tests

### Je veux modifier la base de données
1. **[docs/DATABASE.md](./DATABASE.md)** - Schéma actuel
2. **[docs/GETTING_STARTED.md](./GETTING_STARTED.md)** - Exécuter les migrations

### Je rencontre un problème
1. **[docs/QUICK_START.md](./QUICK_START.md)** - Problèmes fréquents
2. **[docs/GETTING_STARTED.md](./GETTING_STARTED.md)** - Troubleshooting
3. **[README.md](../README.md)** - Section troubleshooting

---

## 📊 Documentation par niveau

### Débutant (nouveau sur le projet)
1. **[README.md](../README.md)** - Vue d'ensemble
2. **[docs/QUICK_START.md](./QUICK_START.md)** - Démarrage rapide
3. **[docs/ORGANIZATION.md](./ORGANIZATION.md)** - Vue visuelle
4. **[USER_STORIES.md](../USER_STORIES.md)** - Fonctionnalités

### Intermédiaire (développement de features)
1. **[docs/PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Structure
2. **[docs/API.md](./API.md)** - API
3. **[docs/DATABASE.md](./DATABASE.md)** - Base de données
4. **[backend/models/README.md](../backend/models/README.md)** - Modèles
5. **[mobile/src/components/README.md](../mobile/src/components/README.md)** - Composants

### Avancé (architecture et optimisation)
1. **[ARCHITECTURE.md](../ARCHITECTURE.md)** - Architecture technique
2. **[docs/PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Organisation avancée
3. **[docs/DATABASE.md](./DATABASE.md)** - Optimisation BDD

---

## 🛠️ Scripts et outils

### Scripts disponibles

- **`scripts/setup.sh`** - Installation automatique du projet
- **`scripts/seed-db.js`** - Peuplement de la base avec des données de test
- **`Makefile`** - Commandes automatisées (voir `make help`)

### Commandes Make

```bash
make help          # Liste toutes les commandes
make install       # Installation complète
make start         # Démarrer tout
make stop          # Arrêter tout
make status        # Vérifier le statut
make logs          # Voir les logs
make db-migrate    # Migrations
make db-reset      # Réinitialiser la DB
```

Voir **[docs/QUICK_START.md](./QUICK_START.md)** pour plus de détails.

---

## 📝 Fichiers de configuration

### Backend
- `backend/.env` - Variables d'environnement (créé par setup.sh)
- `backend/.env.example` - Template de configuration
- `backend/package.json` - Dépendances Node.js
- `docker-compose.yml` - Configuration PostgreSQL

### Mobile
- `mobile/.env` - Variables d'environnement (créé par setup.sh)
- `mobile/.env.example` - Template de configuration
- `mobile/app.json` - Configuration Expo
- `mobile/package.json` - Dépendances React Native

---

## 🔍 Recherche rapide

### Par fonctionnalité

| Fonctionnalité | Documentation |
|----------------|---------------|
| Authentification | [API.md](./API.md#authentification), [backend/controllers/auth.controller.js](../backend/src/controllers/auth.controller.js) |
| Mangas | [API.md](./API.md#mangas), [DATABASE.md](./DATABASE.md#table-mangas) |
| Progression | [API.md](./API.md#progression), [DATABASE.md](./DATABASE.md#table-reading_progress) |
| Notifications | [API.md](./API.md#notifications), [DATABASE.md](./DATABASE.md#table-notifications) |
| Lecteur auto | [USER_STORIES.md](../USER_STORIES.md#us01), À implémenter |

### Par technologie

| Technologie | Documentation |
|-------------|---------------|
| PostgreSQL | [DATABASE.md](./DATABASE.md), docker-compose.yml |
| Express.js | [ARCHITECTURE.md](../ARCHITECTURE.md), backend/src/server.js |
| React Native | [mobile/](../mobile/), [components README](../mobile/src/components/README.md) |
| JWT | [API.md](./API.md#authentification), auth.middleware.js |
| Docker | docker-compose.yml, [GETTING_STARTED.md](./GETTING_STARTED.md) |

---

## 🎨 Diagrammes et schémas

- **Architecture globale** : [ORGANIZATION.md](./ORGANIZATION.md#architecture-technique)
- **Structure de fichiers** : [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
- **Schéma de base de données** : [DATABASE.md](./DATABASE.md#relations)
- **Flow d'authentification** : [API.md](./API.md#authentification)

---

## 🔄 Mises à jour

### Comment maintenir la documentation ?

1. **Nouvelle fonctionnalité** → Mettre à jour :
   - [USER_STORIES.md](../USER_STORIES.md) (ajouter/cocher)
   - [API.md](./API.md) (si nouvel endpoint)
   - [DATABASE.md](./DATABASE.md) (si nouvelle table)
   - [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) (si nouveau module)

2. **Changement d'architecture** → Mettre à jour :
   - [ARCHITECTURE.md](../ARCHITECTURE.md)
   - [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
   - [ORGANIZATION.md](./ORGANIZATION.md)

3. **Nouvelle API** → Mettre à jour :
   - [API.md](./API.md)
   - [shared/constants.js](../shared/constants.js) (ENDPOINTS)

4. **Modification BDD** → Mettre à jour :
   - [DATABASE.md](./DATABASE.md)
   - Créer une migration dans `backend/database/migrations/`

---

## 📞 Contact et contribution

- **Issues GitHub** : [github.com/Lycoris69/MangaTech/issues](https://github.com/Lycoris69/MangaTech/issues)
- **Proposer une amélioration** : Ouvrir une issue ou PR
- **Signaler un bug** : Voir [README.md](../README.md#contributing)

---

## 📈 Progression de la documentation

| Module | Statut | Complétude |
|--------|--------|-----------|
| Installation | ✅ Complet | 100% |
| API | ✅ Complet | 100% |
| Base de données | ✅ Complet | 100% |
| Architecture | ✅ Complet | 100% |
| Guides par module | ✅ Complet | 100% |
| Exemples de code | 🚧 En cours | 60% |
| Diagrammes | ✅ Complet | 100% |
| Tutoriels vidéo | ❌ À faire | 0% |

---

**Dernière mise à jour** : 6 Novembre 2025  
**Version de la documentation** : 1.0.0

**Légende** :
- ✅ Complet et à jour
- 🚧 En cours de rédaction
- ❌ Pas encore créé
