/* ============================================================
   Hôtel Belle Étoile — Frontend
   UE 6.3.2 PWA · Activité 3 · Mikail Lekesiz
   Cache + Notifications + Background Sync + Install prompt
   ============================================================ */

(function () {
    'use strict';

    /* ============================================================
       Service Worker registration
       ============================================================ */
    let swRegistration = null;
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                swRegistration = await navigator.serviceWorker.register('sw.js');
                console.log('[SW] enregistré · scope:', swRegistration.scope);
            } catch (err) {
                console.warn('[SW] échec:', err);
            }
        });
    }

    /* ============================================================
       Install PWA (beforeinstallprompt)
       ============================================================ */
    let deferredInstallPrompt = null;
    const installBtn = document.getElementById('install-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        if (installBtn) installBtn.hidden = false;
    });
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredInstallPrompt) return;
            deferredInstallPrompt.prompt();
            const { outcome } = await deferredInstallPrompt.userChoice;
            console.log('[Install]', outcome);
            deferredInstallPrompt = null;
            installBtn.hidden = true;
        });
    }
    window.addEventListener('appinstalled', () => {
        if (installBtn) installBtn.hidden = true;
    });

    /* ============================================================
       Online / Offline indicator
       ============================================================ */
    const statusBanner = document.getElementById('status-banner');
    function updateStatus() {
        if (!statusBanner) return;
        if (navigator.onLine) {
            statusBanner.textContent = 'En ligne';
            statusBanner.className = 'status-banner online';
            statusBanner.hidden = true;
        } else {
            statusBanner.textContent = '⚠ Hors ligne — vos réservations seront envoyées dès le retour de la connexion.';
            statusBanner.className = 'status-banner offline';
            statusBanner.hidden = false;
        }
    }
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();

    /* ============================================================
       Notifications
       ============================================================ */
    const notifBtn = document.getElementById('notif-btn');

    function updateNotifBtn() {
        if (!notifBtn || !('Notification' in window)) {
            if (notifBtn) notifBtn.hidden = true;
            return;
        }
        const p = Notification.permission;
        if (p === 'granted') {
            notifBtn.textContent = '🔔 Notifications activées';
            notifBtn.disabled = true;
        } else if (p === 'denied') {
            notifBtn.textContent = '🔕 Notifications bloquées';
            notifBtn.disabled = true;
        } else {
            notifBtn.textContent = '🔔 Activer les notifications';
            notifBtn.disabled = false;
        }
    }
    if (notifBtn) {
        notifBtn.addEventListener('click', async () => {
            if (!('Notification' in window)) return;
            await Notification.requestPermission();
            updateNotifBtn();
        });
        updateNotifBtn();
    }

    async function showLocalNotification(title, body, data = {}) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        try {
            if (swRegistration && swRegistration.showNotification) {
                await swRegistration.showNotification(title, {
                    body,
                    icon: 'icons/icon-192.png',
                    badge: 'icons/icon-192.png',
                    tag: data.tag || 'reservation',
                    data
                });
            } else {
                new Notification(title, { body, icon: 'icons/icon-192.png' });
            }
        } catch (err) {
            console.warn('[Notif] échec:', err);
        }
    }

    /* ============================================================
       IndexedDB queue (pour Background Sync)
       ============================================================ */
    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('belle-etoile-queue', 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('queue')) {
                    db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function queueReservation(payload) {
        const db = await openDB();
        await new Promise((resolve, reject) => {
            const tx = db.transaction('queue', 'readwrite');
            tx.objectStore('queue').add({ payload, createdAt: Date.now() });
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });

        // Demande au SW de planifier un sync
        if ('SyncManager' in window && swRegistration) {
            try {
                await swRegistration.sync.register('sync-reservations');
                console.log('[Sync] enregistré');
            } catch (err) {
                console.warn('[Sync] non disponible:', err);
            }
        }
    }

    /* ============================================================
       DOM references
       ============================================================ */
    const form = document.getElementById('reservation-form');
    const arrivee = document.getElementById('arrivee');
    const depart = document.getElementById('depart');
    const errDates = document.getElementById('err-dates');
    const errNom = document.getElementById('err-nom');
    const submitBtn = document.getElementById('submit-btn');
    const confirmation = document.getElementById('confirmation');
    const confirmText = document.getElementById('confirm-text');
    const codeValue = document.getElementById('code-value');
    const newReservationBtn = document.getElementById('new-reservation');

    const consulterForm = document.getElementById('consulter-form');
    const codeInput = document.getElementById('code-input');
    const consulterBtn = document.getElementById('consulter-btn');
    const errCode = document.getElementById('err-code');
    const reservationDetails = document.getElementById('reservation-details');

    if (!form) return;

    /* ============================================================
       Date defaults
       ============================================================ */
    const today = new Date();
    const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
    const fmt = (d) => d.toISOString().split('T')[0];
    const todayStr = fmt(today);

    arrivee.min = todayStr; arrivee.value = todayStr;
    depart.min = fmt(tomorrow); depart.value = fmt(tomorrow);
    arrivee.addEventListener('change', () => {
        if (arrivee.value) {
            const next = new Date(arrivee.value);
            next.setDate(next.getDate() + 1);
            depart.min = fmt(next);
            if (depart.value && depart.value <= arrivee.value) depart.value = fmt(next);
        }
    });

    /* ============================================================
       Helpers
       ============================================================ */
    function formatFr(isoStr) {
        if (!isoStr) return '';
        const [y, m, d] = isoStr.split('-');
        return `${d}/${m}/${y}`;
    }
    function formatDateTimeFr(isoStr) {
        if (!isoStr) return '';
        const d = new Date(isoStr.replace(' ', 'T'));
        if (isNaN(d)) return isoStr;
        return d.toLocaleString('fr-FR');
    }
    const optionLabels = {
        aucune: 'Sans option',
        repas: 'Repas compris',
        vehicule: 'Location véhicule incluse'
    };

    /* ============================================================
       Submit reservation
       ============================================================ */
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errNom.textContent = '';
        errDates.textContent = '';

        const data = {
            nom: form.nom.value.trim(),
            adultes: parseInt(form.adultes.value, 10) || 0,
            enfants: parseInt(form.enfants.value, 10) || 0,
            arrivee: form.arrivee.value,
            depart: form.depart.value,
            option: form.option.value
        };

        let ok = true;
        if (data.nom.length < 2) {
            errNom.textContent = 'Veuillez saisir votre nom complet (2 caractères minimum).';
            ok = false;
        }
        if (!data.arrivee || !data.depart) {
            errDates.textContent = 'Veuillez choisir vos dates.';
            ok = false;
        } else if (data.depart <= data.arrivee) {
            errDates.textContent = 'La date de départ doit être postérieure à la date d\'arrivée.';
            ok = false;
        }
        if (data.adultes < 1) ok = false;
        if (!ok) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Enregistrement…';

        // Si hors ligne → mise en file + Background Sync
        if (!navigator.onLine) {
            try {
                await queueReservation(data);
                showOfflineConfirmation(data);
                showLocalNotification(
                    'Réservation enregistrée hors ligne',
                    `Elle sera envoyée dès le retour de la connexion.`,
                    { tag: 'queued' }
                );
            } catch (err) {
                errDates.textContent = 'Impossible d\'enregistrer hors ligne.';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Soumettre la réservation';
            }
            return;
        }

        // Sinon : envoi normal via API
        try {
            const response = await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await response.json();

            if (!json.success) {
                errDates.textContent = json.error || 'Une erreur est survenue.';
                return;
            }

            showConfirmation(data, json.code);
            showLocalNotification(
                'Réservation confirmée ✓',
                `Votre code : ${json.code}`,
                { tag: `reservation-${json.code}`, code: json.code }
            );
        } catch (err) {
            // Réseau échoué malgré navigator.onLine → file d'attente
            try {
                await queueReservation(data);
                showOfflineConfirmation(data);
            } catch (e2) {
                errDates.textContent = 'Impossible de joindre le serveur.';
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Soumettre la réservation';
        }
    });

    function showConfirmation(data, code) {
        const arr = new Date(data.arrivee);
        const dep = new Date(data.depart);
        const nights = Math.max(1, Math.round((dep - arr) / 86400000));
        const guestsText = data.enfants > 0
            ? `${data.adultes} adulte(s) et ${data.enfants} enfant(s)`
            : `${data.adultes} adulte(s)`;

        confirmText.textContent =
            `Bonjour ${data.nom}, votre réservation pour ${guestsText} ` +
            `du ${formatFr(data.arrivee)} au ${formatFr(data.depart)} ` +
            `(${nights} nuit${nights > 1 ? 's' : ''}) avec l'option « ${optionLabels[data.option]} » ` +
            `a bien été enregistrée.`;
        codeValue.textContent = code;

        form.hidden = true;
        confirmation.hidden = false;
        confirmation.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function showOfflineConfirmation(data) {
        confirmText.textContent =
            `Bonjour ${data.nom}, vous êtes hors ligne. ` +
            `Votre réservation est mise en file d'attente et sera envoyée automatiquement ` +
            `dès le retour de la connexion (Background Sync).`;
        codeValue.textContent = '⏳ EN ATTENTE';
        form.hidden = true;
        confirmation.hidden = false;
        confirmation.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    newReservationBtn.addEventListener('click', () => {
        form.reset();
        arrivee.value = todayStr;
        depart.value = fmt(tomorrow);
        confirmation.hidden = true;
        form.hidden = false;
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    /* ============================================================
       Consulter ma réservation
       ============================================================ */
    consulterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errCode.textContent = '';
        reservationDetails.hidden = true;

        const code = codeInput.value.trim().toUpperCase();
        if (!/^[A-Z0-9]{6}$/.test(code)) {
            errCode.textContent = 'Le code doit contenir exactement 6 caractères (lettres/chiffres).';
            return;
        }

        consulterBtn.disabled = true;
        consulterBtn.textContent = 'Recherche…';

        try {
            const response = await fetch(`api.php?code=${encodeURIComponent(code)}`);
            const json = await response.json();
            if (!json.success) {
                errCode.textContent = json.error || 'Réservation introuvable.';
                return;
            }
            const r = json.reservation;
            const guestsText = r.enfants > 0
                ? `${r.adultes} adulte(s) et ${r.enfants} enfant(s)`
                : `${r.adultes} adulte(s)`;

            reservationDetails.innerHTML = `
                <h3>Détails de votre réservation</h3>
                <dl class="details-list">
                    <dt>Code</dt>          <dd><strong>${r.code}</strong></dd>
                    <dt>Nom</dt>           <dd>${escapeHtml(r.nom)}</dd>
                    <dt>Voyageurs</dt>     <dd>${guestsText}</dd>
                    <dt>Arrivée</dt>       <dd>${formatFr(r.date_arrivee)}</dd>
                    <dt>Départ</dt>        <dd>${formatFr(r.date_depart)}</dd>
                    <dt>Option</dt>        <dd>${optionLabels[r.option_choisie] || r.option_choisie}</dd>
                    <dt>Enregistrée le</dt><dd>${formatDateTimeFr(r.created_at)}</dd>
                </dl>
            `;
            reservationDetails.hidden = false;
            reservationDetails.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (err) {
            errCode.textContent = 'Impossible de joindre le serveur.';
        } finally {
            consulterBtn.disabled = false;
            consulterBtn.textContent = 'Consulter';
        }
    });

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
})();
