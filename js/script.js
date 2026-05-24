const DEFAULT_CAMERAS = [
  { url: "https://www.youtube.com/embed/mhJRzQsLZGg?si=8BPKYoEe7C7L_jYX", name: "Starbase NSF" },
  { url: "https://www.youtube.com/embed/vd4uGm1_xt0?si=Hnr1Z-fZDhEjKg5a", name: "Nerdle Cam Starbase LabPadre" },
  { url: "https://www.youtube.com/embed/qw3uaLRrYNY?si=LO7Aj-vkxprk2Wxk", name: "Rocket Ranch Cam Starbase LabPadre" },
  { url: "https://www.youtube.com/embed/lDdHE8XkU34?si=4gKlmvQr2Gdc2ZE3", name: "Starbase The Launch Pad" },
  { url: "https://www.youtube.com/embed/ATP6_fFLFp0?si=oFtmBVMK_52PHnmo", name: "Plex Cam Starbase LabPadre" },
  { url: "https://www.youtube.com/embed/jy4uGOu7N4g?si=w0D_VBNiGBD_igTX", name: "Rover Cam Labpadre" },
  { url: "https://www.youtube.com/embed/IQV0DlS1Ew0?si=mHa3ojQzZIC3LPP0", name: "Sentinel Cam Starbase LabPadre" },
  { url: "https://www.youtube.com/embed/tS2PHJmvJzo?si=iQ6LSnNTii6xvG7C", name: "Rover 2.0 Cam Starbase LabPadre" },
  { url: "https://www.youtube.com/embed/U3ERnA7MJuI?si=epu1AzNlF7JMoYSM", name: "SpaceX Starbase What about it?" },
  { url: "https://www.youtube.com/embed/FTw5xuq2swo?si=wHO9ncnhNCsNXgRw", name: "Gator Cam" },
  { url: "https://www.youtube.com/embed/H7SvvCDNb_s?si=n5qPjAffA613jd7r", name: "Sapphire Cam Starbase LabPadre" },
  { url: "https://www.youtube.com/embed/cOmmvhDQ2HM?si=sxVgPt6NgoFhO_78", name: "McGregor NSF" },
];

let cameraConfigs = {
  config1: DEFAULT_CAMERAS.map(cam => ({ ...cam, status: "loading" }))
};

const DEFAULT_CAMERA_CONFIG = "config1";
const PLAYER_ERROR_MESSAGES = {
  2: "Invalid stream URL or video id.",
  5: "Playback error from YouTube.",
  100: "This stream is unavailable or private.",
  101: "Playback is blocked by the stream owner.",
  150: "Playback is blocked by the stream owner.",
};

const activePlayers = new Map();
let currentRenderToken = 0;
let isDomReady = false;
let isYouTubeApiReady = false;
let hasInitializedApp = false;

function createIframes(cameras) {
  const videoGrid = document.getElementById("videoGrid");
  videoGrid.innerHTML = "";

  cameras.forEach((camera, index) => {
    const tile = document.createElement("div");
    tile.className = "grid-item is-loading";
    tile.dataset.tileIndex = String(index);
    tile.dataset.cameraName = camera.name;

    const iframeContainer = document.createElement("div");
    iframeContainer.id = "player-" + index;
    iframeContainer.className = "player-frame";
    tile.appendChild(iframeContainer);

    const statusOverlay = document.createElement("div");
    statusOverlay.className = "stream-status";
    statusOverlay.textContent = "Connecting stream...";
    tile.appendChild(statusOverlay);

    const nameOverlay = document.createElement("div");
    nameOverlay.className = "camera-name-overlay";
    nameOverlay.textContent = camera.name;
    tile.appendChild(nameOverlay);

    videoGrid.appendChild(tile);
  });
}

function onYouTubeIframeAPIReady() {
  isYouTubeApiReady = true;
  initializeAppWhenReady();
}

