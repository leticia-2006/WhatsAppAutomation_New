let sessions = [];
let currentTab = 'all';

// Tabs switching
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

// Load Sessions
async function loadSessions() {
  try {
    const res = await axios.get(`/sessions/${currentTab}`, { withCredentials: true });
    sessions = res.data || [];

    // لو Agent → فلترة الجلسات الخاصة بيه فقط
    let filteredSessions = sessions;
    if (user.role === 'agent') {
      filteredSessions = sessions.filter(s => s.agent_id === user.id);
    }

    renderSessions(filteredSessions);
  } catch (err) {
    console.error('Error loading sessions:', err);
  }
}

// Render Sessions
function renderSessions(data = sessions) {
  const tbody = document.getElementById('sessions-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!data.length) {
    tbody.innerHTML = '<div class="row">No sessions found</div>';
    document.getElementById('session-count').innerText = '0 sessions found';
    return;
  }

  data.forEach(session => {
    const id = session.id || '-';
    const name = session.name || '-';
    const phone = session.phone || '-';
    const group = session.group_id ? `Group ${session.group_id}` : '-';
    const tags = session.tags ? session.tags.split(',').map(t => `<span class="tag">${t}</span>`).join(' ') : '-';
    const statusText = session.status || '-';

    const noteBtn = `<button onclick="openNoteModal(${id})">📝 Note</button>`;

    const row = document.createElement("div");
    row.classList.add("row");
    row.innerHTML = `
       <div>${id}</div>
       <div>${name} / ${phone}</div>
       <div>${group}</div>
       <div>${tags}</div>
       <div>${noteBtn}</div>
       <div>${statusText}</div>
    `;
    row.addEventListener("click", () => loadMessages(id));
    tbody.appendChild(row);
  });

  document.getElementById('session-count').innerText = `${data.length} sessions found`;
}

// Load Messages
async function loadMessages(clientId) {
  try {
    const res = await axios.get(`/messages/${clientId}`, { withCredentials: true });
    const messages = res.data;
    const chatBox = document.getElementById('chatMessages');
    if (!chatBox) return;

    chatBox.innerHTML = '';
    messages.forEach(msg => {
      const content = msg.is_deleted ? `<i>Message deleted</i>` : msg.content;
      const div = `<div class="message ${msg.sender_role}">
                     <strong>${msg.sender_role}:</strong> ${content}
                     <button onclick="translateMessage(${msg.id})">🌐</button>
                   </div>`;
      chatBox.innerHTML += div;
    });
  } catch (err) {
    console.error("Error loading messages:", err);
  }
}

// Translate message
async function translateMessage(messageId) {
  try {
    const res = await axios.get(`/messages/translate/${messageId}`, { withCredentials: true });
    alert("Translated: " + res.data.translation);
  } catch (err) {
    console.error("Error translating message:", err);
  }
}

// Notes Modal
function openNoteModal(clientId) {
  const modal = document.getElementById('note-modal');
  if (!modal) {
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
  document.getElementById('note-text').value = '';
  modal.dataset.clientId = clientId;
}

function closeNoteModal() {
  const modal = document.getElementById('note-modal');
  if (modal) modal.style.display = 'none';
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
async function sendMessage() {
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  if (!text || !sessions.length) return;

  // اختار أول جلسة حالياً أو اللي معمول لها load
  const clientId = sessions[0]?.id;
  await axios.post(`/messages/send`, { clientId, text });
  input.value = "";
  loadMessages(clientId);
}

