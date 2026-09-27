import { mountAppShell } from './appShell.js';
import { loadModel } from './storage.js';

const app = document.getElementById('app');
const model = loadModel();
mountAppShell(app, model);
