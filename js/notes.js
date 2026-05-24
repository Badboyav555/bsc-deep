// ==============================================
// BSc Notes Platform - notes.js (Foolproof v2)
// Loading screen will auto-dismiss after 5 sec
// ==============================================

// Global error display
function showErrorOnScreen(msg) {
    const el = document.getElementById('notesErrorMessage');
    if (el) el.textContent = msg;
    const errDiv = document.getElementById('notesError');
    if (errDiv) errDiv.style.display = 'block';
    const loadDiv = document.getElementById('notesLoading');
    if (loadDiv) loadDiv.style.display = 'none';
}

// Catch unhandled errors
window.addEventListener('error', function(e) {
    showErrorOnScreen('JS Error: ' + e.message + ' at line ' + e.lineno);
});

// Safety timeout: if loading still visible after 5 sec, force show error
setTimeout(function() {
    const loading = document.getElementById('notesLoading');
    if (loading && loading.style.display !== 'none') {
        showErrorOnScreen('Loading timed out. Check your internet or file paths. Tap Retry.');
    }
}, 5000);

// ===== Supabase Safe Init =====
let supabase = null;
try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        const SUPABASE_URL = 'https://your-project-id.supabase.co'; // 🔁 Replace
        const SUPABASE_ANON_KEY = 'your-anon-key'; // 🔁 Replace
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    showErrorOnScreen('Supabase init error: ' + e.message);
}

// ===== Marked library check =====
if (typeof marked === 'undefined') {
    showErrorOnScreen('❌ marked.js not loaded. Check your internet connection or use a modern browser (Chrome/Firefox).');
}

// ===== URL Parameters =====
const params = new URLSearchParams(window.location.search);
const sem = params.get('sem');
const subject = params.get('subject');
const note = params.get('note');

let currentLang = 'en';
let fullMarkdown = '';
let isUnlocked = false;

