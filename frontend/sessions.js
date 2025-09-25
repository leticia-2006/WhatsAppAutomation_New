// sessions.js
let sessions = [];
let currentTab = "all";
let currentSession = null;

// ====== تحميل الجلسات عند بدء الصفحة ======
document.addEventListener("DOMContentLoaded", () => {
  loadSessions();
});

// ====== تغيير التبويبات ======
const tabLinks = document.querySelectorAll(".tab-link");
tabLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    currentTab = link.dataset.tab;

    tabLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");

    loadSessions();
  });
});

// ====== تحميل الجلسات من API ======
async function loadSessions() {
  try {
    let url = `/sessions/${currentTab}`;
    if (currentTab === "group") {
      const groupId = document.getElementById ("groupSelect").value; url= `/sessions/group/${groupId}`; // FIXED: placeholder groupId
    }

    const res = await axios.get(url, { withCredentials: true });
    

    // FIXED: دعم صلاحية الوكيل (Agent)
    sessions = res.data;
    let filtered = sessions;
    if (window.user && user.role === "agent") {
      filtered = sessions.filter((s) => s.agent_id === user.id);
    }

    renderSessions(filtered);
  } catch (err) {
    console.error("Error loading sessions:", err);
  }
}

function renderSessions(list = [], filterType = "all") {
  const container = document.getElementById("sessions-body");
  if (!container) return;

  container.innerHTML = "";

  // 🔹 Search bar
  const searchBar = document.createElement("input");
  searchBar.type = "text";
  searchBar.className = "form-control mb-2";
  searchBar.placeholder = "Search clients...";
  searchBar.oninput = () => {
    renderSessions(
      list.filter(
        (s) =>
          (s.name || "").toLowerCase().includes(searchBar.value.toLowerCase()) ||
          (s.phone || "").includes(searchBar.value)
      ),
      filterType
    );
  };
  container.appendChild(searchBar);

  // 🔹 Sessions list
  const ul = document.createElement("ul");
  ul.className = "list-unstyled m-0";

  list.forEach((session) => {
    if (filterType === "unread" && session.status !== "unread") return;
    if (filterType === "unreplied" && session.status !== "unreplied") return;
    if (filterType === "group" && !session.group_id) return;

    const li = document.createElement("li");

    // avatar
    const avatar = document.createElement("img");
    avatar.src = session.avatar_url || "/default-avatar.png";
    avatar.className = "client-avatar";

    // info
    const info = document.createElement("div");
    info.className = "client-info";
    info.innerHTML = `
      <div class="top">
        <span>${session.name || session.phone}</span>
        <small>${session.last_time || ""}</small>
      </div>
      <div class="last-msg">${session.last_message || ""}</div>
      <div class="client-tags">
        ${session.repeat ? '<span class="tag tag-repeat">Repeat</span>' : ""}
        ${Array.isArray(session.tags)
          ? session.tags
              .map((t) => `<span class="tag tag-${t.toLowerCase()}">${t}</span>`)
              .join("")
          : ""}
      </div>
    `;

    // note button
    const noteBtn = document.createElement("span");
    noteBtn.className = "note-btn";
    noteBtn.innerHTML = "📝";
    noteBtn.onclick = (e) => {
      e.stopPropagation();
      openNoteModal(session.id);
    };

    li.appendChild(avatar);
    li.appendChild(info);
    li.appendChild(noteBtn);

    // click = open chat
    li.style.cursor = "pointer";
    li.onclick = () => openChat(session);

    // right-click = context menu
    li.oncontextmenu = (e) => {
      e.preventDefault();
      showContextMenu(e, session);
    };

    ul.appendChild(li);
  });

  container.appendChild(ul);

  document.getElementById("session-count").innerText = `${list.length} sessions found`;
}
      
// ====== فتح المحادثة ======
function openChat(session) {
  currentSession = session;
  document.getElementById("chatClient").innerText = session.name || session.phone;
  document.getElementById("chatStatus").innerText = `Lang: ${
    session.lang || "Unknown"
  }`;

  loadMessages(session.id);
}

// ====== تحميل الرسائل ======
async function loadMessages(sessionId) {
  try {
    const res = await axios.get(`/messages/${sessionId}`, { withCredentials: true });
    const messages = res.data;
    const chatBox = document.getElementById("chatMessages");
    if (!chatBox) return;

    chatBox.innerHTML = "";

    messages.forEach((msg) => {
      let content = msg.content
     
    if (msg.is_deleted) {
    content = `
      <div class="deleted-msg">
        <div class="deleted-label">🗑 Deleted Message</div>
        <div class="deleted-content">${msg.content}</div>
      </div>
    `;
  }

// FIXED: دعم أنواع الميديا
   if (msg.content_type === "image" && msg.media_url) {
        content = `<img src="${msg.media_url}" style="max-width:200px; border-radius:8px;">`;
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

      const time = new Date(msg.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const div = `
        <div class="message ${msg.sender_type === "client" ? "client" : "agent"}" ${msg.is_deleted ? "deleted" : ""}" data-id="${msg.id}">
         <img src="${msg.sender_avatar || "/default-avatar.png"}"
               style="width:28px; height:28px; border-radius:50%; vertical-align:middle;">
          <div class="bubble">
            ${content}
            ${
              msg.translated_content
                ? `<div class="translation">🌐 ${msg.translated_content}</div>`
                : ""
            }
            <span class="time">${time}</span>
            <div class="translate-btn">
              <button onclick="translateMessage(${msg.id})">🌐</button>
            </div>
          </div>
        </div>
      `;

      chatBox.innerHTML += div;
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  } catch (err) {
    console.error("Error loading messages:", err);
  }
}

// ====== إرسال رسالة ======
async function sendMessage(sessionId) {
  const input = document.getElementById("msgInput");
  const fileInput = document.getElementById("mediaInput");
  const text = document.getElementById("msgInput").value;
let payload = { text };
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const mediaUrl = URL.createObjectURL(file); // (ممكن ترفع للسيرفر)
    payload = { mediaUrl, mediaType: file.type.split("/")[0] };
  }
    await axios.post(
      `/messages/${sessionId}/send`, payload,  
   { withCredentials: true });
  loadMessages(sessionId);
} catch (err) {
    console.error("Error sending message", err);
    alert("Failed to send message");
  }
}

    

    // FIXED: عرض الرسالة مباشرة بدون إعادة تحميل
    const chatBox = document.getElementById("chatMessages");
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    chatBox.innerHTML += `
      <div class="message agent">
        ${text}
        <span class="time">${time}</span>
      </div>
    `;
    chatBox.scrollTop = chatBox.scrollHeight;

    input.value = "";
  } catch (err) {
    console.error("Error sending message:", err);
  }
}

