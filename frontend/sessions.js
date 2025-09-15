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
    console.log("/sessions response:", res.data);
    sessions = Array.isArray(res.data) ? res.data : [];

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
function renderSessions(sessions = [], filterType = "all") {
  if (!Array.isArray(sessions)) {
    console.error("renderSessions: sessions is not an array", sessions);
    return;
  }
  const container = document.getElementById("sessions-body");
  container.innerHTML = "";

  // 🔹 Search bar
  const searchBar = document.createElement("input");
  searchBar.type = "text";
  searchBar.className = "form-control mb-2";
  searchBar.placeholder = "Search clients...";
  searchBar.oninput = () => {
    renderSessions(sessions.filter(s => 
      s.name.toLowerCase().includes(searchBar.value.toLowerCase()) || 
      s.phone.includes(searchBar.value)
    ), filterType);
  };
  container.appendChild(searchBar);

  // 🔹 Table layout
  const table = document.createElement("table");
  table.className = "table table-hover table-sm";
  table.innerHTML = `
    <thead class="table-light">
      <tr>
        <th>Name</th>
        <th>Phone</th>
        <th>Status</th>
        <th>Tags</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");

  sessions.forEach(session => {
    // Apply filter
    if (filterType === "unread" && !session.unread) return;
    if (filterType === "unreplied" && !session.unreplied) return;
    if (filterType === "group" && !session.group) return;

    const tr = document.createElement("tr");

    // Name + repeat mark
    let name = session.name || "Unknown";
    if (session.repeat) {
      name += ` <span class="badge bg-warning text-dark">Repeat (${session.repeatAgents.join(", ")})</span>`;
    }

    tr.innerHTML = `
      <td>${name}</td>
      <td>${session.phone}</td>
      <td>
        <span class="badge ${session.unread ? "bg-danger" : "bg-success"}">
          ${session.unread ? "Unread" : "Active"}
        </span>
      </td>
      <td>
        ${session.tags.map(tag => `<span class="badge bg-info text-dark me-1">${tag}</span>`).join("")}
      </td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="openNoteModal('${session.id}')">
          <i class="fas fa-sticky-note"></i>
        </button>
      </td>
    `;

    // Click to open chat
    tr.style.cursor = "pointer";
    tr.onclick = () => loadMessages(session.id);

    tbody.appendChild(tr);
  });

  container.appendChild(table);

  document.getElementById('session-count').innerText = `${sessions.length} sessions found`;
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

