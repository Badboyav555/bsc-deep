// ==============================================
// BSc Notes Platform - notes.js
// All errors will be displayed on screen
// ==============================================

// Helper: Show errors on screen
function showErrorOnScreen(msg) {
    const el = document.getElementById('notesErrorMessage');
    if (el) el.textContent = msg;
    const errDiv = document.getElementById('notesError');
    if (errDiv) errDiv.style.display = 'block';
    const loadDiv = document.getElementById('notesLoading');
    if (loadDiv) loadDiv.style.display = 'none';
}

// ===== Supabase Safe Init =====
let supabase = null;
try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        // 🔁 Replace these with your actual Supabase URL and anon key
        const SUPABASE_URL = 'https://your-project-id.supabase.co';
        const SUPABASE_ANON_KEY = 'your-anon-key';
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase initialized');
    } else {
        console.warn('Supabase CDN not loaded or createClient missing');
    }
} catch (e) {
    showErrorOnScreen('Supabase init error: ' + e.message);
}

// ===== Check for marked.js =====
if (typeof marked === 'undefined') {
    showErrorOnScreen('❌ marked.js library not loaded. Check internet or use Chrome/Firefox.');
}

// ===== Get URL Parameters =====
const params = new URLSearchParams(window.location.search);
const sem = params.get('sem');
const subject = params.get('subject');
const note = params.get('note'); // e.g., 'unit1'

let currentLang = 'en';
let fullMarkdown = '';
let isUnlocked = false;
let currentNotePath = '';

// ===== DOM Elements =====
const notesLoading = document.getElementById('notesLoading');
const notesError = document.getElementById('notesError');
const notesErrorMessage = document.getElementById('notesErrorMessage');
const markdownBody = document.getElementById('markdownBody');
const previewLockOverlay = document.getElementById('previewLockOverlay');
const navInfo = document.getElementById('notesNavInfo');
const langIndicator = document.getElementById('langIndicator');
const tocNav = document.getElementById('tocNav');
const readingProgressBar = document.getElementById('readingProgressBar');
const retryBtn = document.getElementById('retryBtn');
const langToggleBtn = document.getElementById('langToggleBtn');
const unlockForm = document.getElementById('unlockForm');
const unlockSubmitBtn = document.getElementById('unlockSubmitBtn');
const mobileTocFab = document.getElementById('mobileTocFab');
const tocSidebar = document.getElementById('tocSidebar');
const tocToggleBtn = document.getElementById('tocToggleBtn');
const zoomCloseBtn = document.getElementById('zoomCloseBtn');
const imageZoomModal = document.getElementById('imageZoomModal');
const zoomImage = document.getElementById('zoomImage');
const imageZoomBackdrop = document.getElementById('imageZoomBackdrop');

// ===== File Path Helper =====
function getNoteFilePath() {
    // Relative path for GitHub Pages (no leading slash)
    return `notes/sem${sem}/${subject}/${note}-${currentLang}.md`;
}

// ===== Main Fetch Function =====
async function fetchNote() {
    // Reset UI
    notesLoading.style.display = 'block';
    notesError.style.display = 'none';
    markdownBody.style.display = 'none';
    previewLockOverlay.style.display = 'none';

    if (!sem || !subject || !note) {
        showErrorOnScreen('Missing parameters. Go back and select a note.');
        return;
    }

    currentNotePath = getNoteFilePath();
    try {
        const response = await fetch(currentNotePath);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        fullMarkdown = await response.text();
        // If empty content, warn
        if (!fullMarkdown.trim()) {
            showErrorOnScreen('Note file is empty. Please add content.');
            return;
        }
        // Now render
        renderNoteWithPreviewLock();
    } catch (err) {
        showErrorOnScreen(`❌ Fetch failed: ${currentNotePath} — ${err.message}`);
    }
}

// ===== Render Logic (with try-catch) =====
function renderNoteWithPreviewLock() {
    try {
        notesLoading.style.display = 'none';
        const unlockKey = `unlocked_${sem}_${subject}_${note}_${currentLang}`;
        isUnlocked = localStorage.getItem(unlockKey) === 'true';

        if (isUnlocked) {
            renderFullMarkdown(fullMarkdown);
        } else {
            const lines = fullMarkdown.split('\n');
            const previewLines = lines.slice(0, Math.ceil(lines.length * 0.3)).join('\n');
            markdownBody.innerHTML = marked.parse(previewLines);
            markdownBody.style.display = 'block';
            previewLockOverlay.style.display = 'flex';
        }

        // Post-render setup
        generateTOC();
        setupCopyButtons();
        setupImageZoom();
        setupScrollTracking();
    } catch (err) {
        showErrorOnScreen('❌ Render error: ' + err.message);
    }
}

function renderFullMarkdown(md) {
    markdownBody.innerHTML = marked.parse(md);
    markdownBody.style.display = 'block';
    previewLockOverlay.style.display = 'none';
}

// ===== Language Toggle =====
if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'hi' : 'en';
        if (langIndicator) langIndicator.textContent = currentLang.toUpperCase();
        fetchNote();
    });
}

// ===== Retry =====
if (retryBtn) {
    retryBtn.addEventListener('click', fetchNote);
}