function initCameraConfig(config) {
  const cameras = cameraConfigs[config];
  const renderToken = ++currentRenderToken;
  destroyAllPlayers();

  if (!Array.isArray(cameras) || cameras.length === 0) {
    createIframes([{ name: "No streams", url: null }]);
    updateGridLayout(1);
    setTileStatus(0, "error", "No streams found for this selection.");
    return;
  }

  createIframes(cameras);
  updateGridLayout(cameras.length);

  if (!window.YT || typeof window.YT.Player !== "function") {
    cameras.forEach((_, index) => {
      setTileStatus(index, "error", "YouTube API is not ready.");
    });
    return;
  }

  cameras.forEach((camera, index) => {
    const videoId = extractVideoID(camera.url);

    if (!videoId) {
      setTileStatus(index, "error", "Invalid stream URL.");
      updateCameraStatus(index, "error");
      return;
    }

    setTileStatus(index, "loading", "Connecting stream...");
    updateCameraStatus(index, "loading");

    try {
      const player = new YT.Player("player-" + index, {
        height: "100%",
        width: "100%",
        videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            if (renderToken !== currentRenderToken) return;
            clearTileStatus(index);
            updateCameraStatus(index, "ok");
          },
          onError: (event) => {
            if (renderToken !== currentRenderToken) return;
            setTileStatus(index, "error", getPlayerErrorMessage(event.data));
            updateCameraStatus(index, "error");
          },
        },
      });

      activePlayers.set(index, player);
    } catch (error) {
      console.error("Unable to initialize stream player:", error);
      setTileStatus(index, "error", "Could not initialize this stream.");
      updateCameraStatus(index, "error");
    }
  });
}

function extractVideoID(url) {
  if (!url || typeof url !== "string") return null;

  try {
    const urlObj = new URL(url);
    const fromQuery = urlObj.searchParams.get("v");
    if (fromQuery) return fromQuery;

    const segments = urlObj.pathname.split("/").filter(Boolean);
    if (!segments.length) return null;
    return segments[segments.length - 1];
  } catch (error) {
    console.error("Invalid URL for stream:", url);
    return null;
  }
}

function updateGridLayout(numVideos) {
  const videoGrid = document.getElementById("videoGrid");

  if (numVideos <= 0) {
    videoGrid.style.gridTemplateColumns = "1fr";
    videoGrid.style.gridTemplateRows = "1fr";
    return;
  }

  const numCols = Math.ceil(Math.sqrt(numVideos));
  const numRows = Math.ceil(numVideos / numCols);

  videoGrid.style.gridTemplateColumns = `repeat(${numCols}, 1fr)`;
  videoGrid.style.gridTemplateRows = `repeat(${numRows}, 1fr)`;
}

function initializeAppWhenReady() {
  if (!isDomReady || !isYouTubeApiReady || hasInitializedApp) return;
  hasInitializedApp = true;

  const cameraConfigSelect = document.getElementById("cameraConfig");
  if (cameraConfigSelect) {
    cameraConfigSelect.value = DEFAULT_CAMERA_CONFIG;
    cameraConfigSelect.addEventListener("change", (event) => {
      initCameraConfig(event.target.value);
    });
  }

  initCameraConfig(DEFAULT_CAMERA_CONFIG);
}

function destroyAllPlayers() {
  activePlayers.forEach((player) => {
    if (!player || typeof player.destroy !== "function") return;

    try {
      player.destroy();
    } catch (error) {
      console.error("Error destroying YouTube player:", error);
    }
  });

  activePlayers.clear();
}

function getPlayerErrorMessage(errorCode) {
  return (
    PLAYER_ERROR_MESSAGES[errorCode] ||
    "This stream could not be loaded right now."
  );
}

function setTileStatus(index, status, message) {
  const tile = document.querySelector(`.grid-item[data-tile-index="${index}"]`);
  if (!tile) return;

  tile.classList.remove("is-loading", "has-error");
  if (status === "loading") tile.classList.add("is-loading");
  if (status === "error") tile.classList.add("has-error");

  const statusOverlay = tile.querySelector(".stream-status");
  if (!statusOverlay) return;
  statusOverlay.textContent = message || "";
}

function clearTileStatus(index) {
  const tile = document.querySelector(`.grid-item[data-tile-index="${index}"]`);
  if (!tile) return;

  tile.classList.remove("is-loading", "has-error");

  const statusOverlay = tile.querySelector(".stream-status");
  if (statusOverlay) statusOverlay.textContent = "";
}

