// ========================
// QR Code Page
// ========================
async function fetchQRCode() {
  try {
    const response = await axios.get('https://chat.ohgo.site/sessions/qr');
    const qrCode = response.data.qr;
    if (qrCode) {
        const canvas = document.getElementById('qr-canvas');
        QRCode.toCanvas(canvas, qrCode, function (error) {
            if (error) console.error(error);
            else console.log('QR Code displayed on frontend');
        });
    }
  } catch (err) { console.error('Error fetching QR:', err); }
}

// نفذ fetchQRCode إذا كانت الصفحة بها canvas QR
if(document.getElementById('qr-canvas')) {
    fetchQRCode();
    setInterval(fetchQRCode, 5000);
}

// ========================
// Dashboard Page
// ========================
let currentSessions = [];




// ========================
// البحث والفلاتر
// ========================
function applyFilters() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const tagFilter = document.getElementById('tag-filter').value;

  const filtered = currentSessions.filter(client => 
    (client.name.toLowerCase().includes(searchTerm) || client.phone.includes(searchTerm)) &&
    (!tagFilter || client.tags?.includes(tagFilter))
  );

  renderSessions(filtered);
}

// ========================
// Notes Modal
// ========================
function openNoteModal(clientId) {
  const modal = document.getElementById('note-modal');
  modal.style.display = 'block';
  modal.dataset.clientId = clientId;
}

function closeNoteModal() {
  const modal = document.getElementById('note-modal');
  modal.style.display = 'none';
  modal.dataset.clientId = '';
}


// ========================
// Tags
// ========================
function addTag(clientId, tagName) {
  const client = currentSessions.find(c => c.id === parseInt(clientId));
  if (!client) return;

  if (!client.tags) client.tags = '';
  const existingTags = client.tags.split(',').map(t => t.trim());
  if (!existingTags.includes(tagName)) existingTags.push(tagName);
  client.tags = existingTags.join(', ');

  renderSessions(currentSessions);

  axios.post(`/sessions/add-tag`, { clientId, tag: tagName })
    .then(() => loadSessions())
    .catch(err => console.error(err));
}
// الحصول على بيانات المستخدم من localStorage
const user = JSON.parse(localStorage.getItem('user'));
if(!user) window.location.href = 'index.html';

// عرض زر QR فقط للسوبر أدمن
if(user.role === 'super_admin') {
  document.getElementById('qr-link').style.display = 'block';
}

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('user');
  window.location.href = 'index.html';
});

// QR Modal
document.getElementById('qr-link').addEventListener('click', () => {
  document.getElementById('qr-modal').style.display = 'block';
  fetchQRCode();
});
function closeQRModal() { document.getElementById('qr-modal').style.display = 'none'; }

// Fetch QR code
async function fetchQRCode() {
  try {
    const res = await axios.get('/sessions/qr');
    const qrCode = res.data.qr;
    if(qrCode) {
      QRCode.toCanvas(document.getElementById('qr-canvas'), qrCode, err => {
        if(err) console.error(err);
      });
    }
  } catch(err) { console.error(err); }
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

let allSessions = [];

async function loadSessions() {
  try {
    const res = await axios.get(`/sessions/${currentTab}`);
    allSessions = res.data;

    // تصفية حسب صلاحيات المستخدم
    if(user.role === 'agent') {
      allSessions = allSessions.filter(s => s.agent_id === user.id);
    } else if(user.role === 'admin') {
      allSessions = allSessions.filter(s => s.agent_id && s.admin_id === user.id);
    }
    renderSessions();
  } catch(err) { console.error(err); }
}

function renderSessions() {
  const tbody = document.getElementById('sessions-body');
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const tagFilter = document.getElementById('tag-filter').value;
  tbody.innerHTML = '';

  const filtered = allSessions.filter(s => 
    (s.name.toLowerCase().includes(searchTerm) || s.phone.includes(searchTerm)) &&
    (!tagFilter || s.tags?.includes(tagFilter))
  );

  filtered.forEach(session => {
    const statusText = session.status === 'deleted' ? 'Deleted message' : session.status;
    const repeatBadge = session.repeat > 1 ? `🔁${session.repeat}` : '-';
    const noteBtn = `<button onclick="openNoteModal(${session.id})">📝 Add Note</button>`;
    const tags = session.tags ? session.tags.split(',').map(t => `<span class="tag">${t}</span>`).join(' ') : '-';

    const row = `<div>${session.id}</div>
                 <div>${session.name} / ${session.phone}</div>
                 <div>${repeatBadge}</div>
                 <div>${tags}</div>
                 <div>${noteBtn}</div>
                 <div>${statusText}</div>`;
    tbody.innerHTML += row;
  });

  document.getElementById('session-count').innerText = `${filtered.length} sessions found`;
}

// Filters
function applyFilters() { renderSessions(); }

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
      loadSessions();
    })
    .catch(err => console.error(err));
}

// Load initial sessions
window.addEventListener("load", loadSessions);

// ========================





