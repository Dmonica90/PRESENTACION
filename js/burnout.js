/* ============================================================
   BURNOUT · Helpers específicos del curso
   Se carga DESPUÉS de script.js. Reutiliza funciones del motor:
   showPopupFeedback(), playVideo(), updateNavigation().
   ============================================================ */

/**
 * Abre un popup con el contenido HTML almacenado en un contenedor oculto
 * y marca el botón (tile) como "visto" para el desbloqueo del slide.
 * @param {HTMLElement} btn        - El botón/tile pulsado.
 * @param {string} contentId       - id del <div class="bn-popup-src"> con el HTML.
 * @param {string} title           - Título del popup.
 * @param {boolean} wide           - true para popup ancho (tablas).
 */
function bnOpenInfo(btn, contentId, title, wide) {
    const src = document.getElementById(contentId);
    const html = src ? src.innerHTML : '';

    if (typeof showPopupFeedback === 'function') {
        showPopupFeedback(title || '', html, 'info');
    }

    // Ancho especial para tablas
    const box = document.getElementById('feedback-popup-box');
    if (box) box.classList.toggle('is-wide', !!wide);

    // Reemplazar el ícono emoji del popup por el mismo del botón
    bnSetPopupIcon(btn);

    bnMarkViewed(btn);
}

/**
 * Despliega el contenido de "Ver ejemplo" en línea, debajo del propio botón
 * (sin popup), y, tras un breve instante, revela también el bloque de
 * reflexión/comentario asociado, si se indicó uno.
 * @param {HTMLElement} btn        - El botón "Ver ejemplo" pulsado.
 * @param {string} exampleId       - id del bloque de ejemplo a desplegar.
 * @param {string} [reflectionId]  - id del bloque de reflexión a revelar después.
 */