function updateCameraStatus(index, status) {
  const cameras = cameraConfigs.config1;
  if (cameras && cameras[index]) {
    cameras[index].status = status;
    syncStatusToPanel(index, status);
  }
}

function syncStatusToPanel(index, status) {
  const adminStreamItems = document.querySelectorAll(".admin-stream-item");
  if (adminStreamItems[index]) {
    const statusIndicator = adminStreamItems[index].querySelector(".status-indicator");
    if (statusIndicator) {
      statusIndicator.className = "status-indicator status-" + status;
      statusIndicator.textContent = status === "ok" ? "✓" : status === "error" ? "✗" : "○";
    }
  }
}

const ADMIN_CONFIG_KEY = "x_y_z"; // Ofuscado (no dice "admin")
const ADMIN_SESSION_KEY = "a_b_c"; // Ofuscado
const STREAM_CONFIG_KEY = "s_t_r";
const ADMIN_LOCKOUT_KEY = "l_o_c";
const ADMIN_INTEGRITY_KEY = "int_check";
const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION = 900000;
const SESSION_TIMEOUT = 1200000;
const SESSION_CHECK_INTERVAL = 60000;

function simpleEncrypt(text) {
  return btoa(text.split('').reverse().join(''));
}

function simpleDecrypt(encrypted) {
  try {
    return atob(encrypted).split('').reverse().join('');
  } catch (e) {
    return null;
  }
}

function detectDevTools() {
  const threshold = 160;
  let isOpen = false;

  const test = () => {
    const start = performance.now();
    debugger;
    const elapsed = performance.now() - start;
    return elapsed > threshold;
  };

  if (test()) {
    isOpen = true;
  }

  return isOpen;
}

