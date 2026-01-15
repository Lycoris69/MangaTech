# User Stories - MangaTech

## Fonctionnalités de Base

### US01 - Navigation Automatique
**En tant qu'** utilisateur de l'application
**Je veux** que l'application fasse défiler automatiquement les pages d'un chapitre
**Afin de** lire de manière fluide sans avoir à toucher constamment l'écran

**Critères d'acceptation:**
- [ ] Bouton pour activer/désactiver le défilement automatique
- [ ] Vitesse de défilement réglable
- [ ] Pause automatique en fin de chapitre
- [ ] Option pour passer automatiquement au chapitre suivant

---

### US02 - Affichage Plein-Écran
**En tant qu'** utilisateur
**Je veux** que l'application passe automatiquement en mode plein-écran lors de la lecture
**Afin d'** avoir une expérience immersive sans distractions

**Critères d'acceptation:**
- [ ] Mode plein-écran automatique au démarrage de la lecture
- [ ] Masquage des barres de navigation
- [ ] Tap pour afficher/masquer les contrôles
- [ ] Sortie du mode plein-écran avec bouton retour

---

### US03 - Gestion des Signets
**En tant que** lecteur de manga
**Je veux** pouvoir sauvegarder l'adresse d'un scan de manga
**Afin de** retrouver facilement mes séries favorites

**Critères d'acceptation:**
- [x] Bouton pour ajouter un manga aux favoris
- [x] Liste de tous les mangas sauvegardés
- [x] Option pour marquer comme favori
- [x] Suppression d'un signet
- [x] Recherche dans les signets

**Statut:** ✅ Implémenté (backend + frontend)

---

### US04 - Suivi de Progression
**En tant qu'** utilisateur
**Je veux** que l'application mémorise où j'en suis dans ma lecture
**Afin de** reprendre exactement où je me suis arrêté

**Critères d'acceptation:**
- [x] Sauvegarde automatique de la page en cours
- [x] Sauvegarde du dernier chapitre lu
- [ ] Bouton "Continuer la lecture" sur la page d'accueil
- [x] Historique de lecture
- [ ] Pourcentage de progression par manga

**Statut:** ⚠️ Partiellement implémenté (backend complet, UI à améliorer)

---

## Fonctionnalités de Notification

### US05 - Notifications de Nouveaux Chapitres
**En tant que** fan de manga
**Je veux** être notifié automatiquement quand un nouveau chapitre sort
**Afin de** ne pas rater les mises à jour de mes séries suivies

**Critères d'acceptation:**
- [x] Système de vérification périodique des nouveaux chapitres
- [x] Notification push lors d'une nouvelle sortie
- [x] Affichage dans l'onglet notifications
- [ ] Badge sur l'icône de l'app
- [ ] Notification groupée par manga

**Statut:** ⚠️ Partiellement implémenté (infrastructure prête, scraping à implémenter)

---

### US06 - Gestion des Notifications
**En tant qu'** utilisateur
**Je veux** pouvoir activer/désactiver les notifications par série
**Afin de** contrôler les alertes selon mes préférences

**Critères d'acceptation:**
- [x] Toggle notifications par manga
- [x] Paramètre global pour toutes les notifications
- [x] Marquer comme lu
- [x] Supprimer une notification
- [x] Marquer toutes comme lues

**Statut:** ✅ Implémenté

---

## Fonctionnalités Avancées

### US07 - Téléchargement Hors-Ligne
**En tant qu'** utilisateur mobile
**Je veux** pouvoir télécharger des chapitres sur mon appareil
**Afin de** lire sans connexion internet

**Critères d'acceptation:**
- [x] Bouton de téléchargement par chapitre
- [x] Téléchargement en arrière-plan
- [x] Barre de progression du téléchargement
- [x] Notification de fin de téléchargement
- [x] Téléchargement de plusieurs chapitres
- [x] Table downloaded_chapters en base de données

**Statut:** ✅ Implémenté

---

### US08 - Gestion du Stockage
**En tant qu'** utilisateur
**Je veux** pouvoir gérer l'espace occupé par les téléchargements
**Afin d'** optimiser l'utilisation de la mémoire de mon appareil

**Critères d'acceptation:**
- [ ] Affichage de l'espace utilisé
- [ ] Suppression sélective de chapitres
- [ ] Suppression automatique des chapitres lus
- [ ] Limite de stockage configurable
- [ ] Nettoyage des anciens chapitres

**Statut:** 📝 À développer

---

### US09 - Lecture Hors-Ligne
**En tant qu'** utilisateur
**Je veux** accéder à mes chapitres téléchargés même sans internet
**Afin de** lire dans le métro, l'avion ou en zone de faible couverture

**Critères d'acceptation:**
- [x] Indicateur visuel des chapitres téléchargés
- [ ] Lecture fluide sans connexion
- [ ] Synchronisation de la progression
- [ ] Filtrage des mangas avec contenu hors-ligne
- [ ] Mise à jour automatique en ligne

**Statut:** 🔄 En développement

---

## Fonctionnalités d'Interface

### US10 - Liste des Mangas Suivis
**En tant qu'** utilisateur
**Je veux** voir la liste de tous mes mangas avec leur statut de lecture
**Afin d'** avoir une vue d'ensemble de ma bibliothèque

**Critères d'acceptation:**
- [x] Liste scrollable des mangas
- [x] Affichage du titre et dernier chapitre
- [x] Indicateur des favoris
- [x] Pull-to-refresh pour actualiser
- [ ] Tri (alphabétique, récent, progression)
- [ ] Filtres (en cours, terminés, favoris)

**Statut:** ⚠️ Partiellement implémenté (liste de base fonctionnelle)

---

### US11 - Recherche et Ajout
**En tant qu'** utilisateur
**Je veux** pouvoir ajouter facilement un nouveau manga à suivre
**Afin d'** enrichir ma collection sans complexité

**Critères d'acceptation:**
- [ ] Champ de recherche
- [ ] Saisie d'URL directe
- [ ] Détection automatique du titre
- [ ] Prévisualisation avant ajout
- [ ] Ajout en un clic
- [ ] Suggestions de mangas populaires

**Statut:** 📝 À développer

---

## Légende des Statuts

- ✅ **Implémenté**: Fonctionnalité complète et testée
- ⚠️ **Partiellement implémenté**: Backend ou frontend manquant
- 🔄 **En développement**: Travail en cours
- 📝 **À développer**: Prévu mais pas commencé

---

## Priorités de Développement

### Phase 1 - MVP (Minimum Viable Product) ✅
- [x] Authentification
- [x] Gestion des signets
- [x] Notifications (infrastructure)
- [x] Suivi de progression (backend)

### Phase 2 - Expérience de Lecture 🔄
- [x] Écran de détails du manga
- [x] Lecteur de chapitres
- [x] Navigation automatique
- [x] Mode plein-écran
- [ ] Continuer la lecture

### Phase 3 - Automatisation 🔄
- [x] Web scraping automatique
- [x] Détection de nouveaux chapitres
- [ ] Notifications push actives

### Phase 4 - Mode Hors-ligne 📝
- [ ] Téléchargement de chapitres
- [ ] Lecture hors-ligne
- [ ] Gestion du stockage
- [ ] Synchronisation

### Phase 5 - Amélioration UX 📝
- [ ] Recherche et ajout avancés
- [ ] Tri et filtres
- [ ] Paramètres personnalisables
- [ ] Thème sombre
- [ ] Statistiques de lecture
