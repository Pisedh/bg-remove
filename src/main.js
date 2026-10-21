import { removeBackground } from '@imgly/background-removal';
import JSZip from 'jszip';
import './style.css';

const $ = (id) => document.getElementById(id);
const fileInput = $('fileInput');
const dropzone = $('dropzone');
const photoGrid = $('photoGrid');
const emptyState = $('emptyState');
const countPill = $('countPill');
const queueHint = $('queueHint');
const processBtn = $('processBtn');
const downloadBtn = $('downloadBtn');
const clearBtn = $('clearBtn');
const statusText = $('statusText');
const progressText = $('progressText');
const progressFill = $('progressFill');
const message = $('message');

let items = [];
let processing = false;
let deferredInstallPrompt = null;
const MAX_FILES = 100;
const MAX_FILE_MB = 25;

function showMessage(text, type = 'info') {
  message.textContent = text;
  message.className = `message ${type}`;
}
function safeName(name) {
  return name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').slice(0, 100) || 'photo';
}
function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function setProgress(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  progressText.textContent = `${pct}%`;
  progressFill.style.width = `${pct}%`;
}
function updateControls() {
  const ready = items.length > 0;
  countPill.textContent = items.length;
  queueHint.textContent = ready ? `${items.filter(x => x.status === 'done').length} of ${items.length} completed` : 'Add photos to create your batch.';
  emptyState.hidden = ready;
  clearBtn.disabled = !ready || processing;
  processBtn.disabled = !ready || processing || items.every(x => x.status === 'done');
  processBtn.innerHTML = processing ? '<span class="spinner"></span> Processing…' : '<span>✦</span> Remove backgrounds';
  downloadBtn.disabled = !items.some(x => x.status === 'done') || processing;
}
function render() {
  photoGrid.replaceChildren();
  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'photo-card';
    const preview = document.createElement('div');
    preview.className = 'photo-preview checkerboard';
    const img = document.createElement('img');
    img.alt = item.file.name;
    img.src = item.resultUrl || item.originalUrl;
    preview.append(img);
    const info = document.createElement('div');
    info.className = 'photo-info';
    const name = document.createElement('div');
    name.className = 'photo-name';
    name.textContent = item.file.name;
    name.title = item.file.name;
    const meta = document.createElement('div');
    meta.className = 'photo-meta';
    const size = document.createElement('span');
    size.textContent = formatSize(item.file.size);
    const status = document.createElement('span');
    status.className = `status status-${item.status}`;
    status.textContent = item.status === 'done' ? '✓ Done' : item.status === 'error' ? 'Failed' : item.status === 'working' ? 'Working…' : 'Ready';
    meta.append(size, status);
    info.append(name, meta);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-photo';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove ${item.file.name}`);
    remove.disabled = processing;
    remove.addEventListener('click', () => {
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
      if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      items = items.filter(x => x.id !== item.id);
      render();
      updateControls();
    });
    card.append(preview, info, remove);
    photoGrid.append(card);
  }
  updateControls();
}
function addFiles(fileList) {
  if (processing) return;
  const incoming = Array.from(fileList).filter(file => file.type.startsWith('image/'));
  if (!incoming.length) {
    showMessage('Choose image files such as JPG, PNG, or WEBP.', 'error');
    return;
  }
  const remaining = MAX_FILES - items.length;
  if (remaining <= 0) {
    showMessage(`This batch is limited to ${MAX_FILES} photos. Process or clear the current batch first.`, 'error');
    return;
  }
  const accepted = incoming.slice(0, remaining);
  let skippedLarge = 0;
  let skipped = incoming.length - accepted.length;
  for (const file of accepted) {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      skippedLarge++;
      continue;
    }
    const duplicate = items.some(x => x.file.name === file.name && x.file.size === file.size && x.file.lastModified === file.lastModified);
    if (duplicate) continue;
    items.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      file,
      originalUrl: URL.createObjectURL(file),
      resultBlob: null,
      resultUrl: null,
      status: 'ready',
      error: ''
    });
  }
  render();
  if (skippedLarge || skipped) {
    showMessage(`${items.length} photos in queue. ${skippedLarge ? `${skippedLarge} file(s) skipped because they exceed ${MAX_FILE_MB} MB. ` : ''}${skipped ? `${skipped} file(s) skipped because the batch limit is ${MAX_FILES}.` : ''}`, 'info');
  } else {
    showMessage(`${items.length} photo(s) ready. Your originals stay on this device.`, 'success');
  }
  fileInput.value = '';
}
$('browseBtn').addEventListener('click', (event) => { event.stopPropagation(); fileInput.click(); });
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
fileInput.addEventListener('change', () => addFiles(fileInput.files));
for (const eventName of ['dragenter', 'dragover']) {
  dropzone.addEventListener(eventName, e => { e.preventDefault(); dropzone.classList.add('dragging'); });
}
for (const eventName of ['dragleave', 'drop']) {
  dropzone.addEventListener(eventName, e => { e.preventDefault(); dropzone.classList.remove('dragging'); });
}
dropzone.addEventListener('drop', e => addFiles(e.dataTransfer.files));
clearBtn.addEventListener('click', () => {
  if (processing) return;
  items.forEach(x => { URL.revokeObjectURL(x.originalUrl); if (x.resultUrl) URL.revokeObjectURL(x.resultUrl); });
  items = [];
  render();
  setProgress(0, 0);
  statusText.textContent = 'Ready when you are';
  showMessage('Workspace cleared.', 'info');
});

