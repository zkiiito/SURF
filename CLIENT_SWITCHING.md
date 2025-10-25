# Client Version Switching

SURF now supports running both the original Backbone client and the new React client side-by-side, with cookie-based routing to switch between them.

## Default Behavior

By default, the server serves the **Backbone client** (`client/dist/`).

## Switching Between Clients

### Switch to React Client

Visit: `http://yourdomain.com/use-react`

This sets a cookie (`client-version=react`) that lasts for 1 year. All subsequent requests will be served the React client from `client-react/dist/`.

### Switch Back to Backbone Client

Visit: `http://yourdomain.com/use-backbone`

This clears the `client-version` cookie, returning you to the default Backbone client.

## How It Works

1. **Cookie Storage**: The client preference is stored in a cookie named `client-version`
2. **Server-Side Routing**: The server checks this cookie on every request to `/`
3. **Separate Builds**: Each client version is built independently:
   - Backbone: `client/dist/`
   - React: `client-react/dist/`
4. **Shared Assets**: Both clients share the same static asset directories (`/css`, `/js`, `/images`, `/fonts`, `/assets`)

## Technical Details

### Files Modified

- `code/routerClient.js`: Added `/use-react` and `/use-backbone` routes, modified main route to check cookie
- `code/ExpressServer.js`: Added `cookie-parser` middleware to parse custom cookies
- `package.json`: Added `cookie-parser` dependency

### Cookie Details

- **Name**: `client-version`
- **Value**: `react` (when React is enabled)
- **Max Age**: 365 days
- **HttpOnly**: `true` (secure, not accessible via JavaScript)
- **SameSite**: `lax` (protection against CSRF)

### Code Changes in routerClient.js

```javascript
// Route to enable React client
app.get('/use-react', function (req, res) {
    res.cookie('client-version', 'react', { 
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        httpOnly: true,
        sameSite: 'lax'
    });
    res.redirect('/');
});

// Route to enable Backbone client (default)
app.get('/use-backbone', function (req, res) {
    res.clearCookie('client-version');
    res.redirect('/');
});

// Main route checks cookie and serves appropriate client
app.get('/', function (req, res) {
    const useReact = req.cookies && req.cookies['client-version'] === 'react';
    const clientDir = useReact ? clientDirs[1] : clientDirs[0];
    // ... serves the appropriate index.html
});
```

## Testing

1. Start the server: `npm start`
2. Visit your SURF instance (default: Backbone client)
3. Navigate to `/use-react` to switch to React
4. Navigate to `/use-backbone` to switch back
5. Close and reopen your browser - your preference should persist

## For Developers

- **Building Backbone**: `cd client && npm run build`
- **Building React**: `cd client-react && npm run build`
- **Development Mode**: Both clients can be developed independently with their own dev servers
- **Session Handling**: Both clients use the same session system and Socket.io connections

## Notes

- The cookie persists across browser sessions
- Each user can independently choose their preferred client version
- Both clients connect to the same backend and share the same data
- Caching is handled separately for each client version

