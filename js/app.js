// Common navigation & search
const subjects = ['physics', 'chemistry', 'botany', 'zoology', 'maths'];
const subjectNames = { physics:'Physics', chemistry:'Chemistry', botany:'Botany', zoology:'Zoology', maths:'Maths' };
const semesters = [1,2,3,4,5,6];
const units = [1,2,3,4,5];

document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');
  if(mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
    });
  }

  // Quick semesters on index
  const quickGrid = document.getElementById('semesterQuickGrid');
  if(quickGrid) {
    quickGrid.innerHTML = semesters.map(s => `
      <a href="subject.html?sem=${s}" class="semester-quick-card glass-card">
        <h3>Semester ${s}</h3>
        <p>5 Subjects</p>
      </a>
    `).join('');
  }

  // Semester page
  const semesterGrid = document.getElementById('semesterGrid');
  if(semesterGrid) {
    semesterGrid.innerHTML = semesters.map(s => `
      <a href="subject.html?sem=${s}" class="semester-card glass-card">
        <h3>📗 Semester ${s}</h3>
        <p>Physics, Chemistry, Botany, Zoology, Maths</p>
      </a>
    `).join('');
  }

  // Subject page
  const urlParams = new URLSearchParams(window.location.search);
  const sem = urlParams.get('sem');
  if(document.getElementById('subjectGrid') && sem) {
    document.getElementById('semesterBadge').textContent = `📗 Semester ${sem}`;
    document.getElementById('subjectGrid').innerHTML = subjects.map(sub => `
      <a href="unit.html?sem=${sem}&subject=${sub}" class="subject-card glass-card">
        <h3>📘 ${subjectNames[sub]}</h3>
        <p>5 Units</p>
      </a>
    `).join('');
  }

  // Unit page
  const semUnit = urlParams.get('sem');
  const subjectUnit = urlParams.get('subject');
  if(document.getElementById('unitGrid') && semUnit && subjectUnit) {
    document.getElementById('subjectBadge').textContent = `📘 ${subjectNames[subjectUnit]}`;
    document.getElementById('unitSubtitle').textContent = `Semester ${semUnit} · 5 comprehensive units`;
    document.getElementById('unitGrid').innerHTML = units.map(u => `
      <a href="notes.html?sem=${semUnit}&subject=${subjectUnit}&note=unit${u}" class="unit-card glass-card">
        <h3>Unit ${u}</h3>
        <p>EN / HI</p>
      </a>
    `).join('');
    document.getElementById('backToSubjects').href = `subject.html?sem=${semUnit}`;
  }

  // Global search (simple implementation)
  const searchInput = document.getElementById('globalSearch');
  if(searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const dropdown = document.getElementById('searchDropdown');
      if(query.length < 2) { dropdown.innerHTML = ''; dropdown.classList.remove('active'); return; }
      let results = [];
      semesters.forEach(s => {
        subjects.forEach(sub => {
          units.forEach(u => {
            if(subjectNames[sub].toLowerCase().includes(query) || `unit ${u}`.includes(query) || `semester ${s}`.includes(query)) {
              results.push({ sem: s, subject: sub, unit: u, label: `Sem ${s} - ${subjectNames[sub]} Unit ${u}` });
            }
          });
        });
      });
      dropdown.innerHTML = results.slice(0,8).map(r => `<a href="notes.html?sem=${r.sem}&subject=${r.subject}&note=unit${r.unit}" class="search-result-item">${r.label}</a>`).join('');
      dropdown.classList.add('active');
    });
    document.addEventListener('click', (e) => {
      if(!e.target.closest('.nav-search')) document.getElementById('searchDropdown').classList.remove('active');
    });
  }
});
