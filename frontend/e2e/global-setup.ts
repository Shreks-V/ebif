import * as fs from 'fs';
import * as path from 'path';

export default async function globalSetup(): Promise<void> {
  // Build a mock JWT that the Angular AuthService will accept.
  // AuthService decodes: JSON.parse(atob(token.split('.')[1]))
  // and checks: payload.exp * 1000 > Date.now()
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'admin@ebif.local',
      id_usuario: 1,
      nombre: 'Admin EBIF',
      rol: 'ADMINISTRADOR',
      exp: 9999999999,
    })
  )
    .toString('base64')
    .replace(/=/g, '');

  const MOCK_TOKEN = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.FAKE_E2E_SIG`;

  // Build Playwright storageState JSON with sessionStorage entry
  const storageState = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:4200',
        localStorage: [],
        // Playwright's storageState does not directly support sessionStorage,
        // but we inject the token via addInitScript in tests that need it.
        // We store it in localStorage here as a fallback; the auth service
        // reads from localStorage if sessionStorage is empty and migrates it.
      },
    ],
  };

  // Write the file, then patch it with a custom field our fixture helper reads.
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // We also store the raw token in a sidecar file so page fixtures can inject it.
  fs.writeFileSync(path.join(authDir, 'token.txt'), MOCK_TOKEN, 'utf8');

  // Write the storageState with localStorage token (auth service migrates to sessionStorage)
  const stateWithToken = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:4200',
        localStorage: [
          {
            name: 'token',
            value: MOCK_TOKEN,
          },
        ],
      },
    ],
  };

  fs.writeFileSync(
    path.join(authDir, 'user.json'),
    JSON.stringify(stateWithToken, null, 2),
    'utf8'
  );

  console.log('[global-setup] Mock JWT written to e2e/.auth/user.json');
}