function bnToggleExample(btn, exampleId, reflectionId) {
    const example = document.getElementById(exampleId);
    if (example && example.classList.contains('is-collapsed')) {
        example.classList.remove('is-collapsed');
        example.classList.add('is-expanded');
    }

    if (reflectionId) {
        const reflection = document.getElementById(reflectionId);
        if (reflection && reflection.classList.contains('is-collapsed')) {
            setTimeout(() => {
                reflection.classList.remove('is-collapsed');
                reflection.classList.add('is-expanded');
                reflection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 400);
        }
    }

    bnMarkViewed(btn);
}

/**
 * Coloca en el popup el mismo ícono (número o SVG) y color del botón/tile
 * que lo abrió, en vez del emoji genérico del motor.
 */
function bnSetPopupIcon(btn) {
    const cont = document.getElementById('feedback-icon-container');
    if (!cont || !btn) return;
    const badge = btn.querySelector('.bn-tile-badge');
    if (!badge) return;
    const color = btn.getAttribute('data-color') || 'naranja';
    cont.innerHTML = '<span class="bn-popup-icon" data-color="' + color + '">' + badge.innerHTML + '</span>';
}

/**
 * Reproduce un video en el overlay del motor y marca el botón como visto.
 */
function bnOpenVideo(btn, url, slideId) {
    if (typeof playVideo === 'function') {
        playVideo(url, slideId || (btn.closest('.slide') ? btn.closest('.slide').id : ''));
    }
    bnMarkViewed(btn);
}

/**
 * Marca un botón como "visto", detiene el pulso y revalida el gate del slide.
 */
function bnMarkViewed(btn) {
    if (btn) {
        btn.classList.add('viewed');
        btn.classList.remove('js-init-pulse', 'pulse-attention');
    }
    if (typeof updateNavigation === 'function') updateNavigation();
}

/**
 * Display shared content panel for button group.
 * Shows content for clicked button, hides others, marks as viewed.
 * @param {HTMLElement} btn - The .bn-expandable button clicked
 * @param {string} panelId - The ID of the shared content panel
 */
function bnShowPanel(btn, panelId) {
    if (!btn || !panelId) return;

    const panel = document.getElementById(panelId);
    if (!panel) return;

    // Get all buttons in the same group (supports both .bn-button-group and .bn-tab-group)
    const group = btn.closest('.bn-button-group') || btn.closest('.bn-tab-group');
    if (!group) return;

    // Get buttons - support both .bn-expandable and .bn-tab classes
    const buttons = group.querySelectorAll('.bn-expandable, .bn-tab');

    // Remove active class from all buttons
    buttons.forEach(b => b.classList.remove('active'));

    // Add active class to clicked button
    btn.classList.add('active');

    // Hide all content divs in the panel
    const allContent = panel.querySelectorAll('.bn-panel-content');
    allContent.forEach(content => {
        content.style.display = 'none';
    });

    // Show the clicked button's content
    const contentIndex = Array.from(buttons).indexOf(btn);
    const contentDivs = panel.querySelectorAll('.bn-panel-content');
    if (contentDivs[contentIndex]) {
        contentDivs[contentIndex].style.display = 'block';
    }

    // Mark as viewed for gate system
    bnMarkViewed(btn);
}

/**
 * Close all expandable sections on a slide (helper for navigation)
 * @param {HTMLElement} slideEl - The slide element
 */
function bnCollapseAllExpandables(slideEl) {
    if (!slideEl) return;
    const expandables = slideEl.querySelectorAll('.bn-expandable-content.is-expanded');
    expandables.forEach(content => {
        content.classList.remove('is-expanded');
        content.classList.add('is-collapsed');
    });
}

/**
 * Toggle nested expandable content
 * @param {HTMLElement} btn - The button clicked
 */
function bnToggleNested(btn) {
    if (!btn) return;

    // Find immediate next sibling (the content)
    const content = btn.nextElementSibling;
    if (!content) return;

    // Toggle visibility
    if (content.style.display === 'none') {
        content.style.display = 'block';
        btn.classList.add('active');
    } else {
        content.style.display = 'none';
        btn.classList.remove('active');
    }

    // Mark as viewed only for parent buttons
    if (btn.classList.contains('bn-expandable')) {
        bnMarkViewed(btn);
    }
}

/**
 * Toggle accordion item. Closes all others in the same accordion.
 * @param {HTMLElement} btn - The .bn-accordion-header button clicked
 * @param {number} itemId - The accordion item index
 */
function bnToggleAccordion(btn, itemId) {
    if (!btn) return;

    const item = btn.closest('.bn-accordion-item');
    const accordion = btn.closest('.bn-accordion');
    if (!item || !accordion) return;

    const body = item.querySelector('.bn-accordion-body');
    if (!body) return;

    const isOpen = item.classList.contains('is-open');

    const allItems = accordion.querySelectorAll('.bn-accordion-item');
    allItems.forEach(sibling => {
        const siblingBody = sibling.querySelector('.bn-accordion-body');
        if (siblingBody) {
            siblingBody.classList.remove('is-expanded');
            siblingBody.classList.add('is-collapsed');
            sibling.classList.remove('is-open');
        }
    });

    if (!isOpen) {
        item.classList.add('is-open');
        body.classList.remove('is-collapsed');
        body.classList.add('is-expanded');

        setTimeout(() => {
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }

    bnMarkViewed(btn);
}

/**
 * Gate genérico: devuelve true si el slide activo permite avanzar.
 * Un slide con [data-gate="buttons"] se desbloquea cuando todos sus
 * elementos [data-gate-btn] tienen la clase "viewed".
 * Se invoca desde updateNavigation() del motor.
 */
function bnSlideAllowsNext(slideEl) {
    if (!slideEl) return true;
    const gate = slideEl.getAttribute('data-gate');
    if (gate === 'buttons') {
        const btns = slideEl.querySelectorAll('[data-gate-btn]');
        if (btns.length === 0) return true;
        return Array.from(btns).every(b => b.classList.contains('viewed'));
    }
    if (gate === 'video') {
        const msg = slideEl.querySelector('.video-finished-message');
        return !!(msg && !msg.classList.contains('hidden-message'));
    }
    // Hub de temas: se desbloquea cuando todos los .bn-tema están vistos.
    if (gate === 'temas') {
        const temas = slideEl.querySelectorAll('.bn-tema');
        if (temas.length === 0) return true;
        return Array.from(temas).every(t => t.classList.contains('viewed'));
    }
    // Interactivo embebido (iframe): se desbloquea cuando ese iframe
    // reporta su propio "terminado" (bn-test-done / bn-exercise-done).
    if (gate === 'embed') {
        return slideEl.dataset.bnEmbedDone === 'true';
    }
    // Evaluación final: se desbloquea únicamente al llegar a la pantalla
    // de resultados (aprobado o reprobado), nunca antes.
    if (gate === 'exam-final') {
        return !!(window.bnFinalExamResultsShown === true);
    }
    return true;
}

/**
 * Marca como "visto" el tema del hub correspondiente a un subtema (spoke)
 * que se acaba de terminar. El spoke declara data-tema (id) y
 * data-spoke-hub (índice del slide hub).
 */
function bnMarkTema(spokeEl) {
    if (!spokeEl) return;
    const temaId = spokeEl.getAttribute('data-tema');
    const hubIdx = spokeEl.getAttribute('data-spoke-hub');
    if (temaId === null || hubIdx === null) return;
    // Sólo marcar si el subtema quedó completo (su propio gate está satisfecho).
    if (typeof bnSlideAllowsNext === 'function' && !bnSlideAllowsNext(spokeEl)) return;
    const hub = (typeof slides !== 'undefined') ? slides[parseInt(hubIdx, 10)] : null;
    if (!hub) return;
    const btn = hub.querySelector('.bn-tema[data-tema="' + temaId + '"]');
    if (btn) btn.classList.add('viewed');
}

/* ============================================================
   Interactivos embebidos (iframe) — auto-alto y completado
   ============================================================ */

/* Alto máximo que aceptamos de un interactivo embebido. Ningún test del
   curso llega a tanto; por encima de esto es un bucle de realimentación. */
const BN_MAX_EMBED_HEIGHT = 6000;

window.addEventListener('message', function (e) {
    const d = e.data || {};

    // Localiza el iframe .bn-embed que envió este mensaje (se usa tanto
    // para el auto-alto como para saber qué slide desbloquear).
    let sourceIframe = null;
    const iframes = document.querySelectorAll('iframe[class*="bn-embed"]');
    for (let iframe of iframes) {
        if (iframe.contentWindow === e.source) {
            sourceIframe = iframe;
            break;
        }
    }

    // Ajuste automático de alto del iframe del test
    if (d.type === 'bn-test-height' && sourceIframe) {
        if (d.height && typeof d.height === 'number' && d.height > 0) {
            /* Tope de seguridad: si el documento embebido usa alturas de
               viewport (100vh, min-h-screen) se realimenta con el alto que
               le acabamos de fijar y crece sin parar hasta bloquear el
               slide. Recortamos a un máximo razonable y evitamos reescribir
               por diferencias mínimas (que también realimentan). */
            const h = Math.min(Math.round(d.height), BN_MAX_EMBED_HEIGHT);
            const actual = parseFloat(sourceIframe.style.height) || 0;
            if (Math.abs(h + 8 - actual) > 4) {
                sourceIframe.style.height = (h + 8) + 'px';
            }
        }
    }

    // El test terminó: reportar a SCORM / registrar puntaje
    if (d.type === 'bn-test-done') {
        try {
            if (typeof scorm !== 'undefined') {
                scorm.set('cmi.core.lesson_status', 'completed');
                scorm.save();
            }
        } catch (err) { }
        console.log('Test Burnout completado. Puntaje:', d.score, '/', d.max, '·', d.tier);
        bnMarkEmbedDone(sourceIframe);
    }

    // Ejercicio/caso interactivo completado
    if (d.type === 'bn-exercise-done') {
        bnMarkEmbedDone(sourceIframe);
    }
});

/**
 * Marca como "terminado" el slide que contiene un iframe embebido
 * (test o caso interactivo) y revalida el gate para desbloquear Avanzar.
 */
function bnMarkEmbedDone(iframe) {
    const slideEl = iframe ? iframe.closest('.slide') : null;
    if (slideEl) slideEl.dataset.bnEmbedDone = 'true';
    if (typeof updateNavigation === 'function') updateNavigation();
}