processBtn.addEventListener('click', async () => {
  if (processing || !items.length) return;
  processing = true;
  let completed = items.filter(x => x.status === 'done').length;
  const toProcess = items.filter(x => x.status !== 'done');
  const total = completed + toProcess.length;
  setProgress(completed, total);
  updateControls();
  showMessage('Processing runs on your device. Keep this tab open until the batch finishes.', 'info');
  try {
    for (const item of toProcess) {
      item.status = 'working';
      statusText.textContent = `Processing ${completed + 1} of ${total}: ${item.file.name}`;
      render();
      try {
        // Model files are fetched on the first run and may be cached by the browser.
        const blob = await removeBackground(item.file, {
          model: 'medium',
          output: { format: 'image/png', quality: 1 }
        });
        item.resultBlob = blob;
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
        item.resultUrl = URL.createObjectURL(blob);
        item.status = 'done';
        item.error = '';
      } catch (err) {
        console.error('Background removal failed:', item.file.name, err);
        item.status = 'error';
        item.error = err?.message || 'Unknown processing error';
      }
      completed++;
      setProgress(completed, total);
      render();
      // Yield to UI between photos to keep controls responsive.
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    const successes = items.filter(x => x.status === 'done').length;
    const failures = items.filter(x => x.status === 'error').length;
    statusText.textContent = 'Batch finished';
    showMessage(`${successes} photo(s) completed${failures ? `; ${failures} failed. You can retry the failed photos.` : ''}.`, failures ? 'error' : 'success');
  } finally {
    processing = false;
    updateControls();
  }
});

downloadBtn.addEventListener('click', async () => {
  const completed = items.filter(x => x.status === 'done' && x.resultBlob);
  if (!completed.length) return;
  downloadBtn.disabled = true;
  downloadBtn.textContent = 'Preparing ZIP…';
  try {
    const zip = new JSZip();
    const used = new Set();
    for (const item of completed) {
      const baseName = safeName(item.file.name);
      let filename = `${baseName}.png`;
      let n = 2;
      while (used.has(filename.toLowerCase())) filename = `${baseName}-${n++}.png`;
      used.add(filename.toLowerCase());
      zip.file(filename, item.resultBlob);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clearcut-backgrounds-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showMessage(`ZIP created with ${completed.length} transparent PNG(s).`, 'success');
  } catch (err) {
    console.error(err);
    showMessage('Could not create the ZIP. Try downloading fewer photos at a time.', 'error');
  } finally {
    downloadBtn.textContent = 'Download ZIP ↓';
    updateControls();
  }
});

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  $('installBanner').hidden = false;
});
$('installBtn').addEventListener('click', async () => {
  if (!deferredInstallPrompt) {
    showMessage('On iPhone, open the Share menu in Safari and choose “Add to Home Screen”. On Android, use your browser menu and choose “Install app” or “Add to Home screen”.', 'info');
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  $('installBanner').hidden = true;
});
$('dismissInstall').addEventListener('click', () => $('installBanner').hidden = true);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(err => console.warn('Service worker registration failed', err)));
}
render();
