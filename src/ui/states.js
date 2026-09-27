export function renderPermissionCard(err) {
  const isPermission =
    err &&
    (err.name === 'NotAllowedError' ||
     err.name === 'PermissionDeniedError' ||
     /permission/i.test(String(err.message || err)));
  const title = isPermission ? 'Camera permission needed' : 'Camera unavailable';
  const body = isPermission
    ? 'Grant camera access in your browser to train and cast techniques. In most browsers, click the camera icon in the address bar and allow access, then refresh.'
    : 'Something went wrong starting the camera. Check that no other app is using it, then refresh.';
  return `
    <div class="perm-overlay">
      <div class="perm-card">
        <h2>${title}</h2>
        <p>${body}</p>
        <button class="btn btn-primary btn-lg" onclick="location.reload()">Retry</button>
      </div>
    </div>
  `;
}

export function renderLoading(text = 'Loading') {
  return `
    <div class="state-loading" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-family:var(--font-display);font-size:12px;letter-spacing:0.14em;text-transform:uppercase;z-index:2;">
      <span>${text}</span>
    </div>
  `;
}

export function renderEmptyPlay() {
  return `
    <div class="empty">
      <h2>No techniques trained yet</h2>
      <p>Head over to Train, capture a few samples for each technique, then come back to cast them.</p>
      <a href="#train" class="btn btn-primary btn-lg" style="text-decoration:none;">Go to Train</a>
    </div>
  `;
}
