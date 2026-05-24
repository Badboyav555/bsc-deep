// === Debug helper: show errors on screen ===
function showErrorOnScreen(msg) {
    const el = document.getElementById('notesErrorMessage');
    if (el) {
        el.textContent = msg;
    }
    const notesError = document.getElementById('notesError');
    if (notesError) notesError.style.display = 'block';
    const notesLoading = document.getElementById('notesLoading');
    if (notesLoading) notesLoading.style.display = 'none';
}

// === Supabase Safe Initialization ===
let supabase = null;
try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        const SUPABASE_URL = 'https://your-project-id.supabase.co'; // 🔁 Apni URL daalo
        const SUPABASE_ANON_KEY = 'your-anon-key'; // 🔁 Apni anon key daalo
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    showErrorOnScreen('Supabase init error: ' + e.message);
}

// Check if marked is loaded
if (typeof marked === 'undefined') {
    showErrorOnScreen('Error: marked.js library not loaded. Please check internet connection or use Chrome/Firefox.');
}

// === URL Parameters ===
const urlParams = new URLSearchParams(window.location.search);
const sem = urlParams.get('sem');
const subject = urlParams.get('subject');
const note = urlParams.get('note'); // e.g., 'unit1'

let currentLang = 'en';
let fullMarkdown = '';
let isUnlocked = false;
let currentNotePath = '';

// DOM Elements
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
const zoomCloseBtn = document.getElementById('zoomCloseBtn');
const imageZoomModal = document.getElementById('imageZoomModal');
const zoomImage = document.getElementById('zoomImage');
const imageZoomBackdrop = document.getElementById('imageZoomBackdrop');

// === Helper Functions ===

function getNoteFilePath() {
    // GitHub Pages ke liye relative path (without leading slash)
    return `notes/sem${sem}/${subject}/${note}-${currentLang}.md`;
}

async function fetchNote() {
    // Reset UI
    notesLoading.style.display = 'block';
    notesError.style.display = 'none';
    markdownBody.style.display = 'none';
    previewLockOverlay.style.display = 'none';

    // Validate parameters
    if (!sem || !subject || !note) {
        showErrorOnScreen('Missing parameters: sem, subject, or note. Please go back and select a note properly.');
        return;
    }

    currentNotePath = getNoteFilePath();
    try {
        const response = await fetch(currentNotePath);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        fullMarkdown = await response.text();
        renderNoteWithPreviewLock();
    } catch (err) {
        showErrorOnScreen(`Fetch failed for ${currentNotePath} — ${err.message}. Check if file exists and path is correct.`);
        console.error(err);
    }
}

function renderNoteWithPreviewLock() {
    notesLoading.style.display = 'none';
    const unlockKey = `unlocked_${sem}_${subject}_${note}_${currentLang}`;
    isUnlocked = localStorage.getItem(unlockKey) === 'true';

    if (isUnlocked) {
        renderFullMarkdown(fullMarkdown);
    } else {
        // Show only 30% content with blur overlay
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

// === Language Toggle ===
if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'hi' : 'en';
        if (langIndicator) langIndicator.textContent = currentLang.toUpperCase();
        fetchNote();
    });
}

// === Retry Button ===
if (retryBtn) {
    retryBtn.addEventListener('click', fetchNote);
}

// === Unlock Form Submission ===
if (unlockForm) {
    unlockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('leadName');
        const mobileInput = document.getElementById('leadMobile');
        const name = nameInput.value.trim();
        const mobile = mobileInput.value.trim();
        if (!name || !mobile) return;

        // Disable button & show spinner
        unlockSubmitBtn.disabled = true;
        const btnText = unlockSubmitBtn.querySelector('.btn-text');
        const btnSpinner = unlockSubmitBtn.querySelector('.loading-spinner-sm');
        if (btnText) btnText.style.display = 'none';
        if (btnSpinner) btnSpinner.style.display = 'inline-block';

        try {
            // Save to Supabase if available
            if (supabase) {
                const { error } = await supabase.from('leads').insert([{
                    name: name,
                    mobile: mobile,
                    semester: sem,
                    subject: subject,
                    note_title: `${note}-${currentLang}`,
                    created_at: new Date().toISOString()
                }]);
                if (error) throw error;
            } else {
                console.warn('Supabase not configured — lead not saved.');
            }

            // Unlock note
            const unlockKey = `unlocked_${sem}_${subject}_${note}_${currentLang}`;
            localStorage.setItem(unlockKey, 'true');
            isUnlocked = true;
            renderFullMarkdown(fullMarkdown);
        } catch (err) {
            alert('Error saving lead: ' + err.message);
            console.error(err);
        } finally {
            // Re-enable button
            unlockSubmitBtn.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnSpinner) btnSpinner.style.display = 'none';
        }
    });
}

// === Table of Contents Generator ===
function generateTOC() {
    if (!tocNav) return;
    const headings = markdownBody.querySelectorAll('h1, h2, h3');
    tocNav.innerHTML = '';
    headings.forEach((h, i) => {
        const id = `heading-${i}`;
        h.id = id;
        const link = document.createElement('a');
        link.href = `#${id}`;
        link.textContent = h.textContent;
        // Indent based on heading level
        if (h.tagName === 'H2') link.style.paddingLeft = '20px';
        else if (h.tagName === 'H3') link.style.paddingLeft = '32px';
        else link.style.paddingLeft = '8px';
        tocNav.appendChild(link);
    });
}

// === Copy Code Buttons ===
function setupCopyButtons() {
    document.querySelectorAll('.markdown-body pre').forEach(pre => {
        // Avoid duplicate buttons
        if (pre.querySelector('.copy-code-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'copy-code-btn';
        btn.textContent = 'Copy';
        btn.addEventListener('click', () => {
            const code = pre.querySelector('code') ? pre.querySelector('code').innerText : pre.innerText;
            navigator.clipboard.writeText(code).then(() => {
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
            }).catch(() => {
                btn.textContent = 'Failed';
            });
        });
        pre.style.position = 'relative';
        pre.appendChild(btn);
    });
}

// === Image Zoom Modal ===
function setupImageZoom() {
    document.querySelectorAll('.markdown-body img').forEach(img => {
        // Remove previous listener to avoid duplicates (simple approach: new image each render)
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', (e) => {
            if (zoomImage && imageZoomModal) {
                zoomImage.src = img.src;
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

// === Reading Progress Bar ===
function setupScrollTracking() {
    window.addEventListener('scroll', () => {
        if (!readingProgressBar) return;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const progress = (scrollTop / docHeight) * 100;
        readingProgressBar.style.width = `${Math.min(progress, 100)}%`;
    });
}

// === Mobile Floating TOC Button ===
if (mobileTocFab && tocSidebar) {
    mobileTocFab.addEventListener('click', () => {
        if (tocSidebar.style.display === 'none' || tocSidebar.style.display === '') {
            tocSidebar.style.display = 'block';
        } else {
            tocSidebar.style.display = 'none';
        }
    });
}

// === TOC Sidebar Toggle (collapse button) ===
const tocToggleBtn = document.getElementById('tocToggleBtn');
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

// === Initialize ===
if (sem && subject && note) {
    if (navInfo) {
        const subjectFormatted = subject.charAt(0).toUpperCase() + subject.slice(1);
        navInfo.textContent = `Sem ${sem} · ${subjectFormatted} · ${note.replace('unit', 'Unit ')}`;
    }
    fetchNote();
} else {
    showErrorOnScreen('Invalid link. Please go back and select a semester, subject, and unit.');
}
