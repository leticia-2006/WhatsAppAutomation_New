// sessions.js
let sessions = [];
let currentTab = "all";
let currentSession = null;

// ====== تغيير التبويبات ======
document.addEventListener("DOMContentLoaded", () => {
  const sidebarLinks = document.querySelectorAll(".sidebar-menu a");
  sidebarLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      currentTab = link.dataset.section;
      loadSessions();
    });
  });
});

let selectedGroupId = "all"; // أو قيمة افتراضية مناسبة
// ====== تحميل الجلسات من API ======
async function loadSessions() {
  try {
    let url = `/sessions/all`;
    if (currentTab === "unread") { url = `/sessions/unread`;
    } else if (currentTab === "unreplied") { url = `/sessions/unreplied`;
    } else if (currentTab === "groups") { 
    const groupId = selectedGroupId || "all"; // أو أي قيمة افتراضية
    url= `/sessions/group/${groupId}`;
    } 
    // FIXED: placeholder groupId
    const res = await axios.get(url, { withCredentials: true });
    
    // FIXED: دعم صلاحية الوكيل (Agent)
    sessions = res.data;
    let filtered = sessions;
    if (window.currentUser?.role === "agent") {
  filtered = sessions.filter((s) => s.assigned_agent_id === window.currentUser.id);
} else if (window.currentUser?.role === "admin") {
  filtered = sessions; // ✅ المشرف يرى جميع الجلسات
    }
    renderSessions(filtered, currentTab);
    updateSidebarCounts(sessions);
  } catch (err) {
    console.error("Error loading sessions:", err);
  }
}

// 🔹 Search bar
document.addEventListener("DOMContentLoaded", () => { 
const searchBar = document.getElementById("search-clients");
  if (searchBar) {
    searchBar.addEventListener("input", () => {
    const value = searchBar.value.toLowerCase();
      const filtered = sessions.filter((s) =>
  (s.name || "").toLowerCase().includes(value) ||
  (s.phone || "").includes(value) ||
  (s.tags?.join(" ") || "").toLowerCase().includes(value) ||
  (s.last_message || "").toLowerCase().includes(value)
);
      renderSessions(filtered);
    });
  }
});

// بعد التعديل (نسخة محسّنة)
function renderSessions(list = [], filterType = "all") {
  const container = document.getElementById("sessions-body");
  if (!container) return;
  container.innerHTML = "";

  const ul = document.createElement("ul");
  ul.className = "clients-list";

  list.forEach((session) => {
    // فلترة حسب التبويب
    if (filterType === "unread" && session.status !== "unread") return;
    if (filterType === "unreplied" && session.status !== "unreplied") return;
    if (filterType === "group" && !session.group_id) return;

    // إنشاء العنصر
    const li = document.createElement("li");
    li.className = `client-item ${session.status === "unread" ? "unread" : ""}`;

    // الصورة الرمزية
    const avatar = document.createElement("img");
    avatar.src = session.avatar_url || "/default-avatar.png";
    avatar.className = "client-avatar";

    // المحتوى النصي
    const info = document.createElement("div");
    info.className = "client-info";
    info.innerHTML = `
      <div class="client-header">
        <span class="client-name">${session.name || session.client_name || session.phone}</span>
        <small class="client-phone">${session.phone || ""}</small>
        <small class="client-time">${session.last_time || ""}</small>
      </div>
      <div class="client-message">${session.last_message || ""}</div>
      <div class="client-tags">
        ${session.is_repeat ? '<span class="tag tag-repeat">Repeat</span>' : ""}
        ${(session.tags || [])
          .map((t) => `<span class="tag tag-${t.toLowerCase()}">${t}</span>`)
          .join("")}
      </div>
      <span class="client-status ${session.is_online ? "online" : "offline"}">
  ${session.is_online ? "🟢 Online" : "⚫ Offline"}
</span>
<div class="client-labels">
  ${(session.labels || []).map(l => `<span class="label">${l}</span>`).join("")}
</div>
    `;

    // زر الملاحظات
    const noteBtn = document.createElement("button");
    noteBtn.className = "note-btn";
    noteBtn.title = "Add or view notes";
    noteBtn.innerHTML = "📝";
    noteBtn.onclick = (e) => {
      e.stopPropagation();
      openNoteModal(session.id);
    };

    // تركيب العنصر
    li.appendChild(avatar);
    li.appendChild(info);
    li.appendChild(noteBtn);

    // حدث النقر لفتح الدردشة
    li.onclick = () => {
      openChat(session);
      selectClient(session.id, session.name, session.phone, session.tags);
    };

    // حدث النقر باليمين
    li.oncontextmenu = (e) => {
      e.preventDefault();
      showContextMenu(e, session);
    };

    ul.appendChild(li);
  });

  container.appendChild(ul);

  const counter = document.getElementById("session-count");
  if (counter)
    counter.innerText = `${list.length} clients (${filterType})`;
}
      
