// Supabase config – REPLACE with your own
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const sem = urlParams.get('sem');
const subject = urlParams.get('subject');
const note = urlParams.get('note'); // e.g., 'unit1'

let currentLang = 'en'; // default
let fullMarkdown = '';
let isUnlocked = false;
let currentNotePath = '';

const notesLoading = document.getElementById('notesLoading');
const notesError = document.getElementById('notesError');
const notesErrorMessage = document.getElementById('notesErrorMessage');
const markdownBody = document.getElementById('markdownBody');
const previewLockOverlay = document.getElementById('previewLockOverlay');
const navInfo = document.getElementById('notesNavInfo');
const langIndicator = document.getElementById('langIndicator');
const tocNav = document.getElementById('tocNav');
const readingProgressBar = document.getElementById('readingProgressBar');

function getNoteFilePath() {
  return `/notes/sem${sem}/${subject}/${note}-${currentLang}.md`;
}

async function fetchNote() {
  notesLoading.style.display = 'block';
  notesError.style.display = 'none';
  markdownBody.style.display = 'none';
  previewLockOverlay.style.display = 'none';
  
  currentNotePath = getNoteFilePath();
  try {
    const response = await fetch(currentNotePath);
    if (!response.ok) throw new Error('Note file not found');
    fullMarkdown = await response.text();
    renderNoteWithPreviewLock();
  } catch (err) {
    notesLoading.style.display = 'none';
    notesError.style.display = 'block';
    notesErrorMessage.textContent = `Could not load ${currentNotePath}. Please check if the file exists.`;
  }
}

function renderNoteWithPreviewLock() {
  notesLoading.style.display = 'none';
  const unlockKey = `unlocked_${sem}_${subject}_${note}_${currentLang}`;
  isUnlocked = localStorage.getItem(unlockKey) === 'true';
  
  if (isUnlocked) {
    renderFullMarkdown(fullMarkdown);
  } else {
    // Show only 30% of content with blur overlay
    const lines = fullMarkdown.split('\n');
    const previewLines = lines.slice(0, Math.ceil(lines.length * 0.3)).join('\n');
    markdownBody.innerHTML = marked.parse(previewLines);
    markdownBody.style.display = 'block';
    previewLockOverlay.style.display = 'flex';
  }
  generateTOC();
  setupCopyButtons();
  setupImageZoom();
  setupScrollTracking();
}

function renderFullMarkdown(md) {
  markdownBody.innerHTML = marked.parse(md);
  markdownBody.style.display = 'block';
  previewLockOverlay.style.display = 'none';
}

document.getElementById('langToggleBtn').addEventListener('click', () => {
  currentLang = currentLang === 'en' ? 'hi' : 'en';
  langIndicator.textContent = currentLang.toUpperCase();
  fetchNote();
});

document.getElementById('retryBtn').addEventListener('click', fetchNote);

// Unlock form submission
document.getElementById('unlockForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('leadName').value.trim();
  const mobile = document.getElementById('leadMobile').value.trim();
  if(!name || !mobile) return;
  
  const submitBtn = document.getElementById('unlockSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.querySelector('.btn-text').style.display = 'none';
  submitBtn.querySelector('.loading-spinner-sm').style.display = 'inline-block';
  
  try {
    // Save to Supabase
    const { error } = await supabase.from('leads').insert([{
      name, mobile,
      semester: sem,
      subject: subject,
      note_title: `${note}-${currentLang}`,
      created_at: new Date().toISOString()
    }]);
    if (error) throw error;
    
    // Unlock
    const unlockKey = `unlocked_${sem}_${subject}_${note}_${currentLang}`;
    localStorage.setItem(unlockKey, 'true');
    isUnlocked = true;
    renderFullMarkdown(fullMarkdown);
  } catch (err) {
    alert('Error saving lead. Please try again.');
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-text').style.display = 'inline';
    submitBtn.querySelector('.loading-spinner-sm').style.display = 'none';
  }
});

// TOC generation
function generateTOC() {
  const headings = markdownBody.querySelectorAll('h1, h2, h3');
  tocNav.innerHTML = '';
  headings.forEach((h, i) => {
    const id = `heading-${i}`;
    h.id = id;
    const link = document.createElement('a');
    link.href = `#${id}`;
    link.textContent = h.textContent;
    link.style.paddingLeft = h.tagName === 'H2' ? '16px' : '8px';
    tocNav.appendChild(link);
  });
}

// Copy code buttons
function setupCopyButtons() {
  document.querySelectorAll('pre').forEach(pre => {
    if(pre.querySelector('.copy-code-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'copy-code-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(pre.textContent);
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 2000);
    });
    pre.style.position = 'relative';
    pre.appendChild(btn);
  });
}

// Image zoom
function setupImageZoom() {
  document.querySelectorAll('.markdown-body img').forEach(img => {
    img.addEventListener('click', () => {
      document.getElementById('zoomImage').src = img.src;
      document.getElementById('imageZoomModal').style.display = 'flex';
    });
  });
}
document.getElementById('zoomCloseBtn').addEventListener('click', () => {
  document.getElementById('imageZoomModal').style.display = 'none';
});
document.getElementById('imageZoomBackdrop').addEventListener('click', () => {
  document.getElementById('imageZoomModal').style.display = 'none';
});

// Reading progress
function setupScrollTracking() {
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;
    readingProgressBar.style.width = `${Math.min(progress, 100)}%`;
  });
}

// Mobile TOC
document.getElementById('mobileTocFab').addEventListener('click', () => {
  const sidebar = document.getElementById('tocSidebar');
  sidebar.style.display = sidebar.style.display === 'block' ? 'none' : 'block';
});

// Start
if(sem && subject && note) {
  navInfo.textContent = `Sem ${sem} · ${subject.charAt(0).toUpperCase()+subject.slice(1)} · ${note}`;
  fetchNote();
} else {
  notesLoading.innerHTML = '<p>Invalid note parameters.</p>';
}
