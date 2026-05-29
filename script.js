/* ============================================================
   Hôtel Belle Étoile — Form logic + PWA registration
   UE 6.3.2 PWA · Activité 2 · Mikail Lekesiz
   ============================================================ */

(function () {
    'use strict';

    /* ============ Service Worker registration ============ */
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then((reg) => console.log('[SW] enregistré · scope:', reg.scope))
                .catch((err) => console.warn('[SW] échec d\'enregistrement:', err));
        });
    }

    /* ============ DOM references ============ */
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

    /* ============ Date defaults ============ */
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

    /* ============ Helpers ============ */
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

    /* ============ Submit : create reservation via API ============ */
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

        // Validation client (rapide, le serveur revalide)
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

        try {
            const response = await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await response.json();

            if (!json.success) {
                errDates.textContent = json.error || 'Une erreur est survenue.';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Soumettre la réservation';
                return;
            }

            // Calcul nuits pour affichage
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
            codeValue.textContent = json.code;

            form.hidden = true;
            confirmation.hidden = false;
            confirmation.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (err) {
            errDates.textContent = 'Impossible de joindre le serveur. Vérifiez votre connexion.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Soumettre la réservation';
        }
    });

    /* ============ New reservation ============ */
    newReservationBtn.addEventListener('click', () => {
        form.reset();
        arrivee.value = todayStr;
        depart.value = fmt(tomorrow);
        confirmation.hidden = true;
        form.hidden = false;
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    /* ============ Consulter ma réservation ============ */
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
