# Components

Composants React Native réutilisables.

## Structure recommandée

```
components/
├── common/           # Composants génériques
│   ├── Button.js
│   ├── Input.js
│   └── Card.js
├── manga/           # Composants liés aux mangas
│   ├── MangaCard.js
│   ├── MangaList.js
│   └── ChapterItem.js
├── reader/          # Composants de lecture
│   ├── AutoScroller.js
│   ├── ReaderControls.js
│   └── PageViewer.js
└── layout/          # Composants de layout
    ├── Header.js
    └── TabBar.js
```

## Conventions

- Un composant par fichier
- Nommage en PascalCase
- Props destructurées
- PropTypes pour la validation
- Commentaires JSDoc

## Exemple

```javascript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';

/**
 * Card component for displaying manga information
 */
const MangaCard = ({ title, coverUrl, onPress }) => {
  return (
    <View style={styles.container}>
      <Text>{title}</Text>
    </View>
  );
};

MangaCard.propTypes = {
  title: PropTypes.string.isRequired,
  coverUrl: PropTypes.string,
  onPress: PropTypes.func
};

export default MangaCard;
```
