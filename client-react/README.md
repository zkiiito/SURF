# SURF Client - React Version

Modern React + TypeScript + Zustand rewrite of the SURF real-time messaging client.

## Features

- **React 18** with hooks and functional components
- **TypeScript** for type safety
- **Zustand** for state management (simpler than Redux!)
- **React Router** for navigation
- **Socket.io** for real-time communication
- **Vite** for fast development and building

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will start on http://localhost:3002

### Build for Production

```bash
npm run build
```

### Type Check

```bash
npm run type-check
```

## Project Structure

```
client-react/
├── public/           # Static assets
├── src/
│   ├── components/   # React components
│   ├── views/        # Route views
│   ├── stores/       # Zustand stores
│   ├── services/     # Services (communicator)
│   ├── types/        # TypeScript type definitions
│   ├── utils/        # Utility functions
│   ├── App.tsx       # Root component
│   ├── router.tsx    # React Router configuration
│   └── main.tsx      # Application entry point
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Migration from Backbone

This React version replaces:
- **Backbone Models/Collections** → **Zustand Stores**
- **Backbone Views** → **React Components**
- **Backbone Router** → **React Router**
- **jQuery** → **React's Virtual DOM**
- **Underscore templates** → **JSX**

## Key Differences from Vue Version

### State Management

**Vue 3 (Pinia):**
```typescript
const waveStore = useWaveStore()
const waves = computed(() => waveStore.allWaves)
```

**React (Zustand):**
```typescript
const waves = useWaveStore(state => state.allWaves())
```

### Components

**Vue 3 (SFC):**
```vue
<template>
  <div>{{ message }}</div>
</template>

<script setup>
const message = ref('Hello')
</script>
```

**React (TSX):**
```tsx
function Component() {
  const [message, setMessage] = useState('Hello')
  return <div>{message}</div>
}
```

## Zustand Store Pattern

Zustand stores are simple and don't require providers:

```typescript
const useCounterStore = create((set, get) => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 })),
  getCount: () => get().count
}))

// Usage in component
function Counter() {
  const count = useCounterStore(state => state.count)
  const increment = useCounterStore(state => state.increment)
  
  return <button onClick={increment}>{count}</button>
}
```

## Socket.io Integration

The communicator service (`src/services/communicator.ts`) handles all Socket.io communication and integrates with Zustand stores for state updates.

## i18n

Internationalization support for English and Hungarian. The locale is automatically detected from the browser.

```typescript
import { t } from '@/utils/i18n'

// In component
<h1>{t('Add conversation')}</h1>
```

## Component Overview

### Main Components
- `App.tsx` - Root component with layout
- `TheHeader.tsx` - Header with logo and user menu
- `WaveList.tsx` - Sidebar with conversations

### Views
- `WaveView.tsx` - Main conversation view
- `WavesView.tsx` - Empty state/redirect

### Message Components
- `MessageItem.tsx` - Individual message with replies
- `WaveReplyForm.tsx` - Form to send new messages
- `MessageReplyForm.tsx` - Form to reply to messages

### Forms & Modals
- `EditWave.tsx` - Create/edit conversation dialog
- `EditUser.tsx` - Edit user profile dialog

### Utility Components
- `EmptyState.tsx` - No conversations state
- `UserAvatar.tsx` - User avatar display
- `WaveListItem.tsx` - Conversation in sidebar
- `Disconnected.tsx` - Connection lost overlay

## Development Tips

1. **Hot Module Replacement**: Changes appear instantly
2. **TypeScript**: Hover over variables to see types
3. **Zustand DevTools**: Install Redux DevTools extension
4. **React DevTools**: Essential for debugging component tree
5. **Selective Re-renders**: Zustand only re-renders when selected state changes

## Comparison: Backbone vs Vue 3 vs React

| Feature | Backbone | Vue 3 | React |
|---------|----------|-------|-------|
| **Paradigm** | MVC | Reactive | Component-based |
| **State** | Models | Pinia | Zustand |
| **Templates** | Underscore | SFC | JSX/TSX |
| **Reactivity** | Manual | Automatic | useState/useEffect |
| **Learning Curve** | Medium | Easy | Medium |
| **Bundle Size** | Large | Small | Medium |
| **Ecosystem** | Old | Growing | Huge |

## Why React?

- **Huge ecosystem** - Massive library of components
- **Industry standard** - Most job postings
- **JSX/TSX** - JavaScript/TypeScript in templates
- **Hooks** - Powerful composition pattern
- **React DevTools** - Excellent debugging

## Why Zustand over Redux?

- **Simpler** - No boilerplate
- **No Provider** - Works anywhere
- **TypeScript-first** - Great types out of the box
- **Small** - Only 1KB
- **Fast** - Minimal re-renders

## Learn More

- [React Docs](https://react.dev/)
- [Zustand Docs](https://zustand-demo.pmnd.rs/)
- [React Router Docs](https://reactrouter.com/)
- [TypeScript Docs](https://www.typescriptlang.org/)
- [Vite Docs](https://vitejs.dev/)

---

Happy coding! 🎉

