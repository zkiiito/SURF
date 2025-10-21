# SURF Vue 3 - Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies

```bash
cd client-vue
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The app will open at **http://localhost:3001**

### 3. Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

---

## 📁 Project Structure

```
client-vue/
├── src/
│   ├── App.vue              # Root component
│   ├── main.ts              # App entry point
│   │
│   ├── components/          # Reusable components
│   │   ├── TheHeader.vue
│   │   ├── WaveList.vue
│   │   ├── WaveListItem.vue
│   │   ├── MessageItem.vue
│   │   ├── MessageReplyForm.vue
│   │   ├── WaveReplyForm.vue
│   │   ├── EditWave.vue
│   │   ├── EditUser.vue
│   │   ├── UserAvatar.vue
│   │   ├── EmptyState.vue
│   │   └── Disconnected.vue
│   │
│   ├── views/               # Route components
│   │   ├── WaveView.vue     # Main wave/conversation view
│   │   └── WavesView.vue    # Empty/redirect view
│   │
│   ├── stores/              # Pinia state management
│   │   ├── app.ts           # App-wide state
│   │   ├── user.ts          # User management
│   │   ├── wave.ts          # Wave/conversation state
│   │   └── message.ts       # Message state
│   │
│   ├── services/
│   │   └── communicator.ts  # Socket.io integration
│   │
│   ├── router/
│   │   └── index.ts         # Vue Router config
│   │
│   ├── types/
│   │   └── index.ts         # TypeScript types
│   │
│   └── utils/
│       ├── i18n.ts          # Internationalization
│       ├── text.ts          # Text utilities
│       └── randomName.ts    # Random name generator
│
├── public/                  # Static assets (CSS, images, fonts)
├── index.html              # HTML entry point
├── vite.config.js          # Vite configuration
├── tsconfig.json           # TypeScript config
└── package.json            # Dependencies
```

---

## 🎯 Key Technologies

- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe JavaScript
- **Pinia** - State management
- **Vue Router** - Client-side routing
- **Socket.io Client** - Real-time communication
- **Vite** - Fast build tool

---

## 🔧 Available Commands

```bash
npm run dev        # Start dev server with HMR
npm run build      # Build for production
npm run preview    # Preview production build
npm run type-check # Run TypeScript type checking
```

---

## 🌐 How It Works

### 1. **State Management (Pinia Stores)**

State is centralized in Pinia stores:

```typescript
// Using a store in a component
import { useWaveStore } from '@/stores/wave'

const waveStore = useWaveStore()
const currentWave = waveStore.currentWave
```

### 2. **Real-time Communication**

The communicator service handles all Socket.io events:

```typescript
// Sending a message
communicator.sendMessage(text, waveId, parentId)

// Reading a message
communicator.readMessage(messageId, waveId)
```

### 3. **Routing**

Vue Router handles navigation:

```typescript
// Navigate to a wave
router.push(`/wave/${waveId}`)
```

---

## 📝 Component Overview

### Core Components

- **App.vue**: Root component, manages layout and overlays
- **TheHeader.vue**: App header with logo and user menu
- **WaveList.vue**: Sidebar with conversation list

### Wave/Message Components

- **WaveView.vue**: Main conversation view
- **MessageItem.vue**: Individual message with replies
- **WaveReplyForm.vue**: Form to send new messages
- **MessageReplyForm.vue**: Form to reply to messages

### Forms & Modals

- **EditWave.vue**: Create/edit conversation dialog
- **EditUser.vue**: Edit user profile dialog
- **Disconnected.vue**: Connection lost overlay

### Utility Components

- **EmptyState.vue**: Shown when no conversations exist
- **UserAvatar.vue**: User avatar display
- **WaveListItem.vue**: Single conversation in sidebar

---

## 🎨 Styling

The app uses the existing CSS from the Backbone version:

- `/public/css/style.css` - Main styles
- `/public/css/surf.min.css` - Additional styles

Styles are imported via the HTML `<link>` tags.

---

## 🌍 Internationalization

The app supports English and Hungarian:

```typescript
import { t } from '@/utils/i18n'

// In template
{{ t('Add conversation') }}

// With variables
{{ t('Do you want to leave {{ title }}?', { title: waveName }) }}
```

The locale is auto-detected from the browser.

---

## 🔌 Socket.io Integration

The communicator service (`src/services/communicator.ts`) handles all real-time events:

**Incoming Events:**
- `init` - Initial data load
- `message` - New message received
- `updateUser` - User updated
- `updateWave` - Wave updated
- `disconnect` - Connection lost
- `ready` - Data sync complete

**Outgoing Events:**
- `message` - Send new message
- `readMessage` - Mark message as read
- `createWave` - Create conversation
- `updateWave` - Update conversation
- `updateUser` - Update profile

---

## 🐛 Debugging

### Vue DevTools

Install the Vue DevTools browser extension for debugging:
- Chrome: [Vue.js devtools](https://chrome.google.com/webstore/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
- Firefox: [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)

### TypeScript Errors

Run type checking:
```bash
npm run type-check
```

### Console Logging

Use Vue's devtools or browser console. Stores are accessible:

```javascript
// In browser console (dev mode only)
$pinia.state.value
```

---

## 📦 Building for Production

```bash
npm run build
```

This creates an optimized build in `dist/` with:
- Minified JavaScript
- Tree-shaken code (unused code removed)
- Optimized CSS
- Hashed filenames for caching

Serve the `dist/` folder with your backend server.

---

## 🔄 Migrating from Backbone

See `MIGRATION.md` in the project root for a complete migration guide.

---

## 💡 Tips

1. **Hot Module Replacement**: Changes appear instantly without full page reload
2. **TypeScript**: Hover over variables in your editor to see types
3. **Composition API**: All reactive state is defined with `ref()` or `computed()`
4. **Pinia Stores**: Import and use anywhere - no props drilling needed
5. **Auto-imports**: Components in `src/components/` are auto-imported (if configured)

---

## 🆘 Common Issues

### Port Already in Use

If port 3001 is busy, edit `vite.config.js`:
```javascript
server: {
  port: 3002  // Change to any available port
}
```

### TypeScript Errors

Make sure dependencies are installed:
```bash
npm install
```

### Socket.io Connection Failed

Ensure the backend server is running and check CORS settings.

---

## 📚 Learn More

- [Vue 3 Docs](https://vuejs.org/)
- [Pinia Docs](https://pinia.vuejs.org/)
- [Vue Router Docs](https://router.vuejs.org/)
- [TypeScript Docs](https://www.typescriptlang.org/)
- [Vite Docs](https://vitejs.dev/)

---

Happy coding! 🎉

