// lang.js
const translations = {
  en: {
    all: "All",
    group: "Group",
    unread: "Unread",
    unreplied: "Unreplied",
    linkWhatsapp: "Link WhatsApp",
    clients: "Clients",
    conversation: "Conversation",
    searchClients: "🔍 Search clients...",
    allTags: "All tags",
    vip: "VIP",
    new: "New",
    logout: "Logout",
    numbers: "WhatsApp Numbers",
    addNumber: "+ Add Number",
    searchNumbers: "🔍 Search numbers...",
    translate: "Translate",
    autoTranslate: "Auto-translate"
  },
  ar: {
    all: "الكل",
    group: "المجموعات",
    unread: "غير المقروء",
    unreplied: "غير المردود",
    linkWhatsapp: "ربط واتساب",
    clients: "العملاء",
    conversation: "المحادثة",
    searchClients: "🔍 بحث عن العملاء...",
    allTags: "كل الوسوم",
    vip: "هام",
    new: "جديد",
    logout: "تسجيل خروج",
    numbers: "أرقام واتساب",
    addNumber: "+ إضافة رقم",
    searchNumbers: "🔍 بحث عن الأرقام...",
    translate: "ترجمة",
    autoTranslate: "ترجمة تلقائية"
  },
  es: {
    all: "Todos",
    group: "Grupo",
    unread: "No leído",
    unreplied: "Sin respuesta",
    linkWhatsapp: "Vincular WhatsApp",
    clients: "Clientes",
    conversation: "Conversación",
    searchClients: "🔍 Buscar clientes...",
    allTags: "Todas las etiquetas",
    vip: "VIP",
    new: "Nuevo",
    logout: "Cerrar sesión",
    numbers: "Números de WhatsApp",
    addNumber: "+ Agregar número",
    searchNumbers: "🔍 Buscar números...",
    translate: "Traducir",
    autoTranslate: "Traducción automática"
  }
};

let currentLang = "en";

function setLanguage(lang) {
  currentLang = lang;
  const t = translations[lang];

  // RTL if Arabic
  document.body.dir = lang === "ar" ? "rtl" : "ltr";

 // Sidebar
const groupsLink = document.querySelector('[data-section="groups"] .label');
if (groupsLink) groupsLink.textContent = t.group;

const unreadLink = document.querySelector('[data-section="unread"] .label');
if (unreadLink) unreadLink.textContent = t.unread;

const numbersLink = document.querySelector('[data-section="numbers"] .label');
if (numbersLink) numbersLink.textContent = t.numbers;

const usersLink = document.querySelector('[data-section="users"] .label');
if (usersLink) usersLink.textContent = t.users || "Users";
/*const qrLink = document.querySelector('#qr-link a');
if (qrLink) qrLink.textContent = t.linkWhatsapp;*/

// Chat Header
const chatClient = document.getElementById("chatClient");
if (chatClient) chatClient.textContent = t.conversation;

// Search input
const searchClients = document.getElementById("search-clients");
if (searchClients) searchClients.placeholder = t.searchClients;

  // Inputs & buttons
  if (document.querySelector("#search-clients")) {
    document.querySelector("#search-clients").placeholder = t.searchClients;
  }
  if (document.querySelector("#tagFilterClients option[value='all']")) {
    document.querySelector("#tagFilterClients option[value='all']").textContent = t.allTags;
  }
  if (document.querySelector("#tagFilterClients option[value='VIP']")) {
    document.querySelector("#tagFilterClients option[value='VIP']").textContent = t.vip;
  }
  if (document.querySelector("#tagFilterClients option[value='New']")) {
    document.querySelector("#tagFilterClients option[value='New']").textContent = t.new;
  }

  // Numbers section (لو عندك صفحة numbers.html)
  if (document.querySelector("#numbers-section .card-title")) {
    document.querySelector("#numbers-section .card-title").textContent = t.numbers;
  }
  if (document.querySelector("#addNumberBtn")) {
    document.querySelector("#addNumberBtn").textContent = t.addNumber;
  }
  if (document.querySelector("#search-numbers")) {
    document.querySelector("#search-numbers").placeholder = t.searchNumbers;
  }
  
 if (document.querySelector("#search-clients")) {
  document.querySelector("#search-clients").placeholder = t.searchClients;
 }
 if (document.querySelector("#filter-tag option[value='all']")) {
  document.querySelector("#filter-tag option[value='all']").textContent = t.all;
 }
 if (document.querySelector("#filter-tag option[value='vip']")) {
  document.querySelector("#filter-tag option[value='vip']").textContent = t.vip;
 }
 if (document.querySelector("#filter-tag option[value='new']")) {
  document.querySelector("#filter-tag option[value='new']").textContent = t.new;
 }
 if (document.querySelector("#chatClient")) {
  document.querySelector("#chatClient").textContent = t.conversation;
 }
 if (document.querySelector("#chatStatus")) {
  document.querySelector("#chatStatus").textContent = "Offline"; // يمكن لاحقاً ترجمتها
 }
 if (document.querySelector("#msgInput")) {
  document.querySelector("#msgInput").placeholder = "Type a message...";
 }
 if (document.querySelector("#send-btn")) {
  document.querySelector("#send-btn").title = t.translate;
 }  
}
// 🌍 زر تبديل اللغة
document.addEventListener("DOMContentLoaded", () => {
  // تحميل اللغة المحفوظة
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
