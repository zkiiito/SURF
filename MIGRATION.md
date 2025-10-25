# SURF Migration Guide: Backbone → Vue 3

## Overview

A complete Vue 3 + TypeScript version of SURF has been created in the `client-vue/` folder, preserving all functionality while modernizing the tech stack.

## What Changed

### Technology Stack

| Old (client/) | New (client-vue/) |
|--------------|-------------------|
| Backbone.js | Vue 3 (Composition API) |
| jQuery | Vue's reactivity |
| Underscore templates | Vue SFC templates |
| JavaScript | TypeScript |
| Backbone Models/Collections | Pinia stores |
| Backbone Router | Vue Router |

### Architecture

**Before (Backbone):**
```
client/
├── src/
│   ├── model/          # Backbone models
│   ├── view/           # Backbone views
│   ├── surf.js         # Backbone router
│   ├── communicator.js # Socket.io handler
│   └── index.js        # Entry point
└── index.html          # Templates in <script> tags
```

**After (Vue 3):**
```
client-vue/
├── src/
│   ├── stores/         # Pinia stores (state)
│   ├── components/     # Vue components
│   ├── views/          # Route components
│   ├── services/       # Communicator
│   ├── router/         # Vue Router
│   ├── types/          # TypeScript types
│   ├── utils/          # Utilities
│   └── main.ts         # Entry point
└── index.html          # Clean HTML
```

## File Mapping

### Models → Stores

| Backbone Model | Pinia Store |
|----------------|-------------|
| `model/user.model.js` | `stores/user.ts` |
| `model/wave.model.js` | `stores/wave.ts` |
| `model/message.model.js` | `stores/message.ts` |
| `model/surfapp.model.js` | `stores/app.ts` |

### Views → Components

| Backbone View | Vue Component |
|---------------|---------------|
| `view/surfapp.view.js` | `App.vue` |
| `view/wave.view.js` | `views/WaveView.vue` |
| `view/message.view.js` | `components/MessageItem.vue` |
| `view/wavelist.view.js` | `components/WaveList.vue` |
| `view/user.view.js` | `components/UserAvatar.vue` |
| `view/editwave.view.js` | `components/EditWave.vue` |
| `view/edituser.view.js` | `components/EditUser.vue` |
| `view/wavereplyform.view.js` | `components/WaveReplyForm.vue` |
| `view/messagereplyform.view.js` | `components/MessageReplyForm.vue` |
| `view/disconnected.view.js` | `components/Disconnected.vue` |

### Utilities

| Old | New |
|-----|-----|
| `i18n.js` (with R.js) | `utils/i18n.ts` (pure TS) |
| `phpjs.js` | `utils/text.ts` |
| `randomname.js` | `utils/randomName.ts` |

## Running Both Versions

### Original Backbone Version
```bash
cd client
npm install
npm run dev
# Runs on http://localhost:3000
```

### New Vue 3 Version
```bash
cd client-vue
npm install
npm run dev
# Runs on http://localhost:3001
```

## Key Features Maintained

✅ Real-time messaging via Socket.io  
✅ Wave (conversation) management  
✅ Threaded replies  
✅ User profiles with avatars  
✅ Unread message tracking  
✅ Link previews  
✅ Mobile responsive design  
✅ Internationalization (EN/HU)  
✅ Keyboard shortcuts (spacebar for next unread)  
✅ Notifications support  
✅ Offline/online user status  
✅ Archive functionality  

## Improvements in Vue 3 Version

1. **Type Safety**: Full TypeScript support catches errors at compile time
2. **Better DX**: Hot Module Replacement (HMR) for instant feedback
3. **Smaller Bundle**: Tree-shaking removes unused code
4. **Modern Syntax**: Composition API is more readable and maintainable
5. **Reactive by Default**: No manual event binding needed
6. **Better Testing**: Components are easier to test in isolation
7. **Future-Proof**: Vue 3 is actively maintained

## Migration Checklist for Deployment

When ready to switch to Vue 3 in production:

- [ ] Install dependencies: `cd client-vue && npm install`
- [ ] Build: `npm run build`
- [ ] Update server to serve `client-vue/dist` instead of `client/dist`
- [ ] Test all Socket.io events work correctly
- [ ] Verify mobile responsiveness
- [ ] Test notifications
- [ ] Check internationalization
- [ ] Verify all user settings persist
- [ ] Test with multiple browsers

## Rollback Plan

The original Backbone version is preserved in `client/` and can be deployed at any time if issues arise.

## Next Steps

1. **Testing**: Thoroughly test the Vue 3 version
2. **Performance**: Compare bundle sizes and runtime performance
3. **Features**: Consider adding new features easier in Vue 3:
   - Dark mode
   - Emoji picker
   - Message editing
   - File uploads
   - @mentions autocomplete
   - Better search
4. **Progressive Migration**: Both versions can run side-by-side during transition

## Support

Both versions use the same backend API and Socket.io protocol, so they're fully compatible with the existing SURF server.

