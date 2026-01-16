# 📱 MangaTech - Concept du Projet

> **Document original** - Décembre 2024  
> **Dernière mise à jour** - Janvier 2026

---

## 🎯 Concept Principal

Développement d'une **application mobile personnelle** inspirée de MangaFox, conçue pour optimiser l'expérience de lecture de mangas en ligne. Cette application vise à **automatiser et améliorer** l'interaction avec les sites de scan existants.

---

## ✨ Fonctionnalités Principales

### 📖 Navigation Automatisée

- **Défilement automatique** : Progression fluide entre les chapitres sans intervention manuelle
- **Mode plein-écran automatique** : Optimisation de l'affichage pour une lecture immersive
- **Interface intuitive** : Navigation simplifiée adaptée aux habitudes de lecture mobile

### 📚 Gestion des Contenus

- **Système de signets** : Sauvegarde et organisation des adresses de scans favoris
- **Notifications intelligentes** : Alertes automatiques lors de la sortie de nouveaux chapitres
- **Suivi de progression** : Mémorisation de la position de lecture pour chaque série

### 🚀 Fonctionnalités Avancées (Objectif)

- **Mode hors-ligne** : Téléchargement et stockage local des chapitres pour une lecture sans connexion internet
- **Synchronisation** : Gestion optimisée de l'espace de stockage avec options de suppression automatique

---

## 🎓 Contexte et Objectifs

Cette application est développée dans un **cadre strictement personnel**, sans aucune intention commerciale. L'objectif est de créer un outil personnalisé répondant aux besoins spécifiques de lecture de mangas, en automatisant les tâches répétitives et en améliorant le confort d'utilisation.

---

## 👥 User Stories

### Fonctionnalités de Base

#### US01 - Navigation Automatique

**En tant qu'** utilisateur de l'application  
**Je veux** que l'application fasse défiler automatiquement les pages d'un chapitre  
**Afin de** lire de manière fluide sans avoir à toucher constamment l'écran

---

#### US02 - Affichage Plein-Écran

**En tant qu'** utilisateur  
**Je veux** que l'application passe automatiquement en mode plein-écran lors de la lecture  
**Afin d'** avoir une expérience immersive sans distractions

---

#### US03 - Gestion des Signets

**En tant que** lecteur de manga  
**Je veux** pouvoir sauvegarder l'adresse d'un scan de manga  
**Afin de** retrouver facilement mes séries favorites

---

#### US04 - Suivi de Progression

**En tant qu'** utilisateur  
**Je veux** que l'application mémorise où j'en suis dans ma lecture  
**Afin de** reprendre exactement où je me suis arrêté

---

### Fonctionnalités de Notification

#### US05 - Notifications de Nouveaux Chapitres

**En tant que** fan de manga  
**Je veux** être notifié automatiquement quand un nouveau chapitre sort  
**Afin de** ne pas rater les mises à jour de mes séries suivies

---

#### US06 - Gestion des Notifications

**En tant qu'** utilisateur  
**Je veux** pouvoir activer/désactiver les notifications par série  
**Afin de** contrôler les alertes selon mes préférences

---

### Fonctionnalités Avancées

#### US07 - Téléchargement Hors-Ligne

**En tant qu'** utilisateur mobile  
**Je veux** pouvoir télécharger des chapitres sur mon appareil  
**Afin de** lire sans connexion internet

---

#### US08 - Gestion du Stockage

**En tant qu'** utilisateur  
**Je veux** pouvoir gérer l'espace occupé par les téléchargements  
**Afin d'** optimiser l'utilisation de la mémoire de mon appareil

---

#### US09 - Lecture Hors-Ligne

**En tant qu'** utilisateur  
**Je veux** accéder à mes chapitres téléchargés même sans internet  
**Afin de** lire dans le métro, l'avion ou en zone de faible couverture

---

### Fonctionnalités d'Interface

#### US10 - Liste des Mangas Suivis

**En tant qu'** utilisateur  
**Je veux** voir la liste de tous mes mangas avec leur statut de lecture  
**Afin d'** avoir une vue d'ensemble de ma bibliothèque

---

#### US11 - Recherche et Ajout

**En tant qu'** utilisateur  
**Je veux** pouvoir ajouter facilement un nouveau manga à suivre  
**Afin d'** enrichir ma collection sans complexité