// ===== DOM References (all inside DOMContentLoaded for safety) =====
document.addEventListener('DOMContentLoaded', function() {
    // Elements
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

    // Helper: file path
    function getNoteFilePath() {
        return `notes/sem${sem}/${subject}/${note}-${currentLang}.md`;
    }

    // Main fetch
    async function fetchNote() {
        if (!notesLoading || !notesError || !markdownBody) return;
        notesLoading.style.display = 'block';
        notesError.style.display = 'none';
        markdownBody.style.display = 'none';
        if (previewLockOverlay) previewLockOverlay.style.display = 'none';

        if (!sem || !subject || !note) {
            showErrorOnScreen('Missing parameters. Go back and select a note.');
            return;
        }

        const path = getNoteFilePath();
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            fullMarkdown = await response.text();
            if (!fullMarkdown.trim()) {
                showErrorOnScreen('Note file is empty.');
                return;
            }
            renderNote();
        } catch (err) {
            showErrorOnScreen(`❌ Failed to load ${path} — ${err.message}`);
        }
    }

    function renderNote() {
        notesLoading.style.display = 'none';
        const unlockKey = `unlocked_${sem}_${subject}_${note}_${currentLang}`;
        isUnlocked = localStorage.getItem(unlockKey) === 'true';
        try {
            if (isUnlocked) {
                markdownBody.innerHTML = marked.parse(fullMarkdown);
                markdownBody.style.display = 'block';
                if (previewLockOverlay) previewLockOverlay.style.display = 'none';
            } else {
                const lines = fullMarkdown.split('\n');
                const preview = lines.slice(0, Math.ceil(lines.length * 0.3)).join('\n');
                markdownBody.innerHTML = marked.parse(preview);
                markdownBody.style.display = 'block';
                if (previewLockOverlay) previewLockOverlay.style.display = 'flex';
            }
            generateTOC();
            setupCopyButtons();
            setupImageZoom();
            setupScrollTracking();
        } catch (e) {
            showErrorOnScreen('Render error: ' + e.message);
        }
    }

    // Language toggle
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', function() {
            currentLang = currentLang === 'en' ? 'hi' : 'en';
            if (langIndicator) langIndicator.textContent = currentLang.toUpperCase();
            fetchNote();
        });
    }

    // Retry
    if (retryBtn) retryBtn.addEventListener('click', fetchNote);

    // Unlock form
    if (unlockForm) {
        unlockForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('leadName')?.value.trim();
            const mobile = document.getElementById('leadMobile')?.value.trim();
            if (!name || !mobile) return alert('Please fill all fields.');
            unlockSubmitBtn.disabled = true;
            const btnText = unlockSubmitBtn.querySelector('.btn-text');
            const btnSpinner = unlockSubmitBtn.querySelector('.loading-spinner-sm');
            if (btnText) btnText.style.display = 'none';
            if (btnSpinner) btnSpinner.style.display = 'inline-block';
            try {
                if (supabase) {
                    const { error } = await supabase.from('leads').insert([{
                        name, mobile,
                        semester: sem,
                        subject: subject,
                        note_title: `${note}-${currentLang}`,
                        created_at: new Date().toISOString()
                    }]);
                    if (error) throw error;
                }
                localStorage.setItem(`unlocked_${sem}_${subject}_${note}_${currentLang}`, 'true');
                isUnlocked = true;
                markdownBody.innerHTML = marked.parse(fullMarkdown);
                markdownBody.style.display = 'block';
                if (previewLockOverlay) previewLockOverlay.style.display = 'none';
            } catch (err) {
                alert('Error: ' + err.message);
            } finally {
                unlockSubmitBtn.disabled = false;
                if (btnText) btnText.style.display = 'inline';
                if (btnSpinner) btnSpinner.style.display = 'none';
            }
        });
    }

    // TOC
    function generateTOC() {
        if (!tocNav) return;
        tocNav.innerHTML = '';
        const headings = markdownBody.querySelectorAll('h1, h2, h3');
        headings.forEach((h, i) => {
            const id = 'toc-' + i;
            h.id = id;
            const a = document.createElement('a');
            a.href = '#' + id;
            a.textContent = h.textContent;
            a.style.display = 'block';
            a.style.paddingLeft = (h.tagName === 'H2' ? '16px' : h.tagName === 'H3' ? '24px' : '8px');
            a.style.fontSize = '0.85rem';
            a.style.color = '#475569';
            a.style.textDecoration = 'none';
            a.addEventListener('click', function() {
                tocNav.querySelectorAll('a').forEach(link => link.style.color = '#475569');
                a.style.color = '#3b82f6';
            });
            tocNav.appendChild(a);
        });
    }

    // Copy buttons
    function setupCopyButtons() {
        document.querySelectorAll('.markdown-body pre').forEach(pre => {
            if (pre.querySelector('.copy-code-btn')) return;
            const btn = document.createElement('button');
            btn.className = 'copy-code-btn';
            btn.textContent = '📋 Copy';
            btn.style.cssText = 'position:absolute; top:8px; right:8px; background:#fff; border:1px solid #ddd; border-radius:6px; padding:4px 10px; font-size:0.8rem; cursor:pointer;';
            btn.onclick = function() {
                const code = pre.querySelector('code')?.innerText || pre.innerText;
                navigator.clipboard.writeText(code).then(() => {
                    btn.textContent = '✅ Copied';
                    setTimeout(() => btn.textContent = '📋 Copy', 2000);
                });
            };
            pre.style.position = 'relative';
            pre.appendChild(btn);
        });
    }

    // Image zoom
    function setupImageZoom() {
        document.querySelectorAll('.markdown-body img').forEach(img => {
            img.style.cursor = 'zoom-in';
            img.onclick = function() {
                if (zoomImage && imageZoomModal) {
                    zoomImage.src = img.src;
                    imageZoomModal.style.display = 'flex';
                }
            };
        });
    }
    if (zoomCloseBtn) zoomCloseBtn.onclick = () => { if (imageZoomModal) imageZoomModal.style.display = 'none'; };
    if (imageZoomBackdrop) imageZoomBackdrop.onclick = () => { if (imageZoomModal) imageZoomModal.style.display = 'none'; };

    // Progress bar
    function setupScrollTracking() {
        window.addEventListener('scroll', function() {
            if (!readingProgressBar) return;
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = docHeight ? (scrollTop / docHeight) * 100 : 0;
            readingProgressBar.style.width = Math.min(progress, 100) + '%';
        });
    }

    // Mobile TOC
    if (mobileTocFab && tocSidebar) {
        mobileTocFab.addEventListener('click', function() {
            tocSidebar.style.display = (tocSidebar.style.display === 'block') ? 'none' : 'block';
        });
    }

    // TOC toggle
    if (tocToggleBtn && tocNav) {
        tocToggleBtn.addEventListener('click', function() {
            if (tocNav.style.display === 'none') {
                tocNav.style.display = 'block';
                tocToggleBtn.textContent = '−';
            } else {
                tocNav.style.display = 'none';
                tocToggleBtn.textContent = '+';
            }
        });
    }

    // START
    if (sem && subject && note) {
        if (navInfo) {
            const subName = subject.charAt(0).toUpperCase() + subject.slice(1);
            navInfo.textContent = `Sem ${sem} · ${subName} · ${note.replace('unit','Unit ')}`;
        }
        fetchNote();
    } else {
        showErrorOnScreen('❌ Invalid link. Please go back and select a note.');
    }
});
