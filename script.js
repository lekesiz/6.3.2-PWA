/* ============================================================
   Hôtel Belle Étoile — Form logic
   UE 6.3.2 PWA · Activité 1 · Mikail Lekesiz
   ============================================================ */

(function () {
    'use strict';

    const form = document.getElementById('reservation-form');
    const arrivee = document.getElementById('arrivee');
    const depart = document.getElementById('depart');
    const errDates = document.getElementById('err-dates');
    const errNom = document.getElementById('err-nom');
    const confirmation = document.getElementById('confirmation');
    const confirmText = document.getElementById('confirm-text');
    const newReservationBtn = document.getElementById('new-reservation');

    if (!form) return;

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const fmt = (d) => d.toISOString().split('T')[0];
    const todayStr = fmt(today);

    arrivee.min = todayStr;
    arrivee.value = todayStr;
    depart.min = fmt(tomorrow);
    depart.value = fmt(tomorrow);

    arrivee.addEventListener('change', () => {
        if (arrivee.value) {
            const next = new Date(arrivee.value);
            next.setDate(next.getDate() + 1);
            depart.min = fmt(next);
            if (depart.value && depart.value <= arrivee.value) {
                depart.value = fmt(next);
            }
        }
    });

    form.addEventListener('submit', (e) => {
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

        if (data.adultes < 1) {
            ok = false;
        }

        if (!ok) return;

        const arr = new Date(data.arrivee);
        const dep = new Date(data.depart);
        const nights = Math.max(1, Math.round((dep - arr) / 86400000));

        const optionLabels = {
            aucune: 'Sans option',
            repas: 'Repas compris',
            vehicule: 'Location véhicule incluse'
        };

        const guestsText = data.enfants > 0
            ? `${data.adultes} adulte(s) et ${data.enfants} enfant(s)`
            : `${data.adultes} adulte(s)`;

        const message = `Bonjour ${data.nom}, votre réservation pour ${guestsText} du ${formatFr(data.arrivee)} au ${formatFr(data.depart)} (${nights} nuit${nights > 1 ? 's' : ''}) avec l'option « ${optionLabels[data.option]} » a bien été enregistrée. Vous recevrez un email de confirmation sous peu.`;

        confirmText.textContent = message;
        form.hidden = true;
        confirmation.hidden = false;
        confirmation.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    newReservationBtn.addEventListener('click', () => {
        form.reset();
        arrivee.value = todayStr;
        depart.value = fmt(tomorrow);
        confirmation.hidden = true;
        form.hidden = false;
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    function formatFr(isoStr) {
        if (!isoStr) return '';
        const [y, m, d] = isoStr.split('-');
        return `${d}/${m}/${y}`;
    }
})();
