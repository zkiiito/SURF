# SURF Client - Vue 3 Version

Modern Vue 3 + TypeScript + Pinia rewrite of the SURF real-time messaging client.

## Features

- **Vue 3** with Composition API
- **TypeScript** for type safety
- **Pinia** for state management
- **Vue Router** for navigation
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

The app will start on http://localhost:3001

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
client-vue/
├── public/           # Static assets
├── src/
│   ├── components/   # Vue components
│   ├── views/        # Route views
│   ├── stores/       # Pinia stores
│   ├── services/     # Services (communicator)
│   ├── router/       # Vue Router configuration
│   ├── types/        # TypeScript type definitions
│   ├── utils/        # Utility functions
│   ├── App.vue       # Root component
│   └── main.ts       # Application entry point
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.js
```

## Migration from Backbone

This Vue 3 version replaces:
- **Backbone Models/Collections** → **Pinia Stores**
- **Backbone Views** → **Vue Components**
- **Backbone Router** → **Vue Router**
- **jQuery** → **Vue's reactivity system**
- **Underscore templates** → **Vue SFC templates**

## Key Differences

1. **State Management**: Centralized in Pinia stores instead of distributed Backbone models
2. **Reactivity**: Vue's reactive system instead of Backbone events
3. **Templates**: Vue SFC templates with `<template>` syntax instead of Underscore templates in `<script>` tags
4. **Type Safety**: Full TypeScript support with proper type definitions
5. **Modern Tooling**: Vite for blazing fast HMR and builds

## Socket.io Integration

The communicator service (`src/services/communicator.ts`) handles all Socket.io communication and integrates with Pinia stores for state updates.

## i18n

Internationalization support for English and Hungarian. The locale is automatically detected from the browser.

