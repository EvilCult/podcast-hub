#!/usr/bin/env node
// Ensure a .env exists: copy from .env.example when missing.
// Never overwrites an existing .env.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');
const examplePath = path.join(root, '.env.example');

if (fs.existsSync(envPath)) {
    console.log('.env already exists, skipping');
    process.exit(0);
}

if (!fs.existsSync(examplePath)) {
    console.error('.env.example not found, cannot create .env');
    process.exit(1);
}

fs.copyFileSync(examplePath, envPath);
console.log('created .env from .env.example (edit it for production)');
