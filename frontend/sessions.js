let sessions = [];
let currentTab = 'all';
let currentSession = null;

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
    let url = `/sessions/${currentTab}`;
    if (currentTab === "group") {
      url = "/sessions/group/2";}
    const res = await axios.get(url, { withCredentials: true });
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
    if (filterType === "unread" && session.status !== "unread") return;
    if (filterType === "unreplied" && session.status !== "unreplied") return;
    if (filterType === "group" && !session.group_id) return;

  const tags = Array.isArray(session.tags) ? session.tags : [];
  const notes = Array.isArray(session.notes) ? session.notes : [];
   
    const tr = document.createElement("tr");

    // Name + repeat mark
    let name = session.name || "Unknown";
    if (session.repeat) {
      name += ` <span class="badge bg-warning text-dark">Repeat (${session.repeatAgents.join(", ")})</span>`;
    }

    tr.innerHTML = `
     <td>
      <img src="${session.avatar_url || '/default-avatar.png'}"
           alt="avatar"
           style="width:32px; height:32px; border-radius:50%; margin-right:6px;">
      ${name}
     </td>
     <td>${session.phone}</td>
      <td>
        <span class="badge ${session.status === "unread" ? "bg-danger" : "bg-success"}">
         ${session.status}
        </span>
      </td>
      <td>
        ${tags.map(tag => `<span class="badge bg-info text-dark me-1">${tag}</span>`).join("")}
      </td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="openNoteModal('${session.id}')">
          <i class="fas fa-sticky-note"></i>
        </button>
      </td>
    `;

    // Click to open chat
    tr.style.cursor = "pointer";
    tr.onclick = () => { 
      currentSession = session;

        document.getElementById("chatClient").innerText = session.name || session.phone;
        document.getElementById("chatStatus").innerText = `Lang: ${session.lang || "Unknown"}`;
      
      loadMessages(session.id);
  };
    tbody.appendChild(tr);
  });

  container.appendChild(table);

  document.getElementById('session-count').innerText = `${sessions.length} sessions found`;
}

// Load Messages
async function loadMessages(sessionId) {
  try {
    const res = await axios.get(`/messages/${sessionId}`, { withCredentials: true });
    const messages = res.data;
    const chatBox = document.getElementById('chatMessages');
    if (!chatBox) return;

    chatBox.innerHTML = '';
    messages.forEach(msg => {
     let content = msg.is_deleted ? `<i>Message deleted</i>` : msg.content;

      // لو الرسالة صورة
      if (msg.content_type === "image" && msg.media_url) {
        content = `<img src="${msg.media_url}" alt="image" style="max-width:200px; border-radius:8px;">`;
      }
      if (msg.content_type === "video" && msg.media_url) {
  content = `<video controls style="max-width:250px; border-radius:8px;">
               <source src="${msg.media_url}" type="video/mp4">
             </video>`;
}
      if (msg.content_type === "audio" && msg.media_url) {
  content = `<audio controls>
               <source src="${msg.media_url}" type="audio/mpeg">
             </audio>`;
}

      let translation = "";
      if (msg.translated_content) {
      translation = `<div class="translation">🌐 ${msg.translated_content}</div>`;}
      const senderClass = msg.sender_type === "client" ? "client" : "agent";
      const time = new
        Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // فقاعة الرسالة + زر الترجمة صغير
      const div = `
        <div class="message ${senderClass}"data-id="${msg.id}">
       <img src="${msg.sender_avatar || '/default-avatar.png'}"
       alt="avatar"
       style="width:28px; height:28px; border-radius:50%; margin-height:6px; vertical-align:middle;">
       <div class="bubble">
          ${content}
          ${translation}
          <span class="time">${time}</span>
          <div class="translate-btn">
            <button onclick="translateMessage(${msg.id})">🌐</button>
          </div>
        </div>
      `;
      chatBox.innerHTML += div;
    });

    // النزول للأسفل تلقائياً
    chatBox.scrollTop = chatBox.scrollHeight;
  } catch (err) {
    console.error("Error loading messages:", err);
  }
}

// Translate message
async function translateMessage(messageId) {
  try {
    const res = await axios.post(`/messages/${messageId}/translate`, { lang: "en" }, { withCredentials: true });
    const msgEl = document.querySelector(`.message[data-id="${messageId}"]`);
    if (msgEl && res.data.translated) {
       msgEl.innerHTML += `<div class="translation">🌐 ${res.data.translated}</div>`;
    }
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
  if (!text || !currentSession) return;
try {
  await axios.post(`/messages/${currentSession.id}/send`, {
  text,
  wa_number_id:
  currentSession.wa_number_id,
  jid: currentSession.jid
  }, { withCredentials: true });

  const chatBox = document.getElementById("chatMessages");
  const time = new
    Date().toLocaleString([], { hour: '2-digit', minute: '2-digit' });
  chatBox.innerHTML += `
  <div class="message agent">
  ${text}
  <span class="time">${time}</span>
  </div>`;
 chatBox.scrollTop = chatBox.scrollHeight;
    
  input.value = "";
  } catch (err) {
    console.error("‎Error while sending the message:", err);
  }
}
                                                          
 
