// ====== CONFIGURACIÓN DE GOOGLE =======
// IMPORTANTE: Debes reemplazar esto por tu Client ID de Google Cloud Console
// Formato: 'xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com'
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; 
// ======================================

let counter = 0;
let currentUser = null;
let tokenClient;

// Elementos del DOM
const counterValueEl = document.getElementById('counter-value');
const actionBtn = document.getElementById('action-btn');
const btnTextContent = document.getElementById('btn-text-content');
const userInfoEl = document.getElementById('user-info');
const userNameEl = document.getElementById('user-name');
const userAvatarEl = document.getElementById('user-avatar');
const logoutBtn = document.getElementById('logout-btn');

// Inicializar Google Identity Services
function initGoogleAuth() {
    if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
        console.warn("Por favor configura tu GOOGLE_CLIENT_ID en app.js");
        return; // No iniciamos el cliente real para evitar errores
    }

    // Inicializar el cliente de token de OAuth2 (Implict Flow)
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                // El usuario se logeó correctamente, ahora obtenemos su perfil
                fetchUserProfile(tokenResponse.access_token);
            }
        },
    });
}

// Obtener detalles del perfil del usuario usando el Token Access de Google
async function fetchUserProfile(accessToken) {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await response.json();
        
        currentUser = {
            name: data.name || data.given_name || 'Usuario',
            email: data.email,
            picture: data.picture,
            token: accessToken
        };

        updateUI();
        // Una vez logeado de manera exitosa, realizamos la acción central (votar)
        performAction();
        
    } catch (error) {
        console.error("Error obteniendo el perfil del usuario:", error);
        alert("Hubo un error al obtener los datos de la cuenta.");
    }
}

// Acción del Botón Principal
actionBtn.addEventListener('click', () => {
    // ==== LÓGICA DE DEMOSTRACIÓN (Borrar en producción) ====
    if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
        if (!currentUser) {
            alert("⚠️ MODO DEMO:\n\nComo no has configurado tu GOOGLE_CLIENT_ID aún, simularemos que iniciaste sesión con Google para ver cómo funciona el flujo.");
            currentUser = {
                name: "Tuno Demostrador",
                picture: "https://ui-avatars.com/api/?name=Tuno+Demo&background=3b82f6&color=fff&size=128"
            };
            updateUI();
            performAction();
        } else {
            performAction();
        }
        return;
    }
    // =======================================================

    // ==== LÓGICA DE PRODUCCIÓN =======
    if (!currentUser) {
        // Usuario NO está logeado -> Disparar Pop-up de Autenticación de Google
        tokenClient.requestAccessToken();
    } else {
        // Usuario YA está logeado -> Realizar Acción
        performAction();
    }
});

// Realizar la acción (Incrementar contador)
function performAction() {
    counter++;
    counterValueEl.textContent = counter;
    
    // Animación de pulso
    counterValueEl.classList.remove('pulse');
    void counterValueEl.offsetWidth; // Forzar reflow para reiniciar CSS animation
    counterValueEl.classList.add('pulse');
}

// Actualizar Interfaz de Usuario
function updateUI() {
    if (currentUser) {
        // Modo "Logeado"
        userInfoEl.classList.remove('hidden');
        userNameEl.textContent = currentUser.name;
        userAvatarEl.src = currentUser.picture;
        btnTextContent.textContent = "Votar / Incrementar";
    } else {
        // Modo "Invitado"
        userInfoEl.classList.add('hidden');
        btnTextContent.textContent = "Votar (Requiere Login)";
    }
}

// Cerrar sesión
logoutBtn.addEventListener('click', () => {
    if (currentUser && currentUser.token) {
        // Revocar el token en Google si es posible
        google.accounts.oauth2.revoke(currentUser.token, () => {
            console.log('Token de acceso revocado');
        });
    }
    currentUser = null;
    updateUI();
});

// Iniciar aplicación
window.onload = () => {
    // Esperar a que la librería asíncrona cargue
    setTimeout(() => {
        if (window.google) {
            initGoogleAuth();
        } else {
            console.error("La librería de Google no cargó.");
        }
    }, 500);
    updateUI();
};
