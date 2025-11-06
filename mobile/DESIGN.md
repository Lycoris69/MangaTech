# 🎨 MangaTech UI/UX Design System

## 📱 Design Implementation

### **Theme: Cyber Neon (Dark Mode)**
- **Primary Colors**: Purple (#9333EA) & Cyan (#06B6D4)
- **Background**: Dark gradients (#0A0A0F → #1A1A24)
- **Accents**: Pink (#EC4899) for special highlights
- **Effects**: Holographic gradients, neon glow shadows

---

## 🖼️ Screens Implemented

### 1. **Home Screen** ✅
**Layout:**
- Holographic "MangaTech" header with search button
- 3 sections: Recents, New Releases, Trending
- 2-column grid with abstract manga cards
- Neon-bordered cards with glow effects

**Components:**
- `HolographicText` for branding
- `MangaCard` with purple/cyan glow
- `GradientBackground` (dark variant)

---

### 2. **Reader Screen** ✅
**Layout:**
- Top bar: Back button, Chapter title, Menu (vertical dots)
- Vertical FlatList for pages (pagingEnabled)
- Progress bar with neon fill
- Bottom controls: `<< Previous | Page indicator | Next >>`

**Features:**
- Abstract page placeholders with patterns
- Purple neon borders on pages
- Smooth page transitions
- Real-time progress tracking

**Components:**
- `GradientBackground`
- Custom styled FlatList
- Neon-styled buttons

---

### 3. **Library Screen** ✅
**Layout:**
- "Library" title + menu button
- Filter tabs: All, Reading, Completed, Bookmarked
- 2-column grid of manga cards
- Scrollable content

**Features:**
- Active tab with purple highlight
- Neon borders on active filter
- Grid layout with proper spacing

**Components:**
- `MangaCard` for grid items
- Styled tabs with active state
- `GradientBackground`

---

### 4. **Settings Screen** ✅
**Layout:**
- "Settings" header
- Grouped sections: Reading, Appearance, Notifications, Downloads, Account, About
- Toggle switches with neon colors
- Arrow indicators for sub-menus
- Logout button at bottom

**Features:**
- Icon + title + description rows
- Custom Switch colors (purple when active)
- NeonCard for each setting row
- Sections with uppercase labels

**Components:**
- `NeonCard` for setting rows
- `GlowButton` for logout
- Custom Switch styling

---

## 🎭 Logo & Splash Screen

### **Logo3D** ✅
- **Design**: Holographic "MT" monogram
- **Effects**: 
  - Multi-color gradient (purple → cyan → pink)
  - Glow circles background
  - 3D depth with shadow strokes
  - SVG-based for perfect scaling

### **SplashScreen** ✅
- **Background**: Black gradient
- **Animations**:
  - Fade in (800ms)
  - Scale spring effect
  - Pulsing glow ring (1.5s loop)
- **Elements**:
  - Centered Logo3D (180px)
  - Holographic "MangaTech" text
  - Bottom accent line
- **Duration**: 2.5 seconds auto-dismiss

---

## 🧩 Reusable UI Components

### **NeonCard**
```javascript
<NeonCard glowColor="purple|cyan|pink|none" gradient={true}>
  {children}
</NeonCard>
```
- Gradient background or solid color
- Customizable glow effects
- Neon borders

### **GlowButton**
```javascript
<GlowButton 
  title="Text" 
  variant="primary|secondary|outline"
  loading={false}
  onPress={() => {}}
/>
```
- 3 variants: gradient primary, solid secondary, outline
- Purple glow on primary
- Loading state with spinner

### **HolographicText**
```javascript
<HolographicText fontSize={32} fontWeight="900" glow>
  MangaTech
</HolographicText>
```
- Multi-color gradient text
- Optional glow effect
- Uses MaskedView for gradient masking

### **MangaCard**
```javascript
<MangaCard 
  title="Manga Title" 
  isRecent={false}
  onPress={() => {}}
/>
```
- 2:3 aspect ratio
- Abstract pattern placeholder
- Different glow for recent items (cyan vs purple)
- Title overlay at bottom

### **GradientBackground**
```javascript
<GradientBackground variant="dark|primary|neon">
  {children}
</GradientBackground>
```
- Full-screen gradient container
- 3 presets for different screens

---

## 🎨 Theme Structure

**File:** `mobile/src/styles/theme.js`

### Colors
- `colors.purple.{light, main, dark, neon, glow}`
- `colors.cyan.{light, main, dark, neon, glow}`
- `colors.text.{primary, secondary, tertiary, disabled}`

### Gradients
- `gradients.primary` - [Purple → Cyan]
- `gradients.holographic` - [Purple → Cyan → Pink → Purple]
- `gradients.card` - Semi-transparent overlays

### Shadows (Glow Effects)
- `shadows.purpleGlow` - Purple neon glow
- `shadows.cyanGlow` - Cyan neon glow
- `shadows.pinkGlow` - Pink accent glow

### Spacing
- xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48

### Border Radius
- sm: 4, md: 8, lg: 12, xl: 16, xxl: 24, full: 9999

---

## 📐 Navigation

### **TabNavigator** ✅
- 4 tabs: Home, Reader, Library, Settings
- BlurView background (iOS/Android)
- Neon active indicator
- Purple glow on active icon
- Custom icon container with rounded background

**Tab Bar:**
- Height: 70px
- Icon size: 28px
- Active: Purple background + neon indicator line
- Inactive: Transparent

---

## 🚀 Installation & Usage

### **Dependencies Installed:**
```bash
npm install expo-linear-gradient expo-blur react-native-svg @react-native-masked-view/masked-view
```

### **File Structure:**
```
mobile/src/
├── styles/
│   └── theme.js              # Design tokens
├── components/
│   ├── ui/
│   │   ├── NeonCard.js
│   │   ├── GlowButton.js
│   │   ├── HolographicText.js
│   │   ├── MangaCard.js
│   │   ├── GradientBackground.js
│   │   └── index.js          # Barrel export
│   └── Logo3D.js             # SVG logo
├── screens/
│   ├── SplashScreen.js       # Animated splash
│   ├── HomeScreen.js         # Main feed
│   ├── ReaderScreen.js       # Chapter reader
│   ├── LibraryScreen.js      # Collection
│   └── SettingsScreen.js     # Preferences
└── navigation/
    ├── TabNavigator.js       # Bottom tabs
    └── AppNavigator.js       # Main nav (updated)
```

---

## 🎯 Design Principles

### **Cyber Aesthetics**
- Dark backgrounds to reduce eye strain
- Neon accents for emphasis and interactivity
- Holographic effects for branding
- Abstract patterns instead of placeholders

### **Accessibility**
- High contrast (white text on dark bg)
- Clear visual hierarchy
- Touch targets min 48x48px
- Active states clearly visible

### **Performance**
- Hardware-accelerated animations
- Optimized FlatList for reader
- Lazy loading for images
- Efficient gradient rendering

---

## 📝 TODO: Integration

- [ ] Connect API endpoints to screens
- [ ] Implement real image loading in MangaCard
- [ ] Add auto-scroll feature to Reader
- [ ] Add download system
- [ ] Implement search functionality
- [ ] Add skeleton loaders for loading states
- [ ] Connect settings toggles to app state
- [ ] Add haptic feedback on interactions

---

## 🎨 Figma Deliverables Replicated

✅ **4 Wireframes**: Home, Reader, Library, Settings
✅ **Dark Cyber Theme**: Purple-cyan neon with gradients
✅ **Abstract Blocks**: MangaCard placeholders with patterns
✅ **Logo**: 3D holographic MT monogram
✅ **Splash Screen**: Black bg + glowing MangaTech text + animations

---

**Created**: November 6, 2025
**Design Language**: Cyber Neon Dark Mode
**Framework**: React Native (Expo)
