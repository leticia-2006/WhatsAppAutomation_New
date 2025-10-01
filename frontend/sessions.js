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
    if (window.currentUser && window.currentUser.role === "agent") {
      filtered = sessions.filter((s) => s.agent_id === user.id);
    }

    renderSessions(filtered);
  } catch (err) {
    console.error("Error loading sessions:", err);
  }
}

// 🔹 Search bar
document.adddEventListener("DOMContentLoaded", () => { 
const searchBar = document.getElementById("search-clients");
  if (searchBar) {
    searchBar.addEventListener("input", () => {
    const value = searchBar.value.toLowerCase();
      const filtered = sessions.filter((s) =>
          (s.name || "").toLowerCase().includes(value) ||
          (s.phone || "").includes(value)
      );
      renderSessions(filtered);
    });
  }
});

function renderSessions(list = [], filterType = "all") {
  const container = document.getElementById("sessions-body");
  if (!container) return;
  container.innerHTML = "";
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
  selectedSessionId = session.id;
  selectedClientId = session.client_id;
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
  const textInput = document.getElementById("msgInput");
  const fileInput = document.getElementById("mediaInput");

  let payload = {};

  try {
    // لو في ملف مرفق
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];

      // استخدام FormData عشان ترفع ميديا حقيقي للسيرفر
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mediaType", file.type.split("/")[0]);

      await axios.post(`/messages/${sessionId}/sendMedia`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
    } else {
      // إرسال رسالة نصية فقط
      const text = textInput.value.trim();
      if (!text) return; // ما ترسلش فاضي

      payload = { text };

      await axios.post(`/messages/${sessionId}/send`, payload, {
        withCredentials: true,
      });

      textInput.value = ""; // مسح البوكس بعد الإرسال
    }

    // تحديث المحادثة بعد الإرسال
    loadMessages(sessionId);
  } catch (err) {
    console.error("Error sending message", err);
    alert("Failed to send message");
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
async function loadNotes(sessionId) {
  try {
    const res = await axios.get(`/sessions/${sessionId}/notes`, { withCredentials: true });
    const textarea = document.getElementById("detail-notes");
    if (textarea) {
      // نفترض أن كل عميل له ملاحظة واحدة (آخر واحدة مثلاً)
      textarea.value = res.data.length > 0 ? res.data[res.data.length - 1].note : "";
      textarea.dataset.sessionId = sessionId; // نخزن ID لتحديثه لاحقًا
    }
  } catch (err) {
    console.error("Error loading notes:", err);
  }
}

async function saveNoteDirect() {
  const textarea = document.getElementById("detail-notes");
  if (!textarea) return;

  const sessionId = textarea.dataset.sessionId;
  const noteText = textarea.value;

  try {
    await axios.post("/sessions/add-note", { clientId: sessionId, note: noteText });
    console.log("Note saved!");
  } catch (err) {
    console.error("Error saving note:", err);
  }
}

// ربط الحفظ عند فقدان التركيز (blur)
document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("detail-notes");
  if (textarea) {
    textarea.addEventListener("blur", saveNoteDirect);
  }
});


let selectedSession = null;
let selectedSessionId = null;
let selectedClientId = null;

function showContextMenu(e, session) {
  e.preventDefault();
  selectedSession = session;
  selectedSessionId = session.id;
  selectedClientId = session.client_id;

  // إزالة التحديد السابق
  document.querySelectorAll("#sessions-body li")
    .forEach(li => li.classList.remove("context-selected"));

  // إضافة تحديد للجلسة الحالية
  e.currentTarget.classList.add("context-selected");

  const menu = document.getElementById("contextMenu");
  const { innerWidth, innerHeight } = window;

  let x = e.pageX;
  let y = e.pageY;

  // لو القائمة قربت من اليمين
  if (x + menu.offsetWidth > innerWidth) {
    x = innerWidth - menu.offsetWidth - 10;
  }
  // لو القائمة قربت من الأسفل
  if (y + menu.offsetHeight > innerHeight) {
    y = innerHeight - menu.offsetHeight - 10;
  }

  menu.style.left = x + "px";
  menu.style.top = y + "px";
  menu.style.display = "block";
}
// إخفاء القائمة عند أي كليك
document.addEventListener("click", () => {
  document.getElementById("contextMenu").style.display = "none";
});

// أمثلة على العمليات
function setupGroups() {
  alert("Setup groups for: " + selectedSession?.name);
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
function syncMessages() {
  alert("Syncing messages...");
}
function batchOperation() {
  alert("Batch operation...");
}
function applyTagFilter(tag) {
  const items = document.querySelectorAll("#sessions-body li, #sessionsTable tbody tr");

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
async function transferSession() {
  const agentId = prompt("🔄 Enter Agent ID to transfer:");
  if (!agentId) return;
await axios.post(`/sessions/transfer`, {
    sessionId: selectedSessionId,
    agentId
  });
alert("✅ Session transferred!");
  hideContextMenu();
}
// إضافة Tag
async function setTag() {
  const tag = prompt("🏷️ Enter Tag:");
  if (!tag) return;

  await axios.post(`/clients/${selectedClientId}/tags`, { tag });
  alert("✅ Tag added!");
  hideContextMenu();
}
// إضافة Label
async function setLabel() {
  const label = prompt("📌 Enter Label:");
  if (!label) return;

  await axios.post(`/sessions/${selectedSessionId}/label`, { label });
  alert("✅ Label set!");
  hideContextMenu();
}
// تحديث Avatar
async function refreshAvatar() {
  await axios.post(`/clients/${selectedClientId}/refresh-avatar`);
  alert("🔄 Avatar refreshed!");
  hideContextMenu();
}
// Pin/Unpin
async function pinSession() {
  await axios.post(`/sessions/${selectedSessionId}/pin`);
  alert("📌 Session pinned/unpinned!");
  hideContextMenu();
}
// Mark Unread
async function markUnread() {
  await axios.post(`/sessions/${selectedSessionId}/unread`);
  alert("📩 Session marked as unread!");
  hideContextMenu();
}
// Block Customer
async function blockCustomer() {
  if (!confirm("🚫 Block this customer?")) return;

  await axios.post(`/clients/${selectedClientId}/block`);
  alert("🚫 Customer blocked!");
  hideContextMenu();
}
// عند التحميل استرجاع الإعداد
window.addEventListener("load", () => {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    const toggle = document.getElementById("darkModeToggle");
    if (toggle) toggle.checked = true;
  }
});
function selectClient(sessionId, name, phone, tags) {
  document.getElementById("detailName").innerText = name;
  document.getElementById("detailPhone").innerText = phone;
  document.getElementById("detailTags").innerText = tags || "-";
// Load messages of this session
  loadMessages(sessionId);
}