// ====== ترجمة رسالة ======
async function translateMessage(messageId) {
  try {
    const res = await axios.post(
      `/messages/${messageId}/translate`,
      { lang: "en" },
      { withCredentials: true }
    );

    const msgEl = document.querySelector(`.message[data-id="${messageId}"] .bubble`);
    if (msgEl && res.data.translated) {
      msgEl.innerHTML += `<div class="translation">🌐 ${res.data.translated}</div>`;
    }
  } catch (err) {
    console.error("Error translating message:", err);
  }
}

// ====== ملاحظات ======
function openNoteModal(clientId) {
  let modal = document.getElementById("note-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "note-modal";
    modal.style =
      "display:block; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#fff; padding:20px; border:1px solid #ccc; z-index:1000; border-radius:8px;";
    modal.innerHTML = `
      <h3>Add Note</h3>
      <textarea id="note-text" rows="4" cols="40" placeholder="Write your note..."></textarea>
      <br><br>
      <button onclick="saveNote()">Save</button>
      <button onclick="closeNoteModal()">Cancel</button>
    `;
    document.body.appendChild(modal);
  } else {
    modal.style.display = "block";
  }
  document.getElementById("note-text").value = "";
  modal.dataset.clientId = clientId;
}

function closeNoteModal() {
  const modal = document.getElementById("note-modal");
  if (modal) modal.style.display = "none";
}

function saveNote() {
  const modal = document.getElementById("note-modal");
  const clientId = modal.dataset.clientId;
  const noteText = document.getElementById("note-text").value;

  axios
    .post("/sessions/add-note", { clientId, note: noteText })
    .then(() => {
      closeNoteModal();
      loadSessions(); // FIXED: تحديث الجدول بعد حفظ الملاحظة
    })
    .catch((err) => console.error("Error saving note:", err));
}

async function loadNotes(sessionId) {
  const res = await axios.get(`/sessions/${sessionId}/notes`, { withCredentials: true });
  const notesDiv = document.getElementById("notesList");
  notesDiv.innerHTML = "";
  res.data.forEach(n => {
    const li = document.createElement("li");
    li.textContent = n.note;
    notesDiv.appendChild(li);
  });
}

let selectedSession = null;

function showContextMenu(e, session) {
  selectedSession = session;
  const menu = document.getElementById("contextMenu");
  menu.style.display = "block";
  menu.style.left = e.pageX + "px";
  menu.style.top = e.pageY + "px";
}

// إخفاء القائمة عند أي كليك
document.addEventListener("click", () => {
  document.getElementById("contextMenu").style.display = "none";
});

// أمثلة على العمليات
function transferSession() {
  alert("Transfer session: " + selectedSession?.name);
}
function setupGroups() {
  alert("Setup groups for: " + selectedSession?.name);
}
function setLabel() {
  alert("Set label for: " + selectedSession?.name);
}
function deleteTag() {
  alert("Delete tag from: " + selectedSession?.name);
}
function blockMessaging() {
  alert("Blocked messaging for: " + selectedSession?.name);
}
function unpinSession() {
  alert("Unpinned: " + selectedSession?.name);
}
function doNotDisturb() {
  alert("DND mode enabled for: " + selectedSession?.name);
}
function refreshAvatar() {
  alert("Refreshing avatar...");
}
function syncMessages() {
  alert("Syncing messages...");
}
function batchOperation() {
  alert("Batch operation...");
}
function applyTagFilter(tag) {
  const items = document.querySelectorAll("#sessionsListli, #sessionsTable tbody tr");

  items.forEach(item => {
    if (tag === "all" || item.classList.contains(tag)) {
      item.style.display = "";
    } else {
      item.style.display = "none";
    }
  });
}
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");

  // حفظ الخيار في localStorage
  if (document.body.classList.contains("dark-mode")) {
    localStorage.setItem("theme", "dark");
  } else {
    localStorage.setItem("theme", "light");
  }
}

// عند التحميل استرجاع الإعداد
window.onload = () => {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    document.getElementById("darkModeToggle").checked = true;
  }
};
function selectClient(sessionId, name, phone, tags) {
  document.getElementById("detailName").innerText = name;
  document.getElementById("detailPhone").innerText = phone;
  document.getElementById("detailTags").innerText = tags || "-";

  // Load messages of this session
  loadMessages(sessionId);
}