---

## 🗓️ Roadmap - Objectifs par Release

### 📦 Release 1 - **25%** (MVP)

**Fonctionnalités Critiques** (Must Have)

#### Interface de Base
- ✅ Écran d'accueil simple avec liste des mangas
- 🔄 Écran de lecture avec affichage plein-écran
- ✅ Navigation basique entre les écrans

#### Lecture Automatique (Cœur du MVP)
- ⏳ Défilement automatique des pages d'un chapitre
- ⏳ Contrôles basiques : Play/Pause, vitesse de défilement
- ✅ Mode plein-écran automatique lors de la lecture

#### Gestion Minimale des Mangas
- ✅ Ajout manuel d'un manga (URL + titre)
- ✅ Liste des mangas ajoutés
- 🔄 Accès direct à la lecture depuis la liste

#### Stockage Local Basique
- ✅ Sauvegarde de la liste des mangas
- ✅ Mémorisation de la position de lecture (chapitre actuel)

---

### 📦 Release 2 - **50%**

**Nouvelles Fonctionnalités Majeures**

#### Backend de Scraping
- ⏳ Serveur Node.js pour analyser les sites de scan
- ⏳ Détection automatique des nouveaux chapitres
- ✅ API REST pour communication app ↔ serveur
- ✅ Base de données pour stocker les métadonnées

#### Système de Notifications
- ⏳ Notifications push via Firebase
- ⏳ Vérification périodique des mises à jour
- ✅ Gestion des préférences de notification par manga

#### Amélioration Interface Utilisateur
- ⏳ Recherche intelligente de mangas
- ⏳ Statuts visuels (nouveau chapitre disponible)
- ⏳ Écran de paramètres pour notifications
- ✅ Synchronisation entre local et serveur

#### Gestion Avancée des Mangas
- ⏳ Ajout par recherche (plus seulement URL)
- ⏳ Métadonnées enrichies (cover, résumé, statut)
- ⏳ Catégories/Tags pour organisation
- ✅ Historique de lecture détaillé

---

### 📦 Release 3 - **75%**

**Nouvelles Fonctionnalités Majeures**

#### Système de Téléchargement
- ✅ Téléchargement automatique des nouveaux chapitres
- ✅ Téléchargement manuel à la demande
- ✅ Queue de téléchargement avec priorités
- ✅ Téléchargement en arrière-plan même app fermée
- ✅ Table downloaded_chapters en base de données

#### Lecture Hors-Ligne Complète
- 🔄 Mode hors-ligne avec interface adaptée
- 🔄 Synchronisation intelligente position de lecture
- 🔄 Gestion des chapitres téléchargés vs en ligne
- 🔄 Indicateurs visuels de statut (téléchargé/en ligne/en cours)

#### Gestion Avancée du Stockage
- ❌ Compression intelligente des images
- ❌ Nettoyage automatique chapitres lus
- ❌ Paramètres de stockage par utilisateur
- ❌ Statistiques d'usage espace disque

#### Expérience Utilisateur
- ❌ Gestes avancés (swipe, pinch-to-zoom)
- ❌ Mode sombre/clair automatique
- ❌ Personnalisation vitesse de défilement par manga

---

### 📦 Release 4 - **100%**

**Fonctionnalités Exceptionnelles** (Nice to Have++)

- ❌ Système de statistiques (temps passé sur chaque manga, nb de manga lu...)
- ❌ Thèmes personnalisés (cyberpunk, manga classic, minimal)
- ❌ Animations fluides et micro-interactions
- ❌ Widgets pour écran d'accueil mobile

---

## 📊 Légende

| Symbole | Signification |
|---------|---------------|
| ✅ | Implémenté |
| 🔄 | En cours |
| ⏳ | Planifié |
| ❌ | Non commencé |

---

## 📚 Documentation

Pour plus d'informations sur l'implémentation actuelle, consultez :

- **[README.md](./README.md)** - Vue d'ensemble du projet
- **[USER_STORIES.md](./USER_STORIES.md)** - User stories détaillées avec statuts
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture technique
- **[docs/](./docs/)** - Documentation complète

---

**Version du concept** : 1.0  
**Date de création** : Décembre 2024  
**Dernière révision** : Janvier 2026