// ===== Unlock Form =====
if (unlockForm) {
    unlockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('leadName');
        const mobileInput = document.getElementById('leadMobile');
        const name = nameInput ? nameInput.value.trim() : '';
        const mobile = mobileInput ? mobileInput.value.trim() : '';
        if (!name || !mobile) {
            alert('Please fill both fields');
            return;
        }

        unlockSubmitBtn.disabled = true;
        const btnText = unlockSubmitBtn.querySelector('.btn-text');
        const btnSpinner = unlockSubmitBtn.querySelector('.loading-spinner-sm');
        if (btnText) btnText.style.display = 'none';
        if (btnSpinner) btnSpinner.style.display = 'inline-block';

        try {
            if (supabase) {
                const { error } = await supabase.from('leads').insert([{
                    name,
                    mobile,
                    semester: sem,
                    subject: subject,
                    note_title: `${note}-${currentLang}`,
                    created_at: new Date().toISOString()
                }]);
                if (error) throw error;
            } else {
                console.warn('Supabase not available, lead not saved');
            }

            const unlockKey = `unlocked_${sem}_${subject}_${note}_${currentLang}`;
            localStorage.setItem(unlockKey, 'true');
            isUnlocked = true;
            renderFullMarkdown(fullMarkdown);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            unlockSubmitBtn.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnSpinner) btnSpinner.style.display = 'none';
        }
    });
}

// ===== Table of Contents =====
function generateTOC() {
    if (!tocNav) return;
    const headings = markdownBody.querySelectorAll('h1, h2, h3');
    tocNav.innerHTML = '';
    headings.forEach((h, i) => {
        const id = `toc-${i}`;
        h.id = id;
        const link = document.createElement('a');
        link.href = `#${id}`;
        link.textContent = h.textContent;
        link.style.display = 'block';
        link.style.paddingLeft = h.tagName === 'H2' ? '20px' : (h.tagName === 'H3' ? '32px' : '8px');
        link.style.color = '#475569';
        link.style.textDecoration = 'none';
        link.style.fontSize = '0.9rem';
        link.style.borderLeft = '2px solid transparent';
        link.style.marginBottom = '4px';
        link.addEventListener('click', () => {
            // Highlight active
            tocNav.querySelectorAll('a').forEach(a => a.style.borderLeftColor = 'transparent');
            link.style.borderLeftColor = '#3b82f6';
        });
        tocNav.appendChild(link);
    });
}

// ===== Copy Code Buttons =====
function setupCopyButtons() {
    document.querySelectorAll('.markdown-body pre').forEach(pre => {
        if (pre.querySelector('.copy-code-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'copy-code-btn';
        btn.textContent = '📋 Copy';
        btn.style.position = 'absolute';
        btn.style.top = '8px';
        btn.style.right = '8px';
        btn.style.background = '#fff';
        btn.style.border = '1px solid #e2e8f0';
        btn.style.borderRadius = '6px';
        btn.style.padding = '4px 12px';
        btn.style.fontSize = '0.8rem';
        btn.style.cursor = 'pointer';
        btn.style.zIndex = '10';

        btn.addEventListener('click', () => {
            const codeEl = pre.querySelector('code');
            const text = codeEl ? codeEl.innerText : pre.innerText;
            navigator.clipboard.writeText(text).then(() => {
                btn.textContent = '✅ Copied';
                setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000);
            }).catch(() => {
                btn.textContent = '❌ Error';
            });
        });

        pre.style.position = 'relative';
        pre.appendChild(btn);
    });
}

// ===== Image Zoom =====
function setupImageZoom() {
    document.querySelectorAll('.markdown-body img').forEach(img => {
        img.style.cursor = 'zoom-in';
        // Remove previous listener by cloning (simple approach)
        const newImg = img.cloneNode(true);
        img.parentNode.replaceChild(newImg, img);
        newImg.addEventListener('click', () => {
            if (zoomImage && imageZoomModal) {
                zoomImage.src = newImg.src;
                imageZoomModal.style.display = 'flex';
            }
        });
    });
}

if (zoomCloseBtn) {
    zoomCloseBtn.addEventListener('click', () => {
        if (imageZoomModal) imageZoomModal.style.display = 'none';
    });
}
if (imageZoomBackdrop) {
    imageZoomBackdrop.addEventListener('click', () => {
        if (imageZoomModal) imageZoomModal.style.display = 'none';
    });
}

// ===== Reading Progress =====
function setupScrollTracking() {
    window.addEventListener('scroll', () => {
        if (!readingProgressBar) return;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        readingProgressBar.style.width = Math.min(progress, 100) + '%';
    });
}

// ===== Mobile TOC FAB =====
if (mobileTocFab && tocSidebar) {
    mobileTocFab.addEventListener('click', () => {
        if (tocSidebar.style.display === 'none' || tocSidebar.style.display === '') {
            tocSidebar.style.display = 'block';
        } else {
            tocSidebar.style.display = 'none';
        }
    });
}

// ===== TOC Sidebar Collapse =====
if (tocToggleBtn && tocNav) {
    tocToggleBtn.addEventListener('click', () => {
        if (tocNav.style.display === 'none') {
            tocNav.style.display = 'block';
            tocToggleBtn.textContent = '−';
        } else {
            tocNav.style.display = 'none';
            tocToggleBtn.textContent = '+';
        }
    });
}

// ===== Start Application =====
if (sem && subject && note) {
    if (navInfo) {
        const subjectCap = subject.charAt(0).toUpperCase() + subject.slice(1);
        const noteCap = note.replace('unit', 'Unit ');
        navInfo.textContent = `Sem ${sem} · ${subjectCap} · ${noteCap}`;
    }
    fetchNote();
} else {
    showErrorOnScreen('❌ Invalid link. Use the menu to select a note.');
}
