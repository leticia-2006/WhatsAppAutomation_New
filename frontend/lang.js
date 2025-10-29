const translations = {
  en: {
    all: "All",
    group: "Groups",
    unread: "Unread",
    unreplied: "Unreplied",
    linkWhatsapp: "Link WhatsApp",
    vip: "VIP",
    new: "New",
    old: "Old",
    deal: "Deal",
    repeat: "Repeat",
    invalid: "Invalid",
    blacklisted: "Blacklist",
    logout: "Logout",
    numbers: "Numbers",
    addNumber: "+ Add Number",
    searchNumbers: "🔍 Search numbers...",
    translate: "Translate",
    autoTranslate: "Auto-translate",
    users: "Users",
    status: "Status",
    tags: "Tags",
    notes: "Notes",
    save: "Save",
    writeNote: "Write a note...",
    offline: "Offline",
    blacklist: "Blacklist",
    transfer: "Transfer",
    refresh: "Refresh Avatar",
    conversation: "Conversation",
    searchClients: "Search clients...",
    allTags: "All tags",
    typeMessage: "Type a message..." 
  },
  ar: {
    all: "الكل",
    group: "المجموعات",
    unread: "غير مقروءة",
    unreplied: "بدون رد",
    linkWhatsapp: "ربط واتساب",
    vip: "هام",
    new: "جديد",
    old: "قديم",
    deal: "صفقة",
    repeat: "متكرر",
    invalid: "غير صالح",
    blacklisted: "محظور",
    logout: "تسجيل خروج",
    numbers: "الأرقام",
    addNumber: "+ إضافة رقم",
    searchNumbers: "🔍 بحث عن الأرقام...",
    translate: "ترجمة",
    autoTranslate: "ترجمة تلقائية",
    users: "المستخدمون",
    status: "الحالة",
    tags: "الوسوم",
    notes: "الملاحظات",
    save: "حفظ",
    writeNote: "أضف ملاحظة...",
    offline: "غير متصل",
    blacklist: "حظر",
    transfer: "نقل",
    refresh: "تحديث الصورة",
    conversation: "المحادثة",
    searchClients: "بحث عن العملاء...",
    allTags: "كل الوسوم",
    typeMessage: "اكتب رسالة..." 
  },
  es: {
    all: "Todos",
    group: "Grupos",
    unread: "No leído",
    unreplied: "Sin respuesta",
    linkWhatsapp: "Vincular WhatsApp",
    vip: "VIP",
    new: "Nuevo",
    old: "Antiguo",
    deal: "Acuerdo",
    repeat: "Repetido",
    invalid: "Inválido",
    blacklisted: "Lista negra",
    logout: "Cerrar sesión",
    numbers: "Números",
    addNumber: "+ Agregar número",
    searchNumbers: "🔍 Buscar números...",
    translate: "Traducir",
    autoTranslate: "Traducción automática",
    users: "Usuarios",
    status: "Estado",
    tags: "Etiquetas",
    notes: "Notas",
    save: "Guardar",
    writeNote: "Escribe una nota...",
    offline: "Desconectado",
    blacklist: "Lista negra",
    transfer: "Transferir",
    refresh: "Actualizar avatar",
    conversation: "Conversación",
    searchClients: "Buscar clientes...",
    allTags: "Todas las etiquetas",
    typeMessage: "Escribe un mensaje..." 

  }
};

let currentLang = "en";

function setLanguage(lang) {
  currentLang = lang;
  const t = translations[lang];
  document.body.dir = lang === "ar" ? "rtl" : "ltr";

  // ===== Sidebar =====
const groupsLabel = document.querySelector('[data-section="groups"] .label');
if (groupsLabel) groupsLabel.textContent = t.group;

const unreadLabel = document.querySelector('[data-section="unread"] .label');
if (unreadLabel) unreadLabel.textContent = t.unread;

const numbersLabel = document.querySelector('[data-section="numbers"] .label');
if (numbersLabel) numbersLabel.textContent = t.numbers;

const usersLabel = document.querySelector('[data-section="users"] .label');
if (usersLabel) usersLabel.textContent = t.users;

const logoutButton = document.getElementById("logout-btn");
if (logoutButton) logoutButton.setAttribute("title", t.logout);

const langSwitch = document.getElementById("lang-switch");
if (langSwitch) langSwitch.setAttribute("title", t.translate);

// ===== Chat Section =====
const chatClient = document.getElementById("chatClient");
if (chatClient) chatClient.textContent = t.conversation;

const chatStatus = document.getElementById("chatStatus");
if (chatStatus) chatStatus.textContent = t.offline;

const msgInput = document.getElementById("msgInput");
if (msgInput) msgInput.placeholder = t.typeMessage;


  // ===== Clients List =====
const searchClients = document.getElementById("search-clients");
if (searchClients) searchClients.placeholder = t.searchClients;

const filter = document.getElementById("filter-tag");
if (filter) {
  const optAll = filter.querySelector('option[value="all"]');
  if (optAll) optAll.textContent = t.all;

  const optVip = filter.querySelector('option[value="vip"]');
  if (optVip) optVip.textContent = t.vip;

  const optNew = filter.querySelector('option[value="new"]');
  if (optNew) optNew.textContent = t.new;
  const optOld = filter.querySelector('option[value="old"]');
  if (optOld) optOld.textContent = t.old;

  const optDeal = filter.querySelector('option[value="deal"]');
  if (optDeal) optDeal.textContent = t.deal;

  const optRepeat = filter.querySelector('option[value="repeat"]');
  if (optRepeat) optRepeat.textContent = t.repeat;

  const optInvalid = filter.querySelector('option[value="invalid"]');
  if (optInvalid) optInvalid.textContent = t.invalid;

  const optBlacklisted = filter.querySelector('option[value="blacklisted"]');
  if (optBlacklisted) optBlacklisted.textContent = t.blacklisted;
}

// ===== Client Details =====
const clientLabel = document.querySelector('.client-label');
if (clientLabel) clientLabel.textContent = t.status;

const clientTagLabel = document.querySelector('.client-card-item:nth-child(2) .client-label');
if (clientTagLabel) clientTagLabel.textContent = t.tags;

const notesHeader = document.querySelector('.notes-header h4');
if (notesHeader) notesHeader.textContent = t.notes;

const saveNotesBtn = document.getElementById("save-notes");
if (saveNotesBtn) saveNotesBtn.setAttribute("title", t.save);

const detailNotes = document.getElementById("detail-notes");
if (detailNotes) detailNotes.setAttribute("placeholder", t.writeNote);

// ===== Buttons in details =====
const blockClientBtn = document.getElementById("block-client");
if (blockClientBtn) blockClientBtn.setAttribute("title", t.blacklist);

const transferClientBtn = document.getElementById("transfer-client");
if (transferClientBtn) transferClientBtn.setAttribute("title", t.transfer);

const refreshAvatarBtn = document.getElementById("refresh-avatar");
if (refreshAvatarBtn) refreshAvatarBtn.setAttribute("title", t.refresh);
}
// 🌍 Language Switch
document.addEventListener("DOMContentLoaded", () => {
  const savedLang = localStorage.getItem("language") || "en";
  setLanguage(savedLang);

  const langSwitch = document.getElementById("lang-switch");
  if (langSwitch) {
    langSwitch.addEventListener("click", () => {
      const langs = ["en", "ar", "es"];
      const current = localStorage.getItem("language") || "en";
      const next = langs[(langs.indexOf(current) + 1) % langs.length];
      localStorage.setItem("language", next);
      setLanguage(next);
    });
  }
});
