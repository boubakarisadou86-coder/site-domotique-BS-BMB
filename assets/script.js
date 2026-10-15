'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const menu = document.querySelector('.menu');
  if (menu) menu.addEventListener('click', () => document.querySelector('nav')?.classList.toggle('open'));
  const tabData = {
    mobilite: '<h3>Mobilité intelligente</h3><p>Feux adaptatifs, suivi des bus et informations sur les trajets.</p>',
    energie: '<h3>Énergie et éclairage</h3><p>Lampadaires LED, capteurs et suivi des consommations.</p>',
    dechets: '<h3>Déchets et assainissement</h3><p>Capteurs de remplissage et optimisation des tournées.</p>',
    eau: '<h3>Eau et inondations</h3><p>Capteurs de niveau d’eau et alertes précoces.</p>'
  };
  document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('on'));
    button.classList.add('on');
    if ($('tab-content')) $('tab-content').innerHTML = tabData[button.dataset.tab] || '';
  }));
  let lamp = false, alarm = false, audio = null, alarmTimer = null;
  function pulse() {
    if (!alarm || !audio) return;
    try {
      const osc = audio.createOscillator(), gain = audio.createGain(), t = audio.currentTime;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(620, t);
      osc.frequency.linearRampToValueAtTime(980, t + 0.28);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.07, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain); gain.connect(audio.destination);
      osc.start(t); osc.stop(t + 0.36);
    } catch (e) { console.warn('Son non disponible', e); }
  }
  function stopSound() {
    if (alarmTimer) clearInterval(alarmTimer);
    alarmTimer = null;
    if (audio) { audio.close().catch(() => {}); audio = null; }
  }
  function startSound() {
    stopSound();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try {
      audio = new AudioCtx();
      audio.resume().then(pulse).catch(() => {});
      alarmTimer = setInterval(pulse, 650);
    } catch (e) { console.warn('Son non disponible', e); }
  }
  window.sim = function (which) {
    if (which === 'lamp') lamp = !lamp;
    else if (which === 'alarm') { alarm = !alarm; if (alarm) startSound(); else stopSound(); }
    else return;
    if ($('lamp')) $('lamp').textContent = lamp ? 'Allumé' : 'Éteint';
    if ($('alarm')) $('alarm').textContent = alarm ? 'Active — sirène en marche' : 'Inactive';
    if ($('cons')) $('cons').textContent = lamp ? '42 W' : '0 W';
    $('lamp-visual')?.classList.toggle('is-on', lamp);
    $('siren-visual')?.classList.toggle('is-on', alarm);
    $('lamp-button')?.setAttribute('aria-pressed', String(lamp));
    $('alarm-button')?.setAttribute('aria-pressed', String(alarm));
  };
  window.addEventListener('pagehide', stopSound);
  const form = $('contact-form');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nom = form.elements.namedItem('nom')?.value.trim() || '';
    const email = form.elements.namedItem('email')?.value.trim() || '';
    const msg = form.elements.namedItem('message')?.value.trim() || '';
    if (!nom || !email || !msg) return;
    if ($('form-result')) $('form-result').textContent = 'Votre application de messagerie va s’ouvrir.';
    window.location.href = 'mailto:contact@example.org?subject=' + encodeURIComponent('Contact — ' + nom) + '&body=' + encodeURIComponent(msg + '\nDe : ' + nom + ' (' + email + ')');
  });
  if (!$('voice-door')) return;
  function setDoor(open) {
    $('voice-door').classList.toggle('open', open);
    $('door-status').textContent = open ? '🔓 Porte ouverte' : '🔒 Porte fermée';
  }
  function setWindows(open) {
    document.querySelector('.window-frame')?.classList.toggle('open', open);
    $('window-status').textContent = open ? '🟢 Fenêtres ouvertes' : '🔒 Fenêtres fermées';
  }
  function setTv(on) {
    $('tv-screen').classList.toggle('on', on);
    $('tv-off').hidden = on;
    $('tv-welcome').hidden = !on;
    $('tv-status').textContent = on ? '🟢 Télévision allumée' : '⚫ Télévision éteinte';
  }
  $('door-open').addEventListener('click', () => setDoor(true));
  $('door-close').addEventListener('click', () => setDoor(false));
  $('window-open').addEventListener('click', () => setWindows(true));
  $('window-close').addEventListener('click', () => setWindows(false));
  $('tv-on').addEventListener('click', () => setTv(true));
  $('tv-off-button').addEventListener('click', () => setTv(false));
  const feedback = $('voice-feedback'), start = $('mic-start'), stop = $('mic-stop');
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    feedback.textContent = 'Reconnaissance vocale indisponible ici. Essayez Chrome ou Edge sur localhost avec le microphone autorisé. Les boutons manuels fonctionnent.';
    start.disabled = true;
    return;
  }
  const recognition = new Recognition();
  recognition.lang = 'fr-FR';
  recognition.continuous = false;
  recognition.interimResults = false;
  let listening = false;
  function normalize(value) {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  recognition.onresult = (event) => {
    const heard = Array.from(event.results).map(r => r[0].transcript).join(' ');
    const phrase = normalize(heard);
    if ((phrase.includes('sadou') || phrase.includes('sado')) && phrase.includes('ouvre') && phrase.includes('porte')) {
      setDoor(true);
      feedback.textContent = '🎤 « ' + heard + ' » — Porte ouverte !';
    } else if ((phrase.includes('sadou') || phrase.includes('sado')) && (phrase.includes('ferme toi') || phrase.includes('ferme la porte') || phrase.includes('ferme porte'))) {
      setDoor(false);
      feedback.textContent = '🎤 « ' + heard + ' » — Porte fermée !';
    } else {
      feedback.textContent = 'Entendu : « ' + heard + ' ». Réessayez : SADOU ouvre la porte / SADOU ferme toi.';
    }
  };
  recognition.onerror = (event) => {
    listening = false;
    feedback.textContent = 'Micro : ' + event.error + '. Autorisez le microphone, utilisez localhost et vérifiez votre connexion.';
  };
  recognition.onend = () => {
    listening = false;
    start.disabled = false;
    stop.disabled = true;
  };
  start.addEventListener('click', () => {
    try {
      recognition.start(); listening = true;
      start.disabled = true; stop.disabled = false;
      feedback.textContent = '🎙️ Parlez maintenant : « SADOU ouvre la porte ».';
    } catch (error) { feedback.textContent = 'Impossible de démarrer le micro : ' + error.message; }
  });
  stop.addEventListener('click', () => {
    listening = false; recognition.stop(); start.disabled = false; stop.disabled = true;
    feedback.textContent = 'Microphone arrêté.';
  });
  window.addEventListener('pagehide', () => { if (listening) recognition.abort(); });
});
