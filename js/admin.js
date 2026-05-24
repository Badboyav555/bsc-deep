const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allLeads = [];
let currentPage = 1;
const perPage = 10;

// Navigation
document.querySelectorAll('.admin-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const section = btn.dataset.section;
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.getElementById(section + 'Section').style.display = 'block';
    document.getElementById('adminSectionTitle').textContent = btn.textContent.trim();
    if(section === 'leads') loadLeads();
    if(section === 'links') generateLinks();
  });
});

// Leads
async function loadLeads(search = '') {
  let query = supabase.from('leads').select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if(search) query = query.or(`name.ilike.%${search}%,mobile.ilike.%${search}%,note_title.ilike.%${search}%`);
  const { data, error, count } = await query.range((currentPage-1)*perPage, currentPage*perPage-1);
  if(error) { console.error(error); return; }
  allLeads = data;
  renderLeadsTable(data);
  updateStats();
}

function renderLeadsTable(leads) {
  const tbody = document.getElementById('leadsTableBody');
  tbody.innerHTML = leads.map((lead, i) => `
    <tr>
      <td>${(currentPage-1)*perPage + i + 1}</td>
      <td>${lead.name}</td>
      <td>${lead.mobile}</td>
      <td>${lead.semester}</td>
      <td>${lead.subject}</td>
      <td>${lead.note_title}</td>
      <td>${new Date(lead.created_at).toLocaleDateString()}</td>
      <td><button class="btn-danger" onclick="deleteLead('${lead.id}')">🗑</button></td>
    </tr>
  `).join('');
}

async function deleteLead(id) {
  if(!confirm('Delete this lead?')) return;
  await supabase.from('leads').delete().eq('id', id);
  loadLeads();
}

// Export CSV
document.getElementById('exportCsvBtn').addEventListener('click', async () => {
  const { data } = await supabase.from('leads').select('*');
  const csv = [['Name','Mobile','Semester','Subject','Note','Date']].concat(data.map(l => [l.name, l.mobile, l.semester, l.subject, l.note_title, l.created_at])).map(e => e.join(',')).join('\n');
  const blob = new Blob([csv], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'leads.csv'; a.click();
});

// Search
document.getElementById('leadSearch').addEventListener('input', (e) => loadLeads(e.target.value));

// Notes Manager
const editorSem = document.getElementById('editorSem');
const editorSubject = document.getElementById('editorSubject');
const editorUnit = document.getElementById('editorUnit');
const editorLang = document.getElementById('editorLang');
const editorFilePath = document.getElementById('editorFilePath');

function updateEditorPath() {
  const path = `/notes/sem${editorSem.value}/${editorSubject.value}/${editorUnit.value}-${editorLang.value}.md`;
  editorFilePath.value = path;
}
[editorSem, editorSubject, editorUnit, editorLang].forEach(el => el.addEventListener('change', updateEditorPath));
updateEditorPath();

document.getElementById('previewNoteBtn').addEventListener('click', () => {
  const content = document.getElementById('editorContent').value;
  document.getElementById('notePreview').innerHTML = marked.parse(content);
  document.getElementById('notePreviewContainer').style.display = 'block';
});
document.getElementById('copyNoteBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('editorContent').value);
  alert('Content copied!');
});
document.getElementById('copyPathBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(editorFilePath.value);
  alert('Path copied!');
});

// Links generator
function generateLinks() {
  const grid = document.getElementById('linksGrid');
  let html = '';
  for(let s=1; s<=6; s++) {
    html += `<div class="link-group"><h4>Semester ${s}</h4><ul>`;
    ['physics','chemistry','botany','zoology','maths'].forEach(sub => {
      for(let u=1; u<=5; u++) {
        html += `<li><a href="notes.html?sem=${s}&subject=${sub}&note=unit${u}" target="_blank">${sub} Unit ${u}</a></li>`;
      }
    });
    html += `</ul></div>`;
  }
  grid.innerHTML = html;
}

// Init
loadLeads();