function calculateChecksum(data) {
  let hash = 0;
  const str = JSON.stringify(data);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
  if (!salt) {
    salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return { hash: hashHex, salt };
}

async function verifyPassword(inputPassword, storedHash, salt) {
  const { hash } = await hashPassword(inputPassword, salt);
  return hash === storedHash;
}

function isAdminLockedOut() {
  const lockout = localStorage.getItem(ADMIN_LOCKOUT_KEY);
  if (!lockout) return false;

  const parsed = JSON.parse(lockout);
  const now = Date.now();

  if (now >= parsed.expiresAt) {
    localStorage.removeItem(ADMIN_LOCKOUT_KEY);
    return false;
  }

  return true;
}

function getAdminLockoutTimeRemaining() {
  const lockout = localStorage.getItem(ADMIN_LOCKOUT_KEY);
  if (!lockout) return 0;

  const parsed = JSON.parse(lockout);
  const remaining = parsed.expiresAt - Date.now();
  return remaining > 0 ? remaining : 0;
}

function recordFailedLoginAttempt() {
  let attempts = localStorage.getItem("admin_failed_attempts");
  let data = attempts ? JSON.parse(attempts) : { count: 0, firstAttempt: Date.now() };

  data.count++;
  data.lastAttempt = Date.now();

  localStorage.setItem("admin_failed_attempts", JSON.stringify(data));

  if (data.count >= MAX_LOGIN_ATTEMPTS) {
    lockoutAdmin();
  }

  return data.count;
}

function lockoutAdmin() {
  localStorage.setItem(ADMIN_LOCKOUT_KEY, JSON.stringify({
    lockedAt: Date.now(),
    expiresAt: Date.now() + LOCKOUT_DURATION
  }));
}

function clearFailedAttempts() {
  localStorage.removeItem("admin_failed_attempts");
}

function validateSessionIntegrity() {
  const session = sessionStorage.getItem(ADMIN_SESSION_KEY);
  if (!session) return false;

  try {
    const parsed = JSON.parse(session);
    const now = Date.now();
    const elapsed = now - parsed.timestamp;

    // Verificar timeout
    if (elapsed > SESSION_TIMEOUT) {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      return false;
    }

    // Verificar que no se ha modificado
    if (!parsed.loggedIn || parsed.magic !== "admin_verified") {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

function startSessionMonitoring() {
  setInterval(() => {
    if (!validateSessionIntegrity()) {
      logoutAdmin();
    }
  }, SESSION_CHECK_INTERVAL);
}

async function saveAdminPassword(password) {
  const { hash, salt } = await hashPassword(password);
  const authData = { hash, salt };
  const checksum = calculateChecksum(authData);

  const encrypted = simpleEncrypt(JSON.stringify(authData));
  localStorage.setItem(ADMIN_CONFIG_KEY, encrypted);
  localStorage.setItem(ADMIN_INTEGRITY_KEY, checksum);
}

function setAdminSession() {
  clearFailedAttempts();
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
    loggedIn: true,
    timestamp: Date.now(),
    inactivityTimeout: SESSION_TIMEOUT,
    magic: "admin_verified"
  }));
}

function getAdminSession() {
  if (!validateSessionIntegrity()) {
    return null;
  }

  const session = sessionStorage.getItem(ADMIN_SESSION_KEY);
  return session ? JSON.parse(session) : null;
}

function getAdminAuth() {
  const encrypted = localStorage.getItem(ADMIN_CONFIG_KEY);
  const storedChecksum = localStorage.getItem(ADMIN_INTEGRITY_KEY);

  if (!encrypted || !storedChecksum) {
    return null;
  }

  try {
    const decrypted = simpleDecrypt(encrypted);
    if (!decrypted) {
      return null;
    }

    const authData = JSON.parse(decrypted);
    const checksum = calculateChecksum(authData);

    // Detectar si fue modificado
    if (checksum !== storedChecksum) {
      console.warn("⚠️ ADVERTENCIA: Intento de manipulación detectado");
      localStorage.removeItem(ADMIN_CONFIG_KEY);
      localStorage.removeItem(ADMIN_INTEGRITY_KEY);
      return null;
    }

    return authData;
  } catch (e) {
    return null;
  }
}

function isAdminLoggedIn() {
  return validateSessionIntegrity();
}

function loadStreamConfig() {
  const custom = localStorage.getItem(STREAM_CONFIG_KEY);
  if (custom) {
    const parsed = JSON.parse(custom);
    // Ensure each camera has status property
    if (parsed.config1) {
      parsed.config1 = parsed.config1.map(cam => ({
        ...cam,
        status: cam.status || "loading"
      }));
    }
    return parsed;
  }
  return {
    config1: DEFAULT_CAMERAS.map(cam => ({ ...cam, status: "loading" }))
  };
}

function saveStreamConfig(config) {
  localStorage.setItem(STREAM_CONFIG_KEY, JSON.stringify(config));
  cameraConfigs = config;
}

function loadCustomConfig() {
  const custom = localStorage.getItem(STREAM_CONFIG_KEY);
  if (custom) {
    try {
      const config = JSON.parse(custom);
      // Ensure each camera has status property
      if (config.config1) {
        config.config1 = config.config1.map(cam => ({
          ...cam,
          status: cam.status || "loading"
        }));
      }
      cameraConfigs = config;
      return true;
    } catch (e) {
      console.error("Error loading custom config");
      return false;
    }
  }
  return false;
}

function renderStreamsList() {
  const streams = cameraConfigs.config1 || [];
  const listContainer = document.getElementById("adminStreamsList");
  listContainer.innerHTML = "";

  streams.forEach((camera, index) => {
    const streamItem = document.createElement("div");
    streamItem.className = "admin-stream-item";

    const status = camera.status || "loading";
    const statusText = status === "ok" ? "✓" : status === "error" ? "✗" : "○";

    streamItem.innerHTML = `
      <div class="stream-item-content">
        <div class="status-indicator status-${status}" title="${status}">${statusText}</div>
        <div class="stream-inputs">
          <input
            type="text"
            class="admin-stream-name"
            value="${camera.name || ''}"
            placeholder="Nombre (ej: Starbase NSF)"
            data-stream-index="${index}"
          />
          <input
            type="text"
            class="admin-stream-input"
            value="${camera.url || ''}"
            placeholder="Ej: https://www.youtube.com/embed/..."
            data-stream-index="${index}"
          />
        </div>
        <button class="admin-remove-btn" data-stream-index="${index}">×</button>
      </div>
    `;
    listContainer.appendChild(streamItem);

    const removeBtn = streamItem.querySelector(".admin-remove-btn");
    removeBtn.addEventListener("click", () => {
      streamItem.remove();
    });
  });
}

async function authenticateAdmin() {
  if (detectDevTools()) {
    const authMessage = document.getElementById("adminAuthMessage");
    authMessage.textContent = "⚠️ DevTools detectadas. Ciérralo por seguridad.";
    authMessage.style.color = "#ff9800";
    return;
  }

  const passwordInput = document.getElementById("adminPasswordInput");
  const confirmInput = document.getElementById("adminPasswordConfirmInput");
  const authHint = document.getElementById("adminAuthHint");
  const authMessage = document.getElementById("adminAuthMessage");

  if (isAdminLockedOut()) {
    const remaining = Math.ceil(getAdminLockoutTimeRemaining() / 1000 / 60);
    authMessage.textContent = `Cuenta bloqueada. Intenta de nuevo en ${remaining} minutos.`;
    authMessage.style.color = "#ff6b6b";
    return;
  }

  const password = passwordInput.value;
  const confirm = confirmInput.value;

  if (!password) {
    authMessage.textContent = "Ingresa una contraseña";
    authMessage.style.color = "#ff6b6b";
    return;
  }

  const existingAuth = getAdminAuth();

  if (!existingAuth) {
    if (password !== confirm) {
      authMessage.textContent = "Las contraseñas no coinciden";
      authMessage.style.color = "#ff6b6b";
      passwordInput.value = "";
      confirmInput.value = "";
      return;
    }

    if (password.length < 8) {
      authMessage.textContent = "La contraseña debe tener mínimo 8 caracteres";
      authMessage.style.color = "#ff6b6b";
      return;
    }

    await saveAdminPassword(password);
    authMessage.textContent = "Contraseña guardada correctamente";
    authMessage.style.color = "#51cf66";
  } else {
    const isValid = await verifyPassword(password, existingAuth.hash, existingAuth.salt);

    if (!isValid) {
      const attempts = recordFailedLoginAttempt();
      const remaining = MAX_LOGIN_ATTEMPTS - attempts;

      authMessage.textContent = remaining > 0
        ? `Contraseña incorrecta. ${remaining} intentos restantes.`
        : "Demasiados intentos fallidos. Cuenta bloqueada 15 minutos.";
      authMessage.style.color = "#ff6b6b";
      passwordInput.value = "";
      confirmInput.value = "";
      return;
    }

    clearFailedAttempts();
  }

  passwordInput.value = "";
  confirmInput.value = "";

  setAdminSession();
  showAdminManager();
}

function showAdminAuth() {
  const authSection = document.getElementById("adminAuthSection");
  const managerSection = document.getElementById("adminManagerSection");
  const confirmLabel = document.getElementById("adminPasswordConfirmLabel");
  const confirmInput = document.getElementById("adminPasswordConfirmInput");
  const authHint = document.getElementById("adminAuthHint");

  const existingAuth = getAdminAuth();

  if (!existingAuth) {
    authHint.textContent = "Primera vez: establece tu contraseña";
    confirmLabel.classList.add("show-confirm");
    confirmInput.classList.add("show-confirm");
  } else {
    authHint.textContent = "Ingresa tu contraseña";
    confirmLabel.classList.remove("show-confirm");
    confirmInput.classList.remove("show-confirm");
  }

  authSection.classList.remove("admin-hidden");
  managerSection.classList.add("admin-hidden");
  document.getElementById("adminPasswordInput").focus();
}

function showAdminManager() {
  const authSection = document.getElementById("adminAuthSection");
  const managerSection = document.getElementById("adminManagerSection");

  authSection.classList.add("admin-hidden");
  managerSection.classList.remove("admin-hidden");

  populateConfigSelect();
  renderStreamsList();
}

function populateConfigSelect() {
  const configSelect = document.getElementById("adminConfigSelect");
  configSelect.innerHTML = "";

  Object.keys(cameraConfigs).forEach(configKey => {
    const option = document.createElement("option");
    option.value = configKey;
    option.textContent = configKey === "config1" ? "Starbase" : configKey;
    configSelect.appendChild(option);
  });

  configSelect.value = "config1";
}

function saveStreamChanges() {
  if (!validateSessionIntegrity()) {
    alert("Sesión expirada. Por favor ingresa nuevamente.");
    logoutAdmin();
    return;
  }

  const nameInputs = document.querySelectorAll(".admin-stream-name");
  const urlInputs = document.querySelectorAll(".admin-stream-input");
  const newStreams = [];

  nameInputs.forEach((nameInput, idx) => {
    const name = nameInput.value.trim();
    const url = urlInputs[idx].value.trim();

    if (url) {
      newStreams.push({
        name: name || "Sin nombre",
        url: url,
        status: "loading"
      });
    }
  });

  const config = loadStreamConfig();
  config.config1 = newStreams;
  saveStreamConfig(config);

  const message = document.getElementById("adminManagerMessage");
  message.textContent = "Cambios guardados y videos actualizados";
  message.style.color = "#51cf66";

  setTimeout(() => {
    message.textContent = "";
  }, 3000);

  initCameraConfig("config1");
}

  streamItem.querySelector(".admin-stream-name").focus();
}

