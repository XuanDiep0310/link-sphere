const fs = require('fs');
const path = require('path');

// Load .env file manually to support zero-dependency build execution
let env = {};
try {
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf-8');
    envFile.split(/\r?\n/).forEach(line => {
      // Ignore comments and empty lines
      if (line.trim().startsWith('#') || !line.includes('=')) return;
      
      const parts = line.split('=');
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      
      // Strip wrapping quotes
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    });
  }
} catch (err) {
  console.warn('Error reading .env file:', err);
}

// Fallback to process.env if variables are declared in system environment (e.g. Vercel/CI)
const apiUrl = process.env.NG_APP_API_URL || env.NG_APP_API_URL || 'http://localhost:3000/api';
const wsUrl = process.env.NG_APP_WS_URL || env.NG_APP_WS_URL || 'ws://localhost:3000/notifications';
const isProd = process.env.NODE_ENV === 'production' || env.NODE_ENV === 'production' || false;

const envConfigFile = `// Generated dynamically by set-env.js
export const environment = {
  production: ${isProd},
  apiUrl: '${apiUrl}',
  wsUrl: '${wsUrl}'
};
`;

const dir = path.join(__dirname, 'src', 'environments');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(path.join(dir, 'environment.ts'), envConfigFile);
console.log(`[set-env] Generated environment.ts file with apiUrl: "${apiUrl}"`);