// ====== فتح المحادثة ======
async function openChat(session) {
  currentSession = session;
  selectedSessionId = session.id;
  selectedClientId = session.client_id;
  document.getElementById("chatClient").innerText = session.name || session.phone;
  document.getElementById("chatStatus").innerText =
  `Status: ${session.status || "Active"} | Lang: ${session.lang || "Unknown"}`;

  await loadMessages(session.id);
  await loadNotes(session.client_id); //
   // ✅ ربط زر الإرسال
  const sendBtn = document.getElementById("send-btn");
  if (sendBtn) {
    sendBtn.replaceWith(sendBtn.cloneNode(true));
document.getElementById("send-btn").onclick = () => sendMessage(selectedSessionId);
      } else {
        alert("⚠️ اختر محادثة أولاً");
      }
}

// ====== تحميل الرسائل ======
async function loadMessages(sessionId) {
  try {
    const res = await axios.get(`/messages/${sessionId}`, { withCredentials: true });
    const messages = res.data;
    if (window.autoTranslateEnabled) {
  messages.forEach(m => {
    if (m.sender_type === "client") translateMessage(m.id);
  });
    }
    const chatBox = document.getElementById("chatMessages");
    if (!chatBox) return;

    chatBox.innerHTML = "";

    messages.forEach((msg) => {
      let content = msg.content
     
    if (msg.is_deleted) {
    content = `
      <div class="deleted-msg">
  <strong>🗑 Deleted by ${msg.deleted_by || "system"}</strong>
  <div class="deleted-content">${msg.content || "(no content)"}</div>
      </div>
    `;
  }
// FIXED: دعم أنواع الميديا
if (
  (msg.content_type === "image" && msg.media_url) ||
  (msg.content && msg.content.match(/\.(jpg|jpeg|png|gif|webp)$/i))
) {
  const fullUrl = msg.media_url
    ? (msg.media_url.startsWith("http") ? msg.media_url : `${window.location.origin}${msg.media_url}`)
    : msg.content;

  content = `
  <div class="msg-media">
    <img src="${fullUrl}" alt="Image">
  </div>
`;
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
        <div class="message ${msg.sender_type === "client" ? "client" : "agent"} ${msg.is_deleted ? "deleted" : ""}" data-id="${msg.id}">
         <img src="${msg.sender_avatar || msg.agent_avatar || "/default-avatar.png"}" 
     title="${msg.agent_name || msg.sender_name || ''}"    style="width:28px; height:28px; border-radius:50%; vertical-align:middle;">
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

  try {
    // إذا المستخدم أرفق ملف
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];

      // إنشاء FormData لإرسال الملف
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mediaType", file.type.split("/")[0]); // image/video/audio

      await axios.post(`/messages/${sessionId}/sendMedia`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      // مسح الملف بعد الإرسال
      fileInput.value = "";
    } else {
      // إرسال رسالة نصية
      const text = textInput.value.trim();
      if (!text) return; // لا ترسل رسالة فارغة

      const payload = { content : text };

      await axios.post(`/messages/${sessionId}/send`, payload, {
        withCredentials: true,
      });

      // مسح مربع النص بعد الإرسال
      textInput.value = "";
    }

    // تحديث المحادثة بعد الإرسال
  loadMessages(sessionId);
  loadSessions(); // لتحديث قائمة الجلسات بآخر رسالة

  } catch (err) {
    console.error("Error sending message", err);
    alert("Failed to send message");
  }
}


    
// ====== ترجمة رسالة ======
window.translateMessage = async function(messageId) {
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
async function loadNotes(clientId) {
  try {
    const res = await axios.get(`/clients/${clientId}/notes`, { withCredentials: true });
    const textarea = document.getElementById("detail-notes");
    if (textarea) {
      if (res.data.length > 0) {
  textarea.value = res.data.map(n => `🕓 ${new Date(n.created_at).toLocaleString()}:\n${n.note}`).join("\n\n");
} else {
  textarea.value = "No notes yet...";
      }
      textarea.dataset.clientId = clientId;
    }
  } catch (err) {
    console.error("Error loading notes:", err);
  }
}

async function saveNoteDirect() {
  const textarea = document.getElementById("detail-notes");
  if (!textarea) return;

  const clientId = textarea.dataset.clientId;
  const noteText = textarea.value;

  try {
    await axios.post(`/clients/${clientId}/notes`, { note: noteText }, { withCredentials: true });
    console.log("✅ Note saved!");
  } catch (err) {
    console.error("Error saving note:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("detail-notes");
  if (textarea) {
    textarea.addEventListener("blur", saveNoteDirect);
  }

  const saveBtn = document.getElementById("save-notes");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveNoteDirect);
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
  document.getElementById("detailAvatar").src = session.avatar_url || "/default-avatar.png";
  document.getElementById("detailStatus").innerText = session.is_online ? "🟢 Online" : "⚫ Offline";
  document.getElementById("detailTags").innerHTML = (tags || [])
  .map(t => `<span class="tag">${t}</span>`)
  .join("");
// Load messages of this session
  loadMessages(sessionId);
}
function initChatButtons() {
  const fileBtn = document.getElementById("file-btn");
  const emojiBtn = document.getElementById("emoji-btn");
  const fileInput = document.getElementById("mediaInput");

  if (fileBtn && fileInput) {
    fileBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const preview = document.getElementById("file-preview");
      if (!preview) return;
      preview.innerHTML = "";
      if (fileInput.files.length > 0) {
        [...fileInput.files].forEach(file => {
          const div = document.createElement("div");
          div.className = "file-item";
          div.innerHTML = `📎 ${file.name}`;
          preview.appendChild(div);
        });
      }
    });
  }

  if (emojiBtn) {
    emojiBtn.addEventListener("click", () => {
      const existing = document.getElementById("emoji-picker");
      if (existing) existing.remove();

      const pickerContainer = document.createElement("div");
      pickerContainer.id = "emoji-picker";
      pickerContainer.style.position = "absolute";
      pickerContainer.style.bottom = "60px";
      pickerContainer.style.right = "100px";
      pickerContainer.style.zIndex = "9999";
      pickerContainer.style.background = "#fff";
      pickerContainer.style.border = "1px solid #ccc";
      pickerContainer.style.borderRadius = "8px";
      pickerContainer.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";

      const picker = new EmojiMart.Picker({
        onEmojiSelect: (emoji) => {
          const input = document.getElementById("msgInput");
          if (input) input.value += emoji.native;
          pickerContainer.remove();
        }
      });

      pickerContainer.appendChild(picker);
      document.body.appendChild(pickerContainer);
    });
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const groupSelect = document.getElementById("groupSelect");
  if (groupSelect) {
    groupSelect.addEventListener("change", () => {
      selectedGroupId = groupSelect.value;
      loadSessions();
    });
  }
});
function updateSidebarCounts(sessions) {
  const unread = sessions.filter(s => s.status === "unread").length;
  const unreplied = sessions.filter(s => s.status === "unreplied").length;
  document.querySelector('[data-section="unread"] .count').innerText = unread;
  document.querySelector('[data-section="unreplied"] .count').innerText = unreplied;
}
function rebindChatButtons() {
  // تأكد أن العناصر موجودة فعلاً في DOM
  if (document.getElementById("file-btn") && document.getElementById("emoji-btn")) {
    initChatButtons();
  } else {
    // انتظر قليلاً حتى تُحمّل الصفحة بالكامل
    setTimeout(rebindChatButtons, 500);
  }
}
rebindChatButtons();