function restoreDefaultStreams() {
  if (!validateSessionIntegrity()) {
    alert("Sesión expirada. Por favor ingresa nuevamente.");
    logoutAdmin();
    return;
  }

  if (confirm("¿Estás seguro? Esto eliminará todos tus cambios personalizados")) {
    localStorage.removeItem(STREAM_CONFIG_KEY);
    cameraConfigs = {
      config1: DEFAULT_CAMERAS.map(cam => ({ ...cam, status: "loading" }))
    };

    const message = document.getElementById("adminManagerMessage");
    message.textContent = "Configuración restaurada a valores por defecto";
    message.style.color = "#51cf66";

    setTimeout(() => {
      message.textContent = "";
    }, 3000);

    renderStreamsList();
    initCameraConfig("config1");
  }
}

function logoutAdmin() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  document.getElementById("adminPasswordInput").value = "";
  document.getElementById("adminPasswordConfirmInput").value = "";
  document.getElementById("adminAuthMessage").textContent = "";
  document.getElementById("adminManagerMessage").textContent = "";
  showAdminAuth();
  clearFailedAttempts();
}

function initAdminPanel() {
  const infoBtn = document.querySelector(".info-btn");
  const infoModal = document.getElementById("infoModal");
  const infoCloseBtn = document.getElementById("infoCloseBtn");
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  const adminUnlockBtn = document.getElementById("adminUnlockBtn");
  const adminSaveBtn = document.getElementById("adminSaveBtn");
  const adminResetBtn = document.getElementById("adminResetBtn");
  const adminLogoutBtn = document.getElementById("adminLogoutBtn");
  const passwordInput = document.getElementById("adminPasswordInput");
  const confirmInput = document.getElementById("adminPasswordConfirmInput");

  // Manejo del modal
  infoBtn.addEventListener("click", () => {
    infoModal.style.display = "flex";
    if (isAdminLoggedIn()) {
      switchTab("admin");
      showAdminManager();
    } else {
      switchTab("credits");
      showAdminAuth();
    }
  });

  infoCloseBtn.addEventListener("click", () => {
    infoModal.style.display = "none";
  });

  window.addEventListener("click", (event) => {
    if (event.target === infoModal) {
      infoModal.style.display = "none";
    }
  });

  // Manejo de pestañas
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabName = btn.getAttribute("data-tab");
      switchTab(tabName);

      if (tabName === "admin") {
        if (isAdminLoggedIn()) {
          showAdminManager();
        } else {
          showAdminAuth();
        }
      }
    });
  });

  function switchTab(tabName) {
    tabBtns.forEach(btn => btn.classList.remove("active"));
    tabContents.forEach(content => content.classList.remove("active"));

    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");
    document.getElementById(tabName).classList.add("active");
  }

  // Manejo del admin panel
  adminUnlockBtn.addEventListener("click", authenticateAdmin);

  passwordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") authenticateAdmin();
  });

  confirmInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") authenticateAdmin();
  });

  adminSaveBtn.addEventListener("click", saveStreamChanges);
  adminResetBtn.addEventListener("click", restoreDefaultStreams);
  adminLogoutBtn.addEventListener("click", logoutAdmin);
}

document.addEventListener("DOMContentLoaded", function () {
  isDomReady = true;

  loadCustomConfig();
  startSessionMonitoring();
  initAdminPanel();
  initializeAppWhenReady();
});

window.addEventListener("beforeunload", () => {
  destroyAllPlayers();
});