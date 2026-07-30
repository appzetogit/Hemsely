# Amora Frontend

## Environment

Create `frontend/.env` with:

```env
VITE_API_URL=http://localhost:5000/api
```

The frontend now uses `VITE_API_URL` as the single source of truth for backend API requests.

## Shared API Helper

Use [`src/lib/api.js`](./src/lib/api.js) for all frontend API calls:

```js
import { apiFetch, buildApiUrl, API_BASE_URL } from './lib/api';
```

- `API_BASE_URL` returns the normalized value from `VITE_API_URL`
- `buildApiUrl('auth/login')` builds a full request URL
- `apiFetch('auth/login', { method: 'POST', body: JSON.stringify(data) })` uses the shared base URL automatically
