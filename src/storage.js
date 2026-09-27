import { emptyModel, deserializeModel, serializeModel } from './recognizer/model.js';

const KEY = 'jjk.model.v1';

export function loadModel() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyModel();
    return deserializeModel(JSON.parse(raw));
  } catch (e) {
    console.warn('Failed to load model, starting empty', e);
    return emptyModel();
  }
}

export function saveModel(model) {
  try {
    localStorage.setItem(KEY, JSON.stringify(serializeModel(model)));
  } catch (e) {
    console.warn('Failed to save model', e);
  }
}

export function clearModel() {
  try { localStorage.removeItem(KEY); } catch (_) { /* noop */ }
}
