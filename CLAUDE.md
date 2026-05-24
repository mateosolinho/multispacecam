# Space Multicam – Chat Agent Guide

**Project**: A lightweight, responsive web dashboard for displaying multiple live YouTube streams simultaneously in a responsive grid.

**Tech Stack**: Vanilla JavaScript (ES6+), HTML5, CSS3, YouTube IFrame API, Google Analytics  
**Dependencies**: None – static HTML/CSS/JS, no build system  
**Deployment**: Git-based; push to GitHub master to deploy  

---

## Quick Setup

1. **Local Development**: Open `index.html` in a browser (or run a simple HTTP server)
2. **Edit & Test**: Changes are immediate; no build step needed
3. **Structure**:
   - `index.html` – DOM structure (header, grid, unified info modal with tabs)
   - `css/styles.css` – Dark theme, responsive grid, tab styling
   - `js/script.js` – Core logic (player lifecycle, hardened auth, state management)

---

## Architecture & Patterns

### State Management
- **Global object**: `cameraConfigs` stores stream configurations (currently only `config1` is exposed)
- **localStorage keys** (ofuscated):
  - `"x_y_z"` – Admin password hash (encryptado) + salt + checksum integrity
  - `"s_t_r"` – Active camera configurations
  - `"l_o_c"` – Lockout state (rate limiting)
  - `"int_check"` – Integrity verification checksum
- **sessionStorage keys** (ofuscated):
  - `"a_b_c"` – Session state with 20-min timeout + verification token
- **Active players**: `activePlayers` Map tracks YouTube player instances

### Player Lifecycle
1. `initCameraConfig()` – Load streams from config, create iframes
2. `updateGridLayout()` – Calculate responsive grid (√n columns)
3. `createIframes()` – Render YouTube players with error handling
4. `destroyAllPlayers()` – Clean up before reload

**Render Token Pattern**: Prevents stale async callbacks from updating DOM after config changes.

### Admin Authentication (Hardened Security)
- **Password hashing**: Web Crypto API (SHA-256 + random salt)
- **Storage encryption**: Credentials encrypted with `simpleEncrypt()` before localStorage
- **Integrity verification**: Checksum validates data hasn't been tampered
- **DevTools detection**: Blocks login if DevTools open
- **Rate limiting**: 3 failed attempts → 15 min lockout
- **Session hardening**:
  - Token: `magic: "admin_verified"` (can't be faked)
  - Continuous validation every 60 seconds
  - Auto-logout if modified or expired
- **Data protection**:
  - `saveStreamChanges()` verifies session before saving
  - `restoreDefaultStreams()` verifies session before changing
  - All sensitive operations check session integrity

### Error Handling
- YouTube player errors mapped to user-friendly messages (error codes: 2, 5, 100, 101, 150)
- Try-catch blocks protect player initialization
- `syncStatusToPanel()` updates admin UI with real-time player status

---

## Conventions

| Aspect | Convention | Examples |
|--------|-----------|----------|
| **JavaScript** | camelCase functions | `initCameraConfig`, `saveStreamChanges` |
| **CSS Classes** | kebab-case | `.camera-name-overlay`, `.admin-stream-item` |
| **Constants** | UPPERCASE_WITH_UNDERSCORES | `DEFAULT_CAMERAS`, `SESSION_TIMEOUT` |
| **HTML IDs** | camelCase | `adminPasswordInput`, `cameraConfig` |
| **Language** | English code; Spanish UI | Spanish: "Contraseña", "Guardar cambios" |
| **localStorage keys** | Obfuscated (security) | `"x_y_z"` not `"admin_config"` |

---

## Key Files & Responsibilities

| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | 120 | Single modal with tabs: Credits + Admin panel |
| `css/styles.css` | 480+ | Dark theme, responsive grid, tab styling |
| `js/script.js` | 750+ | Player lifecycle, hardened auth, encryption, rate limiting |

### Critical Functions
- `initCameraConfig()` – Initialize streams and players
- `authenticateAdmin()` (hardened) – Password validation + DevTools detection + rate limiting
- `getAdminAuth()` (hardened) – Decrypt & verify integrity of stored credentials
- `saveStreamChanges()` (protected) – Verify session before saving
- `validateSessionIntegrity()` – Continuous session verification
- `detectDevTools()` – Prevents login if DevTools open
- `calculateChecksum()` – Detects tampering

---

## Security Features

### Encryption & Obfuscation
- localStorage keys are obfuscated (`x_y_z`, `a_b_c`, `s_t_r`, `l_o_c`)
- Credentials encrypted before storage (Base64 reverse)
- Checksum prevents modification without detection

### Attack Prevention
- **DevTools Detection**: Blocks login if open
- **Rate Limiting**: 3 failed attempts = 15 min lockout
- **Integrity Verification**: Auto-detects & removes tampered data
- **Session Hardening**: `magic: "admin_verified"` token + continuous validation
- **Data Protection**: All sensitive ops require valid session

### Monitoring
- Continuous session validation every 60 seconds
- Automatic logout on expiration or tampering
- Failed attempt tracking with auto-cleanup on success

---

## Common Tasks

### Add or Update a Stream
1. Click info button (i) → Admin tab
2. Edit name/URL of existing stream, OR
3. Remove stream with × button
4. Click "Guardar cambios"

### Change Admin Password
1. Click "Cerrar sesión"
2. Enter new password (min 8 chars)
3. Confirm password
4. Click "Entrar"

### Modify Styling
- Dark theme anchors: primary `#1da1f2` (Twitter blue), background `#111`
- Modal & input colors: `#222`, `#333`
- Tab styling: active border `#1da1f2`, inactive `transparent`
- Responsive breakpoints: CSS Grid with `auto-fit, minmax(300px, 1fr)`

### Debug Player Issues
- Check console for YouTube API errors
- Verify DevTools not interfering with auth
- Rate limiting: max 3 failed logins before 15 min block

---

## Development Tips

1. **No Build System**: Edit files directly; test in browser immediately
2. **DevTools**: Auth disables if DevTools open (security feature, close it to login)
3. **localStorage Inspection**: Data is encrypted; checksums validate integrity
4. **Rate Limiting**: 3 failed logins = 15 min auto-lockout
5. **Session Timeout**: Sessions expire after 20 min of use
6. **Continuous Validation**: Sessions checked every 60 seconds

---

## Notes for AI Agents

- **Security-First**: All auth is hardened; modifications require session validation
- **Maintenance-Heavy**: Frequent stream/link updates suggest YouTube URLs break regularly
- **Encryption**: Credentials stored encrypted; checksum validates integrity
- **Obfuscation**: localStorage keys are intentionally opaque for security
- **No External Dependencies**: Changes never require npm install
- **Modal-Based UI**: Single unified modal with tabs (Credits + Admin)

---

## Recent Changes
- 🔐 **Hardened security**: DevTools detection, encryption, rate limiting
- 📱 **UI consolidation**: Admin moved into info modal as tab
- 🎨 **Visual improvements**: Better button hover effects, tab styling
- 🛡️ **Data integrity**: Checksum validation, session hardening

See git log for full history.
