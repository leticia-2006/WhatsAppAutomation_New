
const user = JSON.parse(localStorage.getItem('user'));
console.log(localStorage.getItem('user'));
if(!user || !user.token) { 
console.error('User or token not found');
window.location.href = 'index.html';}
axios.defaults.withCredentials = true;
let sessions = [];
// ========================
// نفذ fetchQRCode إذا كانت الصفحة بها canvas QR
const qrCanvas = document.getElementById('qr-canvas');
    if(user.role==='super_admin' && qrCanvas) {
    fetchQRCode();
    setInterval(fetchQRCode, 5000);
}

// ========================
// Dashboard Page
// ========================
// الحصول على بيانات المستخدم من localStorage



// ========================
// البحث والفلاتر
// ========================
function applyFilters() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const tagFilter = document.getElementById('tag-filter').value;

  const filtered = sessions.filter(client => 
    (client.name.toLowerCase().includes(searchTerm) || client.phone.includes(searchTerm)) &&
    (!tagFilter || client.tags?.includes(tagFilter))
  );

  renderSessions(filtered);
}

// ========================
// Tags
// ========================
function addTag(clientId, tagName) {
  const client = sessions.find(c => c.id === parseInt(clientId));
  if (!client) return;

  if (!client.tags) client.tags = '';
  const existingTags = client.tags.split(',').map(t => t.trim());
  if (!existingTags.includes(tagName)) existingTags.push(tagName);
  client.tags = existingTags.join(', ');

  renderSessions(sessions);

  axios.post(`/sessions/add-tag`, { clientId, tag: tagName })
    .then(() => loadSessions())
    .catch(err => console.error(err));
}


// عرض زر QR فقط للسوبر أدمن
if(user.role === 'super_admin'){document.getElementById('qr-link').style.display = 'block';
}

// Logout
const logoutBtn =
document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('user');
  window.location.href = 'index.html';
});
}
// QR Modal
document.getElementById('qr-link').addEventListener('click', () => {
  document.getElementById('qr-modal').style.display = 'block';
  fetchQRCode();
});
function closeQRModal() { document.getElementById('qr-modal').style.display = 'none'; }

// Fetch QR code
async function fetchQRCode() {
  try {
   const numberId = 'client1';
   const res = await axios.get(`/sessions/qr/${numberId}`
        , { headers: {
    Authorization: `Bearer ${user.token}`
    }});

    const qrCode = res.data.qr || res.data;
    if(qrCode) {
      QRCode.toCanvas(document.getElementById('qr-canvas'), qrCode, err => {
        if(err) console.error(err);
      });
    }
  } catch(err) {console.error('Error fetching QR:', err);
  }
}

// Tabs
let currentTab = 'all';
const tabLinks = document.querySelectorAll('.tab-link');
tabLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    currentTab = link.dataset.tab;
    tabLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    loadSessions();
  });
});

// ========================
// Load Sessions
// ========================
async function loadSessions() {
  try {
    const res = await axios.get(`/sessions/${currentTab}`, {
      headers: { Authorization: `Bearer ${user.token}` }
    });

    sessions = res.data || []; // هنا نستخدم المتغير sessions

    // تصفية حسب صلاحيات المستخدم
    let filteredSessions = sessions;
    if(user.role === 'agent') {
      filteredSessions = sessions.filter(s => s.agent_id === user.id);
    } else if(user.role === 'admin') {
      filteredSessions = sessions.filter(s => s.agent_id && s.admin_id === user.id);
    }

    renderSessions(filteredSessions);
  } catch(err) {
    console.error('Error in loadSessions:', err);
    const tbody = document.getElementById('sessions-body');
    if(tbody) tbody.innerHTML = '<div class="row">Error loading sessions</div>';
  }
}

// ========================
// Render Sessions
// ========================
function renderSessions(data = sessions) {
  const tbody = document.getElementById('sessions-body');
  if(!tbody) return;

  tbody.innerHTML = '';

  if(!data.length) {
    tbody.innerHTML = '<div class="row">No sessions found</div>';
    document.getElementById('session-count').innerText = '0 sessions found';
    return;
  }

  const searchTerm = (document.getElementById('search-input')?.value || '').toLowerCase();
  const tagFilter = document.getElementById('tag-filter')?.value || '';

  data.forEach(session => {
    const id = session.id || '-';
    const name = session.name || '-';
    const phone = session.phone || '-';
    const repeatBadge = session.repeat > 1 ? `🔁${session.repeat}` : '-';
    const tags = session.tags ? session.tags.split(',').map(t => `<span class="tag">${t}</span>`).join(' ') : '-';
    const statusText = session.status || '-';

    const noteBtn = `<button onclick="openNoteModal(${id})">📝 Add Note</button>`;

    const row = `<div class="row">
                   <div>${id}</div>
                   <div>${name} / ${phone}</div>
                   <div>${repeatBadge}</div>
                   <div>${tags}</div>
                   <div>${noteBtn}</div>
                   <div>${statusText}</div>
                 </div>`;

    tbody.innerHTML += row;
  });

  document.getElementById('session-count').innerText = `${data.length} sessions found`;
}


// Notes Modal
function openNoteModal(clientId) {
  const modal = document.getElementById('note-modal');
  if(!modal) {
    const modalEl = document.createElement('div');
    modalEl.id = 'note-modal';
    modalEl.style = 'display:block; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#fff; padding:20px; border:1px solid #ccc; z-index:1000; border-radius:8px;';
    modalEl.innerHTML = `
      <h3>Add Note</h3>
      <textarea id="note-text" rows="4" cols="40" placeholder="Write your note..."></textarea>
      <br><br>
      <button onclick="saveNote()">Save</button>
      <button onclick="closeNoteModal()">Cancel</button>
    `;
    document.body.appendChild(modalEl);
  } else {
    modal.style.display = 'block';
  }
  document.getElementById('note-text').value='';
  modal.dataset.clientId = clientId;
}
function closeNoteModal() {
  const modal = document.getElementById('note-modal');
  if(modal) modal.style.display = 'none';
  if(modal) modal.dataset.clientId = '';
}
function saveNote() {
  const modal = document.getElementById('note-modal');
  const clientId = modal.dataset.clientId;
  const noteText = document.getElementById('note-text').value;

  axios.post(`/sessions/add-note`, { clientId, note: noteText })
    .then(() => {
      closeNoteModal();
      loadSessions();})
    .catch (err => console.error(err));
}

// Load initial sessions
window.addEventListener("load", loadSessions);

// ========================







































