// ===============================================
// 0.0. CONEXIÓN CON SCORM (PIPWERKS - OPEN SOURCE)
// ===============================================

// Referencia global al wrapper de Pipwerks
var scorm = pipwerks.SCORM;
var startTime = new Date();
var globalAudioObject = null;
function initSCORM() {
    // Inicializar conexión con el LMS
    var lmsConnected = scorm.init();

    if (lmsConnected) {
        console.log("Conectado al LMS (Pipwerks).");

        // Obtener estatus actual
        var status = scorm.get("cmi.core.lesson_status");

        // Si nunca ha entrado, marcar como incompleto
        if (status === "not attempted" || status === "unknown") {
            scorm.set("cmi.core.lesson_status", "incomplete");
            scorm.save();
        }
    } else {
        console.warn("No se pudo conectar al LMS (Modo Local).");
    }
}

function reportScoreToLMS(score, passed) {
    // Verificar si hay conexión activa (o si estamos en modo local para pruebas)
    var isActive = scorm.connection.isActive;

    if (isActive) {
        // 1. Enviar puntaje (0-100) SCORM 1.2
        scorm.set("cmi.core.score.raw", score);
        scorm.set("cmi.core.score.min", "0");
        scorm.set("cmi.core.score.max", "100");

        // 2. Determinar estatus
        var status = passed ? "passed" : "failed";
        if (passed) {
            scorm.set("cmi.core.lesson_status", "completed");
            scorm.set("cmi.core.exit", ""); // Indica salida normal
        }
        // 3. Enviar estatus
        scorm.set("cmi.core.lesson_status", status);

        // 4. Guardar datos
        scorm.save();

        console.log(`Datos enviados al LMS: Score ${score}, Status ${status}`);
    } else {
        console.log(`[Simulación Local] Score: ${score}, Status: ${passed ? 'Passed' : 'Failed'}`);
    }
}

// Función auxiliar para formatear tiempo a SCORM 1.2 (HH:MM:SS)
function formatTimeSCORM(ms) {
    var totalSeconds = Math.floor(ms / 1000);
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;

    // Asegurar 2 dígitos (01, 05, 10)
    if (hours < 10) hours = "0" + hours;
    if (minutes < 10) minutes = "0" + minutes;
    if (seconds < 10) seconds = "0" + seconds;

    return hours + ":" + minutes + ":" + seconds;
}

function finishSCORM() {
    // 1. Calcular tiempo de sesión
    var endTime = new Date();
    var totalTime = endTime - startTime; // Diferencia en milisegundos
    var scormTime = formatTimeSCORM(totalTime);

    // 2. Enviar tiempo al LMS
    scorm.set("cmi.core.session_time", scormTime);

    // 3. Guardar y cerrar
    scorm.save();
    scorm.quit();
}

// Función de salida (Adaptada para Pipwerks)
function exitCourse() {
    // 1. Cerrar conexión SCORM
    finishSCORM();

    // 2. Intentar cerrar la ventana del navegador
    // (Pipwerks no tiene 'ConcedeControl', así que usamos métodos estándar)
    setTimeout(() => {
        window.close();
        top.window.close();
        parent.window.close();

        // Mensaje por si el navegador bloquea el cierre
        if (!window.closed) {
            alert("Los datos se han guardado correctamente. Puedes cerrar esta pestaña manualmente.");
        }
    }, 500);
}


// ===============================================
// 0. VARIABLES GLOBALES Y ELEMENTOS DEL DOM
// ===============================================
const courseContainer = document.getElementById('curso');
const slides = document.querySelectorAll('.slide');

// Elementos de Navegación
const navBar = document.getElementById('nav-bar');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const finishBtn = document.getElementById('finish-course');
const homeBtn = document.getElementById('homeBtn');
const progressBar = document.getElementById('progress-bar');
const downloadBtn = document.getElementById('download-infografia-btn');
const header = document.querySelector('.slide-header');

// Elementos de Menu Modular
const menuBtn = document.getElementById('menuBtn');
const moduleDropdown = document.getElementById('module-dropdown');
const moduleLinks = document.querySelectorAll('.module-link');

// Elementos de Video/Media
const fullscreenOverlay = document.getElementById('fullscreen-video-overlay');
const introVideo = document.getElementById('intro-video');

// Indicador de Scroll
const scrollIndicator = document.getElementById('scroll-indicator');
let scrollContentObserver = null;

const closeFeedbackBtn = document.getElementById('close-feedback-btn');
const feedbackTitle = document.getElementById('feedback-title');
const feedbackMessage = document.getElementById('feedback-message');
const feedbackPopupOverlay = document.getElementById('feedback-popup-overlay');

let currentSlideIndex = 0;
const totalSlides = slides.length;

// Estado del Quiz
let currentQuestionIndex = 0;
// ⭐⭐ AGREGAR AQUÍ LA VARIABLE ⭐⭐
let finalExamPassed = false;

// ===============================================
// 1. ESTRUCTURA MODULAR, QUIZ Y ESTADO
// ===============================================

// Estructura del curso Burnout (índices 0-based, verificados contra el DOM real).
// slides[] tiene un elemento extra "#slide-nav-guide" entre slide-1 y slide-2,
// y el id "slide-16" NO existe en el HTML. Por eso, para slide-N con N>=17,
// índice_real_en_slides = N-1 (no N). Portadas reales de cada unidad:
//   Unidad 1: slide-4  -> idx 4   | Unidad 2: slide-11 -> idx 11
//   Unidad 3: slide-17 -> idx 16  | Unidad 4: slide-32 -> idx 31
//   Cierre:   slide-41 -> idx 40  | Última slide: slide-44 -> idx 43 (totalSlides-1)
const moduleStructure = {
    'modulo1': { start: 4, end: 11, quizIndex: 10, name: 'Unidad 1: Comprendiendo el Burnout' },
    'modulo2': { start: 11, end: 16, quizIndex: 15, name: 'Unidad 2: Señales y factores de riesgo' },
    'modulo3': { start: 16, end: 31, quizIndex: 30, name: 'Unidad 3: Estrategias de prevención' },
    'modulo4': { start: 31, end: 40, quizIndex: 39, name: 'Unidad 4: Red de apoyo organizacional' },
    'cierre': { start: 40, end: totalSlides, quizIndex: 42, name: 'Cierre y evaluación final' }
};

// Orden de las unidades = orden de las claves de moduleStructure.
const moduleKeysOrder = Object.keys(moduleStructure);

let moduleStatus = {
    'modulo1': { passed: false, unlockIndex: 11 },
    'modulo2': { passed: false, unlockIndex: 16 },
    'modulo3': { passed: false, unlockIndex: 31 },
    'modulo4': { passed: false, unlockIndex: 40 },
    'cierre': { passed: false, unlockIndex: totalSlides }
};

// Índice de slide más profundo alcanzado por navegación legítima (avance
// normal por "Siguiente", o salto del menú a una unidad ya desbloqueada).
// Es la señal de progreso real: determina qué unidades quedan "unlocked"
// en el menú desplegable.
let furthestSlideIndexReached = 0;

const FINAL_PASSING_SCORE = 70;

// En tu archivo script.js, busca "const allQuizDefinitions" y actualízalo así:

const allQuizDefinitions = {
    // --- QUIZ UNIDAD 1 (Slide 13) ---
    'quiz-u1-slide8': {
        mode: 'scored_practice',
        totalQuestions: 5,
        pointsPerQuestion: 20,
        correctAnswerCount: 0,
        questions: {
            'q1': {
                answer: 'b',
                feedback: {
                    'a': 'La retroalimentación no se centra solo en los errores, sino también en el reconocimiento y mejora.',
                    'b': 'La retroalimentación comunica resultados, reconoce logros y define compromisos para mejorar.',
                    'c': 'No busca sancionar, sino orientar.',
                    'd': 'Su objetivo no es comparar, sino desarrollar a cada persona.'
                }
            },
            'q2': {
                answer: 'a',
                feedback: {
                    'a': 'La retroalimentación positiva refuerza las conductas exitosas y fortalece la confianza.',
                    'b': 'Esa descripción corresponde a la retroalimentación correctiva.',
                    'c': 'Un tono negativo pertenece a la retroalimentación destructiva.',
                    'd': 'No se limita a cifras, también considera comportamientos valiosos.'
                }
            },
            'q3': {
                answer: 'c',
                feedback: {
                    'a': 'Este tipo de retroalimentación rompe la confianza.',
                    'b': 'No motiva, al contrario, desanima.',
                    'c': 'Desmotiva, genera resistencia y daña la relación entre líder y colaborador.',
                    'd': 'Solo la retroalimentación constructiva impulsa el aprendizaje.'
                }
            },
            'q4': {
                answer: 'b',
                feedback: {
                    'a': 'La retroalimentación busca colaboración, no competencia.',
                    'b': 'La retroalimentación constante mantiene alineados los objetivos del negocio y mejora la gestión del desempeño.',
                    'c': 'Promueve la comunicación abierta, no la reduce.',
                    'd': 'Reconocer errores es parte esencial del proceso de mejora.'
                }
            },
            'q5': {
                answer: 'b',
                feedback: {
                    'a': 'Centrar la retroalimentación en la persona es destructivo.',
                    'b': 'La retroalimentación correctiva debe enfocarse en hechos, con respeto y buscando mejorar.',
                    'c': 'No se trata de liberar emociones negativas.',
                    'd': 'Puede darse en cualquier momento, no solo una vez al año.'
                }
            }
        }
    },

    // --- QUIZ UNIDAD 2 (Slide 21) ---
    'quiz-u2-slide21': {
        mode: 'scored_practice',
        totalQuestions: 5,
        pointsPerQuestion: 20,
        correctAnswerCount: 0,
        questions: {
            'q1': {
                answer: 'a',
                feedback: {
                    'a': 'Los principios orientan la comunicación para que la retroalimentación tenga un impacto positivo y genere mejora.',
                    'b': 'La retroalimentación no debe basarse en opiniones personales, sino en hechos y comportamientos observables.',
                    'c': 'La rapidez no es el objetivo; lo esencial es la calidad y claridad del mensaje.',
                    'd': 'La retroalimentación efectiva precisamente se centra en los resultados y la conducta profesional.'
                }
            },
            'q2': {
                answer: 'b',
                feedback: {
                    'a': 'La retroalimentación debe darse pronto después del evento; hacerlo meses después reduce su relevancia.',
                    'b': 'Refleja el principio de oportunidad al abordar el hecho de forma inmediata y contextual.',
                    'c': 'Este ejemplo carece de objetividad y no se basa en hechos concretos.',
                    'd': 'Retrasar la conversación contradice el principio de oportunidad.'
                }
            },
            'q3': {
                answer: 'b',
                feedback: {
                    'a': 'Es una afirmación ambigua que no especifica qué fue bueno ni en qué se debe mejorar.',
                    'b': 'Es un ejemplo claro, específico y enfocado en hechos observables.',
                    'c': 'No hay claridad ni evidencia concreta, solo comentarios de terceros.',
                    'd': 'Este mensaje es subjetivo y carece de precisión.'
                }
            },
            'q4': {
                answer: 'b',
                feedback: {
                    'a': 'La retroalimentación debe darse en un entorno privado que fomente la confianza.',
                    'b': 'El respeto se muestra con tono apropiado, escucha activa y empatía.',
                    'c': 'Centrarse solo en los errores puede generar desmotivación y romper la confianza.',
                    'd': 'El reconocimiento equilibrado fortalece la relación laboral y motiva la mejora.'
                }
            },
            'q5': {
                answer: 'b',
                feedback: {
                    'a': 'Enfocarse solo en errores puede generar desmotivación y resistencia al cambio.',
                    'b': 'El equilibrio consiste en combinar reconocimiento con oportunidades de mejora para fomentar apertura y compromiso.',
                    'c': 'El reconocimiento es esencial para reforzar conductas positivas y generar confianza.',
                    'd': 'Una retroalimentación equilibrada siempre debe cerrar con claridad, confianza y motivación.'
                }
            }
        }
    },

    // --- QUIZ UNIDAD 3 (Slide 25) ---
    'quiz-u3-slide25': {
        mode: 'scored_practice',
        totalQuestions: 5,
        pointsPerQuestion: 20,
        correctAnswerCount: 0,
        questions: {
            'q1': {
                answer: 'b',
                feedback: {
                    'a': 'La fase previa no busca opiniones personales, sino preparación objetiva.',
                    'b': 'Esta fase tiene como objetivo preparar una retroalimentación efectiva y profesional.',
                    'c': 'Aunque la empatía es importante, la fase se centra en la planificación, no en las emociones.',
                    'd': 'La retroalimentación debe planearse con anticipación, no improvisarse.'
                }
            },
            'q2': {
                answer: 'c',
                feedback: {
                    'a': 'Una conversación improvisada puede generar confusión o perder credibilidad.',
                    'b': 'La retroalimentación debe centrarse en hechos, no en opiniones personales.',
                    'c': 'Definir un objetivo evita conversaciones vagas y permite enfocar los resultados.',
                    'd': 'La retroalimentación debe ser integral, abordando tanto logros como áreas de mejora.'
                }
            },
            'q3': {
                answer: 'b',
                feedback: {
                    'a': 'Esto debilita la objetividad y puede generar conflictos.',
                    'b': 'La preparación, con datos objetivos, fortalece la retroalimentación y su impacto.',
                    'c': 'No recopilar información reduce la precisión y utilidad del diálogo.',
                    'd': 'La memoria puede ser subjetiva; se deben usar fuentes verificables.'
                }
            },
            'q4': {
                answer: 'c',
                feedback: {
                    'a': 'Esto puede generar ansiedad y falta de comprensión.',
                    'b': 'No dar espacio al diálogo impide la participación y comprensión del colaborador.',
                    'c': 'Solicitar permiso refleja respeto y fomenta una comunicación abierta y colaborativa.',
                    'd': 'La retroalimentación debe ser privada y enfocada en el desarrollo.'
                }
            },
            'q5': {
                answer: 'a',
                feedback: {
                    'a': 'Esta fase busca asegurar que los acuerdos se cumplan y se refuercen con apoyo continuo.',
                    'b': 'Debe registrarse lo acordado para dar trazabilidad y seguimiento.',
                    'c': 'El seguimiento debe ser constante, no solo una vez al año.',
                    'd': 'Sin acuerdos ni seguimiento, la retroalimentación pierde impacto y continuidad.'
                }
            }
        }
    },
    // --- QUIZ UNIDAD 4 (Slide 32) ---
    'quiz-u4-slide32': {
        mode: 'scored_practice',
        totalQuestions: 5,
        pointsPerQuestion: 20,
        correctAnswerCount: 0,
        questions: {
            'q1': {
                answer: 'b',
                feedback: {
                    'a': 'El modelo SBI se centra en hechos observables, no en emociones o percepciones.',
                    'b': 'El modelo SBI busca claridad y objetividad evitando juicios personales.',
                    'c': 'SBI se utiliza para describir conductas específicas, no evaluaciones generales.',
                    'd': 'El seguimiento pertenece a otra fase del proceso, no al modelo SBI.'
                }
            },
            'q2': {
                answer: 'a',
                feedback: {
                    'a': 'La “S” indica la situación concreta que da contexto a la retroalimentación.',
                    'b': 'El modelo no incluye soluciones, se enfoca en describir hechos e impacto.',
                    'c': '“S” no significa supervisión, sino situación.',
                    'd': 'El modelo SBI evita juicios emocionales y se enfoca en hechos.'
                }
            },
            'q3': {
                answer: 'b',
                feedback: {
                    'a': 'Este orden puede confundir el mensaje y disminuir la atención a la mejora.',
                    'b': 'Esta estructura equilibra reconocimiento y orientación hacia la mejora.',
                    'c': 'Esto rompe la empatía y puede generar resistencia.',
                    'd': 'Omitir la mejora elimina el objetivo principal de la técnica.'
                }
            },
            'q4': {
                answer: 'b',
                feedback: {
                    'a': 'Ese tipo de frases son acusatorias y poco empáticas.',
                    'b': 'La asertividad combina claridad, respeto y enfoque en conductas específicas.',
                    'c': 'El lenguaje corporal abierto y el contacto visual son esenciales.',
                    'd': 'La comunicación asertiva es concreta, clara y específica, no extensa.'
                }
            },
            'q5': {
                answer: 'b',
                feedback: {
                    'a': 'Escuchar con atención es una buena práctica, no un error.',
                    'b': 'Fundar la retroalimentación en suposiciones resta objetividad y credibilidad.',
                    'c': 'Esta acción forma parte de una comunicación asertiva y respetuosa.',
                    'd': 'Esta práctica es necesaria para asegurar el seguimiento y la mejora.'
                }
            }
        }
    },

    // --- EVALUACIÓN FINAL (10 REACTIVOS · guion_11_Burnout_interactivo_evaluacion) ---
    // 5 casos x 2 preguntas. 10 puntos por reactivo, 100 maximo, aprobacion en 80.
    // La retro va en 'default' para que salga igual se acierte o no: el guion da
    // una sola retroalimentacion por reactivo, no una por opcion.
    'quiz-final': {
        mode: 'final_exam',
        totalQuestions: 10,
        pointsPerQuestion: 10,
        correctAnswerCount: 0,
        questions: {
            // --- CASO 1 · Arturo, la semana interminable ---
            'fq1': {
                answer: 'b',
                feedback: {
                    'default': 'Arturo presenta señales de cansancio constante, errores recurrentes y pérdida de energía, lo cual coincide con el agotamiento emocional.'
                }
            },
            'fq2': {
                answer: 'c',
                feedback: {
                    'default': 'Hay acciones que ayudan a evitar que el agotamiento avance y mantener la motivación.'
                }
            },

            // --- CASO 2 · Mariela y las reuniones inesperadas ---
            'fq3': {
                answer: 'b',
                feedback: {
                    'default': 'La Matriz de Eisenhower permite clasificar tareas; las reuniones no urgentes ni importantes deben delegarse o reprogramarse.'
                }
            },
            'fq4': {
                answer: 'b',
                feedback: {
                    'default': 'Hay acciones que ayudan a organizar la jornada y a prevenir la multitarea improductiva que incrementa el agotamiento.'
                }
            },

            // --- CASO 3 · Laura ya no disfruta su trabajo ---
            'fq5': {
                answer: 'c',
                feedback: {
                    'default': 'El Burnout se distingue por síntomas crónicos, afectación emocional y deterioro del desempeño, y no solo por cansancio o semanas pesadas.'
                }
            },
            'fq6': {
                answer: 'c',
                feedback: {
                    'default': 'Hay prácticas que permiten regular el sistema nervioso, reducir ansiedad y recuperar claridad mental y así sentirse mejor.'
                }
            },

            // --- CASO 4 · El equipo de contabilidad en modo supervivencia ---
            'fq7': {
                answer: 'c',
                feedback: {
                    'default': 'La carga excesiva sin ajuste de prioridades es un factor de riesgo psicosocial claro según la NOM-035.'
                }
            },
            'fq8': {
                answer: 'd',
                feedback: {
                    'default': 'Las organizaciones saludables promueven límites claros, ajustes de carga y desconexión digital para prevenir agotamiento.'
                }
            },

            // --- CASO 5 · Sofía está al límite ---
            'fq9': {
                answer: 'c',
                feedback: {
                    'default': 'Los cambios físicos, emocionales y sociales son señales clave para solicitar apoyo antes de que el Burnout avance.'
                }
            },
            'fq10': {
                answer: 'c',
                feedback: {
                    'default': 'La comunicación asertiva basada en hecho, impacto y solicitud demuestra profesionalismo y permite soluciones reales.'
                }
            }
        }
    },}

// ===============================================
// 2. LÓGICA DE NAVEGACIÓN Y CONTROL
// ===============================================

function showSlide(index) {
    if (index >= 0 && index < totalSlides) {

        // 1. LIMPIEZA OBLIGATORIA: Borra confeti al intentar cambiar de slide
        limpiarConfeti();

        const previousSlideIndex = currentSlideIndex;
        const previousSlide = slides[previousSlideIndex];
        const newSlide = slides[index];

        const direction = index > currentSlideIndex ? 'next' : 'prev';
        currentSlideIndex = index;

        // Actualiza el punto más profundo alcanzado por navegación legítima
        // y recalcula qué unidades quedan desbloqueadas en el menú.
        if (index > furthestSlideIndexReached) {
            furthestSlideIndexReached = index;
        }
        recomputeModuleUnlocks();

        // ⭐⭐ NUEVO: GUARDAR BOOKMARK EN SCORM (PIPWERKS) ⭐⭐
        if (typeof scorm !== 'undefined') {
            // Guardamos el índice actual (ej: "5")
            scorm.set("cmi.core.lesson_location", index.toString());
            scorm.save();
            console.log("Progreso guardado: Slide " + index);
        }
        // ⭐⭐ FIN NUEVO CÓDIGO ⭐⭐

        if (previousSlide && previousSlideIndex !== currentSlideIndex) {
            previousSlide.classList.add('leaving', `leaving-${direction}`);
            setTimeout(() => {
                previousSlide.classList.remove('active', 'leaving', 'leaving-next', 'leaving-prev');
            }, 600);
        }

        newSlide.classList.add(`entering-${direction}`);

        setTimeout(() => {
            newSlide.classList.remove(`entering-${direction}`);
            newSlide.classList.add('active');
            updateNavigation();
            resetAnimations(newSlide);

            // 1. Resetear el scroll interno del contenedor gris (slide-scroll-content)
            const scrollContent = newSlide.querySelector('.slide-scroll-content');
            if (scrollContent) {
                scrollContent.scrollTop = 0;
            }

            // 2. Forzar el scroll de la ventana al inicio (Para móviles y tablets)
            window.scrollTo(0, 0);
            document.body.scrollTop = 0; // Safari
            document.documentElement.scrollTop = 0; // Chrome, Firefox, IE, Opera

            // --- LÓGICA DE SCROLL ---
            checkScrollability();
            setTimeout(checkScrollability, 350);
            setTimeout(checkScrollability, 1000);

            const images = newSlide.querySelectorAll('img');
            images.forEach(img => {
                if (!img.complete) {
                    img.addEventListener('load', checkScrollability);
                }
            });

            // Reobserva el contenido del slide activo: si un clic revela
            // contenido nuevo más abajo (pestañas, acordeones, "ver más"),
            // se vuelve a evaluar si hay que mostrar el indicador de scroll.
            if (scrollContentObserver) {
                scrollContentObserver.disconnect();
            }
            if (scrollContent) {
                let scrollRecheckTimer = null;
                scrollContentObserver = new MutationObserver(() => {
                    clearTimeout(scrollRecheckTimer);
                    scrollRecheckTimer = setTimeout(checkScrollability, 60);
                });
                scrollContentObserver.observe(scrollContent, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['style', 'class', 'hidden']
                });
            }

            // --- MAQUETA BURNOUT: hooks por índice desactivados ---
            // Los reinicios de quiz/evaluación del curso CRE se rehabilitarán
            // por sección cuando se construyan los interactivos reales de Burnout.

            // --- CIERRE DEL CURSO (¡Felicidades! -> último slide) ---
            if (index === totalSlides - 1) {
                lanzarConfeti();
                if (typeof SD !== 'undefined') {
                    console.log("Llegada al slide final. Forzando guardado...");
                    SD.Commit();
                }
            }

        }, 300);
    }
}

function goToPrev() {
    const slide = slides[currentSlideIndex];
    const go = slide ? slide.getAttribute('data-goto-prev') : null;
    if (go !== null && go !== '') {
        if (typeof bnMarkTema === 'function') bnMarkTema(slide);
        showSlide(parseInt(go, 10));
        return;
    }
    if (currentSlideIndex > 0) showSlide(currentSlideIndex - 1);
}
function goToNext() {
    const slide = slides[currentSlideIndex];
    const go = slide ? slide.getAttribute('data-goto-next') : null;
    if (go !== null && go !== '') {
        // Marca el tema del "hub" como visto al terminar un subtema (spoke).
        if (typeof bnMarkTema === 'function') bnMarkTema(slide);
        showSlide(parseInt(go, 10));
        return;
    }
    if (currentSlideIndex < totalSlides - 1) showSlide(currentSlideIndex + 1);
}

function updateNavigation() {
    const isFirstSlide = currentSlideIndex === 0;
    const isLastSlide = currentSlideIndex === totalSlides - 1;

    // 1. Visibilidad General
    navBar.style.display = isFirstSlide ? 'none' : 'flex';
    if (header) header.style.display = isFirstSlide ? 'none' : 'flex';

    // 2. Configuración Base de Botones
    prevBtn.disabled = isFirstSlide;

    // Regla General: Si es el último, oculta Siguiente. Si no, muéstralo.
    nextBtn.style.display = isLastSlide ? 'none' : 'block';
    finishBtn.style.display = isLastSlide ? 'block' : 'none';

    // 3. GATE GENÉRICO POR data-gate EN EL SLIDE ACTIVO
    // El bloqueo se declara en el HTML del slide (data-gate="buttons"|"video")
    // y lo evalúa bnSlideAllowsNext() de burnout.js. Escala a todo el curso
    // sin índices fijos.
    nextBtn.disabled = false;
    if (!isLastSlide) {
        nextBtn.style.display = 'block';
    }
    if (typeof bnSlideAllowsNext === 'function') {
        nextBtn.disabled = !bnSlideAllowsNext(slides[currentSlideIndex]);
    }

    updateProgress();
}

function updateProgress() {
    if (!progressBar) return;

    // Calcula el progreso basado en el índice actual y el total de slides.
    const displayIndex = currentSlideIndex + 1;
    const displayTotal = totalSlides;

    const progressPercentage = (displayIndex / displayTotal) * 100;

    progressBar.style.width = `${progressPercentage}%`;
}

/**
 * Reinicia las animaciones de entrada para todos los elementos con la clase 'anim-target'
 * dentro del slide que se está activando.
 * @param {HTMLElement} slideElement - El elemento del slide (div.slide) que se está mostrando.
 */
function resetAnimations(slideElement) {
    // 1. Encontrar todos los elementos dentro del slide que deben animarse.
    const elementsToAnimate = slideElement.querySelectorAll('.anim-target');

    elementsToAnimate.forEach(element => {
        // 2. Guardar las clases de animación y retraso para re-aplicarlas.
        const animationClasses = Array.from(element.classList).filter(cls =>
            cls.startsWith('anim-bounce') || cls.startsWith('anim-delay')
        );

        // 3. Quitar temporalmente las clases de animación para forzar el reinicio (estado inicial).
        animationClasses.forEach(cls => element.classList.remove(cls));

        // 4. Forzar el 'reflow' o re-pintado del navegador.
        void element.offsetWidth;

        // 5. Re-aplicar las clases después de un breve instante para iniciar la animación.
        setTimeout(() => {
            animationClasses.forEach(cls => element.classList.add(cls));
        }, 50);
    });
    // ⭐⭐ NUEVA LÓGICA REUTILIZABLE PARA INICIAR PULSO ⭐⭐
    const pulseTargets = slideElement.querySelectorAll('.js-init-pulse');

    if (pulseTargets.length > 0) {
        // Usamos un setTimeout más largo (1.8s) para asegurar que la animación de entrada haya terminado
        setTimeout(() => {
            pulseTargets.forEach(target => {
                target.classList.add('pulse-attention');
            });
        }, 1800);
    }
}

// ===============================================
// 3. LÓGICA DE VIDEO Y SCROLL
// ===============================================

function playVideo(videoUrl, slideId) {
    if (!introVideo) return;

    introVideo.src = videoUrl;
    fullscreenOverlay.style.display = 'flex';
    introVideo.play();
    fullscreenOverlay.setAttribute('data-slide-id', slideId);

    introVideo.onended = function () {
        const videoFinishedMessage = document.querySelector(`#${slideId} .video-finished-message`);
        const playBtn = document.querySelector(`#${slideId} .play-video-btn`);

        if (videoFinishedMessage) videoFinishedMessage.classList.remove('hidden-message');
        if (playBtn) playBtn.style.display = 'none';

        updateNavigation();
        closeVideoOverlay();
    };
}

function closeVideoOverlay() {
    if (introVideo) {
        introVideo.pause();
        introVideo.currentTime = 0;
    }
    fullscreenOverlay.style.display = 'none';
}


/**
 * Oculta el indicador de scroll cuando el usuario llega al final.
 */
function handleScroll() {
    const currentSlide = slides[currentSlideIndex];
    const scrollContent = currentSlide ? currentSlide.querySelector('.slide-scroll-content') : null;

    if (scrollContent) {
        // Distancia desde el fondo (tolerancia de 1px)
        const scrollBottom = scrollContent.scrollHeight - scrollContent.clientHeight - scrollContent.scrollTop;

        if (scrollBottom <= 1) {
            // ⭐ CORRECCIÓN CSS: Usamos .hidden y removemos .active
            scrollIndicator.classList.add('hidden');
            scrollIndicator.classList.remove('active');
            scrollContent.removeEventListener('scroll', handleScroll);
        }
    }
}

function checkScrollability() {
    if (!scrollIndicator) return;

    const currentSlide = slides[currentSlideIndex];
    const scrollContent = currentSlide ? currentSlide.querySelector('.slide-scroll-content') : null;

    // Limpiar listeners anteriores
    document.querySelectorAll('.slide-scroll-content').forEach(el => {
        el.removeEventListener('scroll', handleScroll);
    });

    if (scrollContent) {
        // Tolerancia de 2px para evitar errores de redondeo en navegadores
        const tolerance = 2;
        const contentHeight = scrollContent.scrollHeight;
        const visibleHeight = scrollContent.clientHeight;

        // LOG PARA DEBUGGEAR (Verás esto en la consola F12)
        // console.log(`Slide ${currentSlideIndex}: Contenido ${contentHeight} vs Visible ${visibleHeight}`);

        const requiresScroll = contentHeight > (visibleHeight + tolerance);

        if (requiresScroll) {
            scrollIndicator.classList.remove('hidden');
            scrollIndicator.classList.add('active');
            scrollContent.addEventListener('scroll', handleScroll);
        } else {
            scrollIndicator.classList.add('hidden');
            scrollIndicator.classList.remove('active');
        }
    } else {
        scrollIndicator.classList.add('hidden');
        scrollIndicator.classList.remove('active');
    }
}

// ===============================================
// 4. LÓGICA DE QUIZ Y EVALUACIÓN
// ===============================================

// Reemplaza tu función startQuiz actual por esta:
function startQuiz(quizId) {
    const quizContainer = document.getElementById(quizId);
    if (!quizContainer) return;

    // Ocultar Intro
    const slide = quizContainer.closest('.slide');
    const quizIntro = slide.querySelector('.quiz-intro');
    if (quizIntro) quizIntro.style.display = 'none';

    // Reiniciar datos
    if (allQuizDefinitions[quizId]) {
        allQuizDefinitions[quizId].correctAnswerCount = 0;
    }

    // Mostrar Quiz
    quizContainer.style.display = 'flex';
    quizContainer.classList.add('visible');

    // Resetear preguntas
    const questions = quizContainer.querySelectorAll('.question-wrapper');
    questions.forEach((q, index) => {
        if (index === 0) {
            q.style.display = 'block';
            q.classList.add('active');
        } else {
            q.style.display = 'none';
            q.classList.remove('active');
        }

        // Reset Inputs
        const inputs = q.querySelectorAll('input');
        inputs.forEach(input => {
            input.disabled = false;
            input.checked = false;
        });

        // Mostrar botón Enviar
        const submitBtn = q.querySelector('.submit-answer-btn');
        if (submitBtn) submitBtn.style.display = 'inline-block';
    });

    // Ocultar resultados previos
    const resultsDiv = slide.querySelector('.quiz-results');
    if (resultsDiv) resultsDiv.style.display = 'none';
}

// Reemplaza tu función submitAnswer actual por esta:
function submitAnswer(quizId) {
    const quizDef = allQuizDefinitions[quizId];
    const quizContainer = document.getElementById(quizId);

    // El examen final tiene su propio flujo (submitFinalAnswer), invocado
    // desde el botón de cada .final-question; no pasa por aquí.

    const activeQuestion = quizContainer.querySelector('.question-wrapper.active');
    if (!activeQuestion) return;

    const questionId = activeQuestion.getAttribute('data-question-id');
    const selectedOption = activeQuestion.querySelector(`input[name="${questionId}"]:checked`);

    const submitBtn = activeQuestion.querySelector('.submit-answer-btn');
    const options = activeQuestion.querySelectorAll('.options-container input');

    // 1. Validación
    if (!selectedOption) {
        showPopupFeedback('Atención', 'Por favor, selecciona una opción.', 'alerta');
        return;
    }

    // 2. Bloquear UI
    options.forEach(opt => opt.disabled = true);
    if (submitBtn) submitBtn.style.display = 'none';

    // 3. Evaluar
    const userAnswer = selectedOption.value;
    const correctAnswer = quizDef.questions[questionId].answer;

    // --- LÓGICA DE TEXTO LIMPIO ---
    let feedbackText = ""; // Empezamos vacío

    // Si hay feedback específico para la letra elegida
    if (quizDef.questions[questionId].feedback && quizDef.questions[questionId].feedback[userAnswer]) {
        feedbackText = quizDef.questions[questionId].feedback[userAnswer];
    }
    // Si no, usamos el default (aunque sea cadena vacía)
    else if (quizDef.questions[questionId].feedback && typeof quizDef.questions[questionId].feedback['default'] !== 'undefined') {
        feedbackText = quizDef.questions[questionId].feedback['default'];
    }

    // Acción al cerrar
    const actionOnClose = () => {
        nextQuestion(quizId);
    };

    if (userAnswer === correctAnswer) {
        quizDef.correctAnswerCount++;
        // Si feedbackText está vacío, solo saldrá el título "¡Muy bien!" (verde)
        showPopupFeedback('¡Muy bien!', feedbackText, 'success', actionOnClose);
    } else {
        // Si feedbackText está vacío, solo saldrá "Respuesta incorrecta" (rojo)
        showPopupFeedback('Respuesta incorrecta', feedbackText, 'error', actionOnClose);
    }
}

function nextQuestion(quizId) {
    const quizContainer = document.getElementById(quizId);
    if (!quizContainer) {
        console.error("Error: No se encontró el contenedor del quiz con ID:", quizId);
        return;
    }

    // 1. Buscar la pregunta que está activa AHORA
    const currentQ = quizContainer.querySelector('.question-wrapper.active');

    if (currentQ) {
        // 2. Ocultarla
        currentQ.classList.remove('active');

        // Usamos setTimeout para dar tiempo a que el popup se cierre visualmente
        setTimeout(() => {
            currentQ.style.display = 'none';

            // 3. Buscar la SIGUIENTE pregunta (hermano)
            let nextQ = currentQ.nextElementSibling;

            // Avanzar hasta encontrar un elemento que sea una pregunta válida
            while (nextQ && !nextQ.classList.contains('question-wrapper')) {
                nextQ = nextQ.nextElementSibling;
            }

            if (nextQ) {
                // 4. Si existe, mostrarla
                nextQ.style.display = 'block';
                // Pequeño delay para permitir que el display:block se aplique antes de la clase active (animación)
                setTimeout(() => {
                    nextQ.classList.add('active');
                }, 10);
            } else {
                // 5. Si no hay más preguntas, mostrar resultados
                showQuizResults(quizId);
            }
        }, 300); // Espera 300ms (tiempo de cierre del popup)
    } else {
        // Fallback: Si no hay activa, mostrar resultados
        showQuizResults(quizId);
    }
}

// Reemplaza tu función showQuizResults actual por esta:
function showQuizResults(quizId) {
    const quizContainer = document.getElementById(quizId);
    const slide = quizContainer.closest('.slide');
    const quizResultsDiv = slide.querySelector('.quiz-results');
    const quizDef = allQuizDefinitions[quizId];

    if (!quizContainer || !quizResultsDiv) return;

    quizContainer.style.display = 'none';
    quizResultsDiv.style.display = 'flex'; // Flex para centrar
    quizResultsDiv.classList.add('visible');

    // Calcular Puntaje
    const finalScore = quizDef.correctAnswerCount * quizDef.pointsPerQuestion;

    let title = "";
    let message = "";
    let colorClass = "";

    if (finalScore <= 60) {
        title = "Resultado: " + finalScore + " Puntos";
        message = "Aún hay áreas por fortalecer. Te invitamos a repasar.";
        colorClass = "failed-score";
    } else if (finalScore === 80) {
        title = "¡Bien hecho! " + finalScore + " Puntos";
        message = "Buen dominio del tema, puedes seguir mejorando.";
        colorClass = "passed-score";
    } else {
        title = "¡Excelente! 100 Puntos";
        message = "Dominio completo del tema. ¡Sigue así!";
        colorClass = "passed-score";
    }

    quizResultsDiv.innerHTML = `
        <div class="quiz-results-box anim-target anim-bounce-up">
            <h2 class="${colorClass}" style="font-size: 2.5em; margin-bottom: 20px;">${title}</h2>
            <p style="font-size: 1.2em; line-height: 1.5; margin-bottom: 30px;">${message}</p>
            <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                <button class="nav-button primary-blue-btn" onclick="retryQuiz('${quizId}')">Intentar de nuevo</button>
                ${finalScore >= 80 ? `<button class="nav-button primary-blue-btn" onclick="goToNext()">Continuar</button>` : ``}
            </div>
        </div>
    `;
}
/**
 * Reinicia el quiz completamente mostrando la pantalla de INTRODUCCIÓN.
 * Se usa cuando el usuario regresa al slide.
 */
function resetToQuizIntro(quizId) {
    const quizContainer = document.getElementById(quizId);
    if (!quizContainer) return;

    const slide = quizContainer.closest('.slide');
    const intro = slide.querySelector('.quiz-intro');
    const resultsDiv = slide.querySelector('.quiz-results');

    // 1. Mostrar Intro
    if (intro) {
        intro.style.display = 'flex'; // O block/flex según tu CSS
        // Reiniciar animación de entrada
        const introBox = intro.querySelector('.intro-box');
        if (introBox) {
            introBox.classList.remove('anim-bounce-left');
            void introBox.offsetWidth; // Trigger reflow
            introBox.classList.add('anim-bounce-left');
        }
    }

    // 2. Ocultar Preguntas y Resultados
    quizContainer.style.display = 'none';
    quizContainer.classList.remove('visible');

    if (resultsDiv) {
        resultsDiv.style.display = 'none';
        resultsDiv.classList.remove('visible');
    }

    // 3. Resetear lógica interna
    if (allQuizDefinitions[quizId]) {
        allQuizDefinitions[quizId].correctAnswerCount = 0;
    }
    currentQuestionIndex = 0;
}

// NOTA: aqui habia una copia duplicada de submitFinalAnswer(). La definicion
// buena esta mas abajo, junto al resto del motor del examen final, y era la
// que ganaba por orden de declaracion. Se elimina la copia muerta.
// Función específica para REINICIAR el quiz desde la pantalla de resultados
function retryQuiz(quizId) {
    const quizContainer = document.getElementById(quizId);
    const slide = quizContainer.closest('.slide');
    const resultsDiv = slide.querySelector('.quiz-results');
    const quizDef = allQuizDefinitions[quizId];

    // 1. Ocultar Resultados y Mostrar Preguntas
    resultsDiv.style.display = 'none';
    resultsDiv.classList.remove('visible');

    quizContainer.style.display = 'flex';
    quizContainer.classList.add('visible');

    // 2. Reiniciar Variables Lógicas
    currentQuestionIndex = 0;
    if (quizDef) quizDef.correctAnswerCount = 0;

    // 3. Reiniciar Visualmente cada Pregunta
    const questions = quizContainer.querySelectorAll('.question-wrapper');

    questions.forEach((q, index) => {
        // Mostrar solo la primera pregunta
        if (index === 0) {
            q.style.display = 'block';
            q.classList.add('active');
        } else {
            q.style.display = 'none';
            q.classList.remove('active');
        }

        // Limpiar Inputs (Radio buttons)
        const inputs = q.querySelectorAll('input');
        inputs.forEach(input => {
            input.checked = false;  // Quitar selección
            input.disabled = false; // Desbloquear
        });

        // Ocultar Feedback previo (mensajes verdes/rojos)
        const feedbackDiv = q.querySelector('.feedback');
        if (feedbackDiv) {
            feedbackDiv.style.display = 'none';
            feedbackDiv.className = 'feedback'; // Quitar clases .correct o .incorrect
            feedbackDiv.innerHTML = '';
        }

        // Resetear Botones (Mostrar 'Enviar', Ocultar 'Siguiente' si existiera)
        const submitBtn = q.querySelector('.submit-answer-btn');
        const nextBtn = q.querySelector('.next-question-btn'); // Si todavía tienes alguno

        if (submitBtn) submitBtn.style.display = 'inline-block';
        if (nextBtn) nextBtn.style.display = 'none';
    });
    startQuiz(quizId);
}
// ===============================================
// LÓGICA DE POPUP GENÉRICO (CORREGIDA)
// ===============================================

// Referencias a los elementos del DOM
const feedbackIconContainer = document.getElementById('feedback-icon-container');
const feedbackCloseBtn = document.getElementById('close-feedback-btn'); // Referencia al botón de tu HTML

// Variable para guardar la acción que se ejecutará al cerrar (IMPORTANTE)
let currentPopupCloseAction = null;

/**
 * Muestra el Popup Genérico con contenido dinámico.
 * @param {string} title - El título del mensaje.
 * @param {string} message - El cuerpo del mensaje.
 * @param {string} type - 'success', 'error', 'warning', 'info'.
 * @param {Function} onClose - (OPCIONAL) Función a ejecutar al cerrar.
 */
function showPopupFeedback(title, message, type = 'info', onClose = null) {
    // Usamos la variable global feedbackPopupOverlay
    if (!feedbackPopupOverlay) return;

    // 1. Guardamos la acción para ejecutarla cuando se cierre
    currentPopupCloseAction = onClose;

    // 2. Inyectar Texto
    if (feedbackTitle) feedbackTitle.textContent = title;
    if (feedbackMessage) feedbackMessage.innerHTML = message;

    // 3. Resetear clases de color del popup box
    const popupBox = document.getElementById('feedback-popup-box');
    if (popupBox) {
        popupBox.classList.remove('is-success', 'is-error', 'is-warning', 'is-info');
    }

    // 4. Configurar Estilo e Icono según el Tipo
    let iconHtml = '';

    switch (type) {
        case 'success':
            if (popupBox) popupBox.classList.add('is-success');
            iconHtml = `<svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#28a745" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
            break;
        case 'error':
            if (popupBox) popupBox.classList.add('is-error');
            iconHtml = `<svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
            break;
        case 'warning':
        case 'alerta':
            if (popupBox) popupBox.classList.add('is-warning');
            iconHtml = '⚠️';
            break;
        default:
            if (popupBox) popupBox.classList.add('is-info');
            iconHtml = 'ℹ️';
            break;
    }

    if (feedbackIconContainer) feedbackIconContainer.innerHTML = iconHtml;

    // ⭐ CORRECCIÓN CRÍTICA: QUITAR LA CLASE HIDDEN ⭐
    feedbackPopupOverlay.classList.remove('hidden');

    // Mostrar Flex
    feedbackPopupOverlay.style.display = 'flex';

    // Pequeño delay para la animación de opacidad (clase show)
    setTimeout(() => {
        feedbackPopupOverlay.classList.add('show');
    }, 10);
}

/**
 * Cierra el Popup y ejecuta la acción pendiente (avanzar pregunta).
 */
function closePopupFeedback() {
    if (feedbackPopupOverlay) {
        // 1. Quitar la clase visual de animación
        feedbackPopupOverlay.classList.remove('show');

        // 2. Esperar a que termine la animación (300ms)
        setTimeout(() => {
            feedbackPopupOverlay.style.display = 'none';
            feedbackPopupOverlay.classList.add('hidden'); // ⭐ Volvemos a ocultarlo bien ⭐

            // ⭐ EJECUTAR LA ACCIÓN (IR A SIGUIENTE PREGUNTA) ⭐
            if (currentPopupCloseAction) {
                currentPopupCloseAction();
                currentPopupCloseAction = null; // Limpieza
            }

        }, 300);
    }
}

// ⭐ VINCULACIÓN DEL BOTÓN HTML CON LA FUNCIÓN JS ⭐
if (feedbackCloseBtn) {
    // Primero removemos cualquier listener anterior para evitar duplicados
    feedbackCloseBtn.replaceWith(feedbackCloseBtn.cloneNode(true));
    // Volvemos a capturar el elemento (ahora limpio)
    const newCloseBtn = document.getElementById('close-feedback-btn');
    newCloseBtn.addEventListener('click', closePopupFeedback);
}
// ===============================================
// 5. LÓGICA DE BLOQUEO MODULAR Y MENÚ
// ===============================================

// Devuelve la clave de unidad ('modulo1', 'modulo2', ...) a la que pertenece
// un índice de slide, o null si no cae en ninguna unidad conocida.
function getModuleKeyForIndex(index) {
    return moduleKeysOrder.find(key => {
        const def = moduleStructure[key];
        return index >= def.start && index < def.end;
    }) || null;
}

function getPreviousModuleKey(currentKey) {
    const i = moduleKeysOrder.indexOf(currentKey);
    return i > 0 ? moduleKeysOrder[i - 1] : null;
}

// ¿Se puede saltar (vía menú) a targetIndex? La primera unidad siempre está
// abierta; cualquier otra requiere que la unidad anterior esté "passed".
function checkModuleLock(targetIndex) {
    const targetKey = getModuleKeyForIndex(targetIndex);
    if (!targetKey) return true; // fuera de cualquier unidad conocida: no bloquea
    if (targetKey === moduleKeysOrder[0]) return true;
    const prevKey = getPreviousModuleKey(targetKey);
    return prevKey ? moduleStatus[prevKey].passed : true;
}

// Marca una unidad como aprobada si furthestSlideIndexReached ya llegó a
// su unlockIndex (== inicio de la siguiente unidad). Idempotente.
function unlockNextModule(passedModuleKey) {
    const status = moduleStatus[passedModuleKey];
    if (status && !status.passed && furthestSlideIndexReached >= status.unlockIndex) {
        status.passed = true;
    }
}

// Recalcula el estado "passed" de todas las unidades. Se llama cada vez que
// furthestSlideIndexReached puede haber avanzado (ver showSlide()).
function recomputeModuleUnlocks() {
    moduleKeysOrder.forEach(unlockNextModule);
}

function updateModuleDropdown() {
    const keys = moduleKeysOrder;
    if (moduleDropdown.children.length === 0) {
        keys.forEach(key => {
            const moduleDef = moduleStructure[key];
            const linkElement = document.createElement('a');
            linkElement.href = '#';
            linkElement.setAttribute('data-module', key);
            linkElement.textContent = moduleDef.name;
            linkElement.classList.add('module-link');
            linkElement.addEventListener('click', function (e) {
                e.preventDefault();
                const targetIndex = moduleDef.start;
                if (!checkModuleLock(targetIndex)) return; // guarda JS además del CSS pointer-events:none
                showSlide(targetIndex);
                moduleDropdown.classList.remove('show');
            });
            moduleDropdown.appendChild(linkElement);
        });
    }
    // Refresca locked/unlocked cada vez que se abre el menú (no solo al construirlo).
    keys.forEach(key => {
        const linkElement = moduleDropdown.querySelector(`[data-module="${key}"]`);
        if (!linkElement) return;
        const unlocked = checkModuleLock(moduleStructure[key].start);
        linkElement.classList.toggle('unlocked', unlocked);
        linkElement.classList.toggle('locked', !unlocked);
    });
}

function showFeedback(title, message, type = 'info') {
    if (!feedbackPopupOverlay) return;
    feedbackTitle.textContent = title;
    feedbackMessage.textContent = message;
    feedbackPopupOverlay.style.display = 'flex';
}

/**
 * Alterna la visibilidad del TEXTO de respuesta (párrafo) dentro de la barra de color.
 * @param {string} infoId - El ID del div de respuesta (ej: 'info1').
 */
function toggleInfo(infoId) {
    const targetElement = document.getElementById(infoId);

    if (targetElement) {
        // Busca el párrafo con la clase 'answer-text'
        const paragraph = targetElement.querySelector('.answer-text');

        // ⭐⭐ LÓGICA DE VISIBILIDAD REINSERTADA Y CORREGIDA ⭐⭐
        if (paragraph) {
            // Alterna la propiedad 'display' entre 'block' y 'none'
            if (paragraph.style.display === 'block') {
                paragraph.style.display = 'none'; // Ocultar
            } else {
                paragraph.style.display = 'block'; // Mostrar
            }
        }
        // ⭐⭐ FIN LÓGICA DE VISIBILIDAD ⭐⭐

        // ⭐⭐ LÓGICA CLAVE: Detener el pulso en el botón asociado ⭐⭐

        // Busca el contenedor padre (.interactivo-item-wrapper)
        const itemWrapper = targetElement.closest('.interactivo-item-wrapper');
        // Busca el botón dentro de ese contenedor
        const iconButton = itemWrapper ? itemWrapper.querySelector('.icon-button') : null;

        if (iconButton) {
            // 2. Remover la clase que genera el loop infinito
            iconButton.classList.remove('pulse-attention');
            iconButton.classList.remove('js-init-pulse');
            // Opcional: Asegurar que el hover interactivo aún funcione
            iconButton.style.transform = 'scale(1)';
        }
    }
}
/**
 * Controla la secuencia de animación para los botones de plataforma (Slide 8).
 * Activa las animaciones de barrido de línea, y la entrada separada de icono y texto.
 * * @param {HTMLElement} button - El botón de plataforma presionado.
 * @param {string} contentId - El ID del contenedor de contenido desplegable (ej: 'item-8-1-content').
 */


function togglePlatform(button, contentId) {
    const contentDiv = document.getElementById(contentId);
    if (!contentDiv) return;

    // 1. MATAR EL PARPADEO (La corrección clave)
    // Removemos ambas clases posibles para asegurar que deje de latir
    button.classList.remove('pulse-attention');
    button.classList.remove('js-init-pulse');

    // ... (El resto de tu lógica de animación sigue igual) ...
    const lineImage = contentDiv.querySelector('.line-image');
    const textBox = contentDiv.querySelector('.feature-text-box');
    const featureIcon = contentDiv.querySelector('.feature-icon');

    if (lineImage) lineImage.style.animation = 'lineSweepUp 0.8s ease-out forwards';

    setTimeout(() => {
        if (textBox) textBox.style.animation = 'fadeIn 0.5s ease-out forwards';
        if (featureIcon) featureIcon.style.animation = 'scaleIn 0.5s ease-out forwards';

        // Activar el siguiente botón
        const nextButton = getNextPlatformButton(button);
        if (nextButton) {
            setTimeout(() => {
                nextButton.classList.add('pulse-attention');
            }, 300);
        }
    }, 700);

    button.disabled = true;
}

/**
 * Controla la revelación de tarjetas en el Slide 11.
 * @param {HTMLElement} button - El botón presionado.
 * @param {string} contentId - El ID del contenido a mostrar.
 */
function revealCard(button, contentId) {
    const contentDiv = document.getElementById(contentId);
    if (!contentDiv) return;

    // 1. MATAR EL PARPADEO
    button.classList.remove('pulse-attention');
    button.classList.remove('js-init-pulse'); // Agregado por seguridad

    // ... (Resto de tu lógica) ...
    if (!contentDiv.classList.contains('active')) {
        contentDiv.classList.add('active');

        const currentCard = button.closest('.feedback-card');
        const nextCard = currentCard.nextElementSibling;

        if (nextCard && nextCard.classList.contains('feedback-card')) {
            const nextBtn = nextCard.querySelector('.card-button');
            if (nextBtn) {
                setTimeout(() => {
                    nextBtn.classList.add('pulse-attention');
                }, 500);
            }
        }
    }
    button.disabled = true;
}
/**
 * Controla el interactivo de arco del Slide 12.
 * @param {HTMLElement} button - El botón presionado.
 * @param {string} contentId - El ID del contenido a mostrar.
 */

function revealArcItem(button, contentId) {
    const contentDiv = document.getElementById(contentId);
    if (!contentDiv) return;

    // 1. MATAR EL PARPADEO
    button.classList.remove('pulse-attention');
    button.classList.remove('js-init-pulse'); // Agregado

    // ... (Resto de tu lógica) ...
    contentDiv.classList.add('active');

    const currentItem = button.closest('.arc-item');

    if (currentItem.classList.contains('item-1')) {
        activateNextButton('.item-2-1');
    } else if (currentItem.classList.contains('item-2-1')) {
        activateNextButton('.item-3');
    } else if (currentItem.classList.contains('item-3')) {
        activateNextButton('.item-4');
    } else if (currentItem.classList.contains('item-4')) {
        showCenterButton('.item-center');
    } else if (currentItem.classList.contains('item-center')) {
        showCenterButton();
    }

    button.disabled = true;
}

function activateNextButton(selector) {
    // Esperamos medio segundo para que el usuario termine de leer el item anterior
    setTimeout(() => {
        // 1. Buscamos el contenedor (ej: .item-2)
        const nextItemContainer = document.querySelector(selector);

        if (nextItemContainer) {
            // 2. Buscamos el botón dentro de ese contenedor
            const btn = nextItemContainer.querySelector('.btn-number');

            if (btn) {
                // A. Quitamos el candado (visual y funcional)
                btn.classList.remove('locked');
                btn.removeAttribute('disabled'); // Importante para que acepte clic

                // B. ⭐ ACTIVAMOS EL PARPADEO (ESTO ES LO QUE FALTABA) ⭐
                btn.classList.add('pulse-attention');

                // Opcional: Aseguramos cursor de mano
                btn.style.cursor = 'pointer';
            }

        } else {
            console.error("No encontré el elemento con selector:", selector);
        }
    }, 500);
}

function showCenterButton() {
    setTimeout(() => {
        const centerItem = document.getElementById('item-center-12');
        if (centerItem) {
            centerItem.classList.add('visible'); // Hace visible el contenedor

            // Animar entrada del botón
            const btn = centerItem.querySelector('.btn-number');
            if (btn) {
                btn.style.animation = 'bounceIn 1s ease forwards'; // Asegúrate de tener bounceIn o usa otra
                btn.classList.add('pulse-attention');
            }
        }
    }, 1000);
}
/**
 * Obtiene el botón de la siguiente plataforma en secuencia (Naranja -> Amarillo -> Verde).
 * @param {HTMLElement} currentButton - El botón actual.
 */
function getNextPlatformButton(currentButton) {
    // Encuentra la columna actual (interactive-column)
    const currentColumn = currentButton.closest('.interactive-column');
    // Encuentra el contenedor padre de las columnas (three-col-layout)
    const layout = currentColumn.closest('.three-col-layout');
    // Crea un array de todas las columnas
    const columns = Array.from(layout.querySelectorAll('.interactive-column'));
    // Encuentra el índice de la columna actual
    const currentIndex = columns.indexOf(currentColumn);

    // Si no es la última columna...
    if (currentIndex < columns.length - 1) {
        // Devuelve el botón de la siguiente columna
        const nextColumn = columns[currentIndex + 1];
        return nextColumn.querySelector('.platform-button');
    }
    // Si es la última, devuelve null
    return null;
}

/**
 * Cierra el pop-up de retroalimentación.
 */
function closeFeedbackPopup() {
    if (feedbackPopupOverlay) {
        feedbackPopupOverlay.style.display = 'none';
    }
}


// ===============================================
// 6. JSON DE ANIMACIÓN LOTTIE
// ===============================================

function initializeLottie(containerId, jsonPath, loop = true) {
    const container = document.getElementById(containerId);

    // Verificamos si 'lottie' existe (lo cual será cierto si el archivo local cargó bien)
    if (container && typeof lottie !== 'undefined') {
        lottie.loadAnimation({
            container: container,
            renderer: 'svg',
            loop: loop,
            autoplay: true,
            path: jsonPath // Ruta relativa a tu archivo JSON local
        });
    } else if (container) {
        console.error(`Error: La librería Lottie no se cargó correctamente desde js/libs/.`);
    }
}


// ===============================================
// 7. INICIALIZACIÓN Y LISTENERS PRINCIPALES
// ===============================================

function initializeCourse() {
    // 1. Inicialización de Slides y Estado
    initSCORM();
    if (slides.length > 0) {
        slides[0].classList.add('active');
        updateNavigation();
    }

    // LÓGICA DE RECUPERACIÓN DE BOOKMARK 
    let savedLocation = 0; // Por defecto Slide 0 (Inicio)

    if (typeof scorm !== 'undefined') {
        // Pedimos al LMS dónde se quedó
        var bookmark = scorm.get("cmi.core.lesson_location");

        // Si hay un dato guardado y es un número válido
        if (bookmark !== "" && bookmark !== null && !isNaN(bookmark)) {
            savedLocation = parseInt(bookmark, 10);
            console.log("Regresando al Slide guardado: " + savedLocation);
        }
    }

    // Si hay slides, ir al guardado (o al 0 si es nuevo)
    if (slides.length > 0) {
        // Importante: showSlide se encarga de quitar clases y poner 'active'
        showSlide(savedLocation);
        updateNavigation();
    }
    // FIN LÓGICA BOOKMARK

    // 2. Inicialización de Lottie
    initializeLottie('animacion-slide-3', 'animations/courses.json', true);

    initTabs();
    initUniversalAudio();


    // 3. Inicializar Listeners

    // Navegación principal
    prevBtn.addEventListener('click', goToPrev);
    nextBtn.addEventListener('click', goToNext);
    homeBtn.addEventListener('click', () => showSlide(0));

    // Otros Listeners (Finalización, Quiz, Video, etc.)
    finishBtn.addEventListener('click', () => {
        exitCourse();
    });

    // (Se eliminó un listener sobre #quiz-form que llamaba a submitFinalQuiz(),
    //  función que no existe en este archivo: heredado del curso base, habría
    //  lanzado un ReferenceError si ese formulario llegara a existir.)

    menuBtn.addEventListener('click', () => {
        updateModuleDropdown();
        moduleDropdown.classList.toggle('show');
    });

    if (closeFeedbackBtn) closeFeedbackBtn.addEventListener('click', closeFeedbackPopup);

    document.querySelectorAll('.play-video-btn').forEach(button => {
        button.addEventListener('click', function () {
            const videoUrl = this.getAttribute('data-video-url');
            const slideId = this.closest('.slide').id;
            playVideo(videoUrl, slideId);
        });
    });

    fullscreenOverlay.addEventListener('click', function (e) {
        if (e.target === fullscreenOverlay) {
            closeVideoOverlay();
        }
    });

    if (downloadBtn) {
        downloadBtn.addEventListener('click', function () {
            // 1. Obtener la ruta relativa (asegurándonos que no tenga / al inicio)
            const pdfUrl = this.getAttribute('data-pdf-url');

            // 2. Crear un elemento <a> invisible en memoria
            const link = document.createElement('a');
            link.href = pdfUrl;

            // 3. El atributo 'download' fuerza la descarga en vez de abrir
            // Puedes ponerle nombre al archivo aquí:
            link.download = 'Infografia_GS1_Retroalimentacion.pdf';

            // 4. Añadirlo al documento (necesario para Firefox), clic y remover
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
    // 2. NUEVA LÓGICA para el Plan de Mejora (Slide 24)
    const downloadPlanBtn = document.getElementById('download-plan-btn');

    if (downloadPlanBtn) {
        downloadPlanBtn.addEventListener('click', function () {
            // A. Obtener la ruta del atributo
            const pdfUrl = this.getAttribute('data-pdf-url');

            // B. Crear enlace temporal
            const link = document.createElement('a');
            link.href = pdfUrl;

            // C. Forzar descarga con nombre limpio (sin espacios es más seguro)
            link.download = 'Plan_Mejora_Rendimiento.pdf';

            // D. Clic y limpieza
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
    // Listener para los botones de la lista vertical (.btn-video-play)
    document.querySelectorAll('.btn-video-play').forEach(button => {
        button.addEventListener('click', function () {
            const videoUrl = this.getAttribute('data-video-url');
            // Buscamos el ID del slide padre por si se necesita para desbloqueos
            const slide = this.closest('.slide');
            const slideId = slide ? slide.id : null;

            // Reusamos tu función playVideo que ya abre el overlay
            playVideo(videoUrl, slideId);
        });
    });
    // Listener para redimensionamiento de ventana (para re-evaluar el scroll)
    window.addEventListener('resize', checkScrollability);

    // ⭐ Llamada inicial a checkScrollability después de que la estructura esté activa
    checkScrollability();
}

// fucion de TABS //

// ===============================================
// FUNCIÓN TABS UNIVERSAL (Soporta múltiples slides)
// ===============================================

function initTabs() {
    const allTabContainers = document.querySelectorAll('.tabs-container');
    if (allTabContainers.length === 0) return;

    const playerContainer = document.getElementById('floating-audio-player');
    const playBtn = document.getElementById('fp-play-toggle');
    const closeBtn = document.getElementById('fp-close-btn');
    const progressContainer = document.getElementById('fp-progress-container');
    const progressFill = document.getElementById('fp-progress-fill');
    const timeDisplay = document.getElementById('fp-current-time');
    const durationDisplay = document.getElementById('fp-duration');
    const playIcon = document.getElementById('fp-play-icon');

    // Variable local para tabs, independiente del global
    let currentAudio = null;
    let activeBtn = null;

    allTabContainers.forEach(container => {
        const tabLinks = container.querySelectorAll(".tabs li a");
        const tabPanels = container.querySelectorAll(".tabs-panel");
        const listItems = container.querySelectorAll(".tabs li");

        listItems.forEach((li, index) => {
            if (index === 0) {
                li.classList.remove("locked");
            } else {
                li.classList.add("locked");
                li.classList.remove("active");
            }
        });

        const unlockNextTab = (currentIndex) => {
            const nextIndex = currentIndex + 1;
            if (nextIndex < listItems.length) {
                const nextTab = listItems[nextIndex];
                if (nextTab.classList.contains("locked")) {
                    nextTab.classList.remove("locked");
                    const link = nextTab.querySelector('a');
                    if (link) {
                        link.style.transition = "background 0.5s";
                        link.style.backgroundColor = "#FFC107";
                        setTimeout(() => link.style.backgroundColor = "", 1000);
                    }
                }
            }
        };

        tabLinks.forEach((link, index) => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const parentLi = link.closest('li');

                if (parentLi.classList.contains("locked") || parentLi.classList.contains("active")) return;

                listItems.forEach(li => li.classList.remove("active"));
                tabPanels.forEach(panel => panel.classList.remove("active"));
                parentLi.classList.add("active");

                const currentPanel = tabPanels[index];
                if (currentPanel) {
                    currentPanel.classList.add("active");
                    const contentWrapper = container.querySelector(".tabs-content");
                    if (contentWrapper) contentWrapper.classList.add("has-active-tab");

                    const hasAudioBtn = currentPanel.querySelector('.audio-play-btn');
                    if (!hasAudioBtn) {
                        unlockNextTab(index);
                    }
                }

                if (currentAudio) {
                    currentAudio.pause();
                    playerContainer.classList.add('player-hidden');
                    resetLocalImages(container);
                }
            });
        });

        const localAudioBtns = container.querySelectorAll(".audio-play-btn");

        localAudioBtns.forEach((btn) => {
            btn.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation();

                const panelParent = btn.closest('.tabs-panel');
                const panelIndex = Array.from(tabPanels).indexOf(panelParent);

                const imgElement = this.querySelector("img");
                const audioFile = this.getAttribute("data-audio");
                const gifSrc = this.getAttribute("data-gif") || "img/voice_slide-15.gif";
                const originalSrc = "img/voice_slide-15.png";

                if (activeBtn === this && currentAudio) {
                    if (currentAudio.paused) currentAudio.play();
                    else currentAudio.pause();
                    return;
                }

                if (currentAudio) {
                    currentAudio.pause();
                    resetLocalImages(container);
                }

                currentAudio = new Audio(audioFile);
                activeBtn = this;

                playerContainer.classList.remove('player-hidden');

                playBtn.onclick = () => {
                    if (currentAudio.paused) currentAudio.play();
                    else currentAudio.pause();
                };

                closeBtn.onclick = () => {
                    currentAudio.pause();
                    currentAudio.currentTime = 0;
                    playerContainer.classList.add('player-hidden');
                    resetLocalImages(container);
                };

                progressContainer.onclick = (e) => {
                    const width = progressContainer.clientWidth;
                    const clickX = e.offsetX;
                    const duration = currentAudio.duration;
                    currentAudio.currentTime = (clickX / width) * duration;
                };

                currentAudio.onplay = () => {
                    if (playIcon) playIcon.src = "img/pause_icon.svg";
                    else playBtn.innerHTML = '❚❚';
                    if (imgElement) imgElement.src = gifSrc;
                };

                currentAudio.onpause = () => {
                    if (playIcon) playIcon.src = "img/play_icon.svg";
                    else playBtn.innerHTML = '▶';
                    if (imgElement) imgElement.src = originalSrc;
                };

                currentAudio.ontimeupdate = () => {
                    if (currentAudio.duration) {
                        const percent = (currentAudio.currentTime / currentAudio.duration) * 100;
                        progressFill.style.width = percent + '%';
                        timeDisplay.textContent = formatTime(currentAudio.currentTime);
                        durationDisplay.textContent = formatTime(currentAudio.duration);
                    }
                };

                currentAudio.onended = () => {
                    if (playIcon) playIcon.src = "img/play_icon.svg";
                    else playBtn.innerHTML = '▶';
                    if (imgElement) imgElement.src = originalSrc;
                    playerContainer.classList.add('player-hidden');
                    if (panelIndex !== -1) unlockNextTab(panelIndex);
                };

                currentAudio.play().catch(err => console.log("Error reproducción tab:", err));
            });
        });
    });

    function resetLocalImages(containerScope) {
        containerScope.querySelectorAll(".audio-play-btn img").forEach(img => {
            img.src = "img/voice_slide-15.png";
        });
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "00:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
}


function initUniversalAudio() {
    const buttons = document.querySelectorAll(".universal-audio-btn");
    const playerContainer = document.getElementById('floating-audio-player');
    const playBtn = document.getElementById('fp-play-toggle');
    const closeBtn = document.getElementById('fp-close-btn');
    const progressContainer = document.getElementById('fp-progress-container');
    const progressFill = document.getElementById('fp-progress-fill');
    const timeDisplay = document.getElementById('fp-current-time');
    const durationDisplay = document.getElementById('fp-duration');
    const playIcon = document.getElementById('fp-play-icon');

    // USAR GLOBAL
    if (!globalAudioObject) {
        globalAudioObject = new Audio();
    }

    let activeCard = null;

    buttons.forEach(btn => {
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            const audioSrc = this.getAttribute("data-audio");

            if (activeCard === this && !globalAudioObject.paused) {
                globalAudioObject.pause();
                return;
            }

            if (activeCard === this && globalAudioObject.paused) {
                globalAudioObject.play();
                return;
            }

            if (activeCard) resetCardVisuals(activeCard);

            activeCard = this;
            globalAudioObject.src = audioSrc;

            playerContainer.classList.remove('player-hidden');
            globalAudioObject.play().catch(err => console.log("Error play:", err));
        });
    });

    playBtn.addEventListener('click', () => {
        if (globalAudioObject.paused) globalAudioObject.play();
        else globalAudioObject.pause();
    });

    closeBtn.addEventListener('click', () => {
        globalAudioObject.pause();
        globalAudioObject.currentTime = 0;
        playerContainer.classList.add('player-hidden');
        if (activeCard) resetCardVisuals(activeCard);
        activeCard = null;
    });

    progressContainer.addEventListener('click', (e) => {
        const width = progressContainer.clientWidth;
        const clickX = e.offsetX;
        const duration = globalAudioObject.duration;
        globalAudioObject.currentTime = (clickX / width) * duration;
    });

    globalAudioObject.addEventListener('play', () => {
        if (playIcon) playIcon.src = "img/pause_icon.svg";
        else playBtn.innerHTML = '❚❚';

        if (activeCard) {
            const img = activeCard.querySelector('img');
            const gif = activeCard.getAttribute('data-gif');
            if (img && gif) img.src = gif;
            activeCard.classList.add('playing');
        }
    });

    globalAudioObject.addEventListener('pause', () => {
        if (playIcon) playIcon.src = "img/play_icon.svg";
        else playBtn.innerHTML = '▶';

        if (activeCard) {
            const img = activeCard.querySelector('img');
            const staticSrc = activeCard.getAttribute('data-static') || "img/voice_slide-15.png";
            if (img) img.src = staticSrc;
            activeCard.classList.remove('playing');
        }
    });

    globalAudioObject.addEventListener('timeupdate', () => {
        if (globalAudioObject.duration) {
            const percent = (globalAudioObject.currentTime / globalAudioObject.duration) * 100;
            progressFill.style.width = percent + '%';
            timeDisplay.textContent = formatTime(globalAudioObject.currentTime);
            durationDisplay.textContent = formatTime(globalAudioObject.duration);
        }
    });

    globalAudioObject.addEventListener('ended', () => {
        playerContainer.classList.add('player-hidden');
        if (playIcon) playIcon.src = "img/play_icon.svg";
        else playBtn.innerHTML = '▶';

        if (activeCard) {
            resetCardVisuals(activeCard);
            const revealId = activeCard.getAttribute("data-reveal-id");
            if (revealId) {
                const elementToReveal = document.getElementById(revealId);
                if (elementToReveal) {
                    elementToReveal.classList.remove("content-hidden");
                    elementToReveal.classList.add("content-visible");
                    setTimeout(() => {
                        elementToReveal.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                }
            }
        }
        activeCard = null;
    });

    function resetCardVisuals(btn) {
        const img = btn.querySelector('img');
        const staticSrc = btn.getAttribute('data-static') || "img/voice_slide-15.png";
        if (img) img.src = staticSrc;
        btn.classList.remove('playing');
        btn.classList.remove('glow-indicator');
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "00:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
}

// ===============================================
// LÓGICA DE NAVEGACIÓN FASES (SLIDE 23) - VERSIÓN OVERLAY
// ===============================================

// 1. ABRIR UNA FASE (Oculta menú, muestra vista)
function openPhaseOverlay(phaseNum) {
    // Referencias a los elementos
    const menu = document.getElementById('phases-main-menu');
    const view = document.getElementById(`view-fase-${phaseNum}`);
    const btn = document.getElementById(`menu-btn-fase-${phaseNum}`);

    // Seguridad: Si no encuentra los elementos, no hace nada
    if (!menu || !view) return;

    // A. Quitar animación de pulso del botón presionado
    if (btn) btn.classList.remove('js-init-pulse', 'pulse-attention');

    // B. Ocultar Menú Principal
    menu.classList.add('hidden');

    // C. Mostrar la Vista correspondiente (Overlay)
    view.classList.remove('hidden');
    setTimeout(checkScrollability, 100);
    // D. Resetear el scroll hacia arriba (por si el usuario bajó antes)
    const slideContent = document.querySelector('#slide-23 .slide-scroll-content');
    if (slideContent) slideContent.scrollTop = 0;
}

// 2. CERRAR FASE Y REGRESAR (Desbloquea la siguiente)
function closePhaseOverlay(completedPhaseNum) {
    // Referencias
    const menu = document.getElementById('phases-main-menu');
    const currentView = document.getElementById(`view-fase-${completedPhaseNum}`);

    if (!menu || !currentView) return;

    // A. Ocultar la Vista actual
    currentView.classList.add('hidden');

    // B. Mostrar de nuevo el Menú Principal
    menu.classList.remove('hidden');

    // C. LÓGICA DE DESBLOQUEO DEL SIGUIENTE NIVEL
    const nextPhaseNum = completedPhaseNum + 1;
    const nextBtn = document.getElementById(`menu-btn-fase-${nextPhaseNum}`);

    // Si existe un siguiente botón y está bloqueado...
    if (nextBtn && nextBtn.classList.contains('locked')) {
        // Pequeño retraso para que se note el efecto visual
        setTimeout(() => {
            nextBtn.classList.remove('locked');       // Quita el gris/candado
            nextBtn.classList.add('pulse-attention'); // Empieza a palpitar para llamar la atención
        }, 500);
    }
    // D. SI YA TERMINÓ LA ÚLTIMA FASE (FASE 3)
    else if (completedPhaseNum === 3) {
        const finalMsg = document.getElementById('msg-final-fases');
        if (finalMsg) {
            finalMsg.classList.remove('hidden');      // Muestra el mensaje de éxito
            finalMsg.classList.add('anim-bounce-up'); // Lo anima hacia arriba
        }
    }
}
// ===============================================
// LÓGICA MODELO SBI (SLIDE 28)
// ===============================================

function revealSBI(step) {
    const btn = document.getElementById(`btn-sbi-${step}`);
    const content = document.getElementById(`content-sbi-${step}`);

    if (!btn || !content) return;

    // 1. MATAR EL PARPADEO
    btn.classList.remove('js-init-pulse', 'pulse-attention'); // Ya lo tenías, pero asegúrate que esté así
    btn.classList.add('active');

    // ... (Resto de tu lógica) ...
    content.classList.add('show');

    const nextStep = step + 1;
    const nextBtn = document.getElementById(`btn-sbi-${nextStep}`);

    if (nextBtn) {
        setTimeout(() => {
            nextBtn.classList.remove('locked');
            nextBtn.classList.add('pulse-attention');
        }, 500);
    } else if (step === 3) {
        setTimeout(() => {
            const exampleSection = document.getElementById('sbi-example-section');
            if (exampleSection) {
                exampleSection.classList.remove('hidden');
                exampleSection.classList.add('anim-bounce-up');
            }
        }, 800);
    }
}

function revealSBIExample() {
    const btn = document.getElementById('btn-sbi-example');
    const content = document.getElementById('content-sbi-example');

    if (btn) {
        btn.style.display = 'none'; // Ocultar botón tras clic
    }

    if (content) {
        content.classList.remove('hidden');
        // Scroll suave hacia el ejemplo
        content.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ===============================================
// LÓGICA SLIDE 29 (REVEAL SIMPLE)
// ===============================================

function revealS29Content() {
    const controlsDiv = document.getElementById('s29-controls');
    const hiddenExample = document.getElementById('s29-hidden-example');

    if (hiddenExample) {
        // 1. Ocultar botón e instrucción (display: none hace que dejen de ocupar espacio)
        if (controlsDiv) controlsDiv.style.display = 'none';

        // 2. Mostrar el ejemplo (display: block hace que ocupe espacio y empuje lo de abajo)
        hiddenExample.classList.remove('hidden');

        // 3. Scroll suave para asegurar que se vea todo
        setTimeout(() => {
            hiddenExample.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}

// ===============================================
// LÓGICA EVALUACIÓN FINAL (SLIDE 35)
// ===============================================

/* ===============================================
   INTENTOS DE LA EVALUACIÓN FINAL
   Se permiten 3. El contador vive en cmi.suspend_data (libre en este
   curso) para que el límite sobreviva al cierre del navegador; sin LMS
   se degrada a un contador en memoria que solo dura la sesión.
   =============================================== */
const FINAL_EXAM_MAX_ATTEMPTS = 3;
let finalExamAttemptsLocal = 0;

function getFinalExamAttempts() {
    try {
        if (typeof scorm !== 'undefined' && scorm.connection.isActive) {
            const raw = scorm.get('cmi.suspend_data');
            if (raw) {
                const data = JSON.parse(raw);
                if (data && typeof data.examAttempts === 'number') return data.examAttempts;
            }
        }
    } catch (e) { }
    return finalExamAttemptsLocal;
}

function setFinalExamAttempts(n) {
    finalExamAttemptsLocal = n;
    try {
        if (typeof scorm !== 'undefined' && scorm.connection.isActive) {
            let data = {};
            const raw = scorm.get('cmi.suspend_data');
            if (raw) { try { data = JSON.parse(raw) || {}; } catch (e) { data = {}; } }
            data.examAttempts = n;
            scorm.set('cmi.suspend_data', JSON.stringify(data));
            scorm.save();
        }
    } catch (e) { }
}

function finalExamAttemptsLeft() {
    return Math.max(0, FINAL_EXAM_MAX_ATTEMPTS - getFinalExamAttempts());
}

function startFinalEvaluation() {
    const container = document.getElementById('quiz-final');
    if (!container) return;

    // La intro es la del propio slide del examen (antes estaba fijada a #slide-35).
    const slide = container.closest('.slide');
    const intro = slide ? slide.querySelector('.quiz-intro') : null;
    const resultsDiv = document.getElementById('final-results-screen');

    // Re-bloquear Avanzar: el examen empieza de nuevo, aún no está aprobado.
    finalExamPassed = false;
    updateNavigation();

    if (intro) intro.style.display = 'none';
    if (resultsDiv) {
        resultsDiv.style.display = 'none';
        resultsDiv.classList.remove('visible');
    }

    container.style.display = 'flex';
    container.classList.add('visible');

    // Resetear puntaje
    allQuizDefinitions['quiz-final'].correctAnswerCount = 0;

    // Reactivar todas las preguntas de todos los pasos
    container.querySelectorAll('.final-question').forEach(q => {
        q.classList.remove('answered');
        q.querySelectorAll('input').forEach(i => { i.disabled = false; i.checked = false; });
        const btn = q.querySelector('.final-submit-btn');
        if (btn) btn.style.display = '';
    });

    // Mostrar el primer paso
    const allSteps = container.querySelectorAll('.final-step');
    allSteps.forEach(s => s.classList.remove('active'));
    if (allSteps.length > 0) allSteps[0].classList.add('active');
}

function nextFinalStep() {
    const container = document.getElementById('quiz-final');
    const currentStep = container.querySelector('.final-step.active');

    // Pausar video si había uno
    const video = currentStep.querySelector('video');
    if (video) video.pause();

    // Ocultar actual
    currentStep.classList.remove('active');

    // Mostrar siguiente
    const nextStep = currentStep.nextElementSibling;

    if (nextStep && nextStep.classList.contains('final-step')) {
        nextStep.classList.add('active');
    } else {
        // SI NO HAY MÁS PASOS -> FINALIZAR
        finishFinalExam();
    }
}

/**
 * Contesta una pregunta del examen final.
 * El examen va de una pantalla en una: cada caso tiene la suya (con su botón
 * Continuar) y cada pregunta la suya, así que normalmente hay una sola
 * .final-question por .final-step. Aun así se evalúa la pregunta concreta
 * desde la que se pulsó el botón, no el paso entero, para que el paso pueda
 * contener varias sin cambiar nada.
 * Al contestar se bloquean sus opciones (no se puede corregir) y se muestra
 * la retro; si el reactivo no tuviera texto de retro, sale solo el título
 * de correcto/incorrecto.
 * Al cerrar la retro pasa a la siguiente pantalla; si el paso tuviera más
 * preguntas pendientes, salta a la siguiente antes de avanzar.
 * @param {HTMLElement} btn - El botón pulsado dentro de la .final-question.
 */
function submitFinalAnswer(btn) {
    const quizId = 'quiz-final';
    const quizDef = allQuizDefinitions[quizId];
    const container = document.getElementById(quizId);
    const activeStep = container.querySelector('.final-step.active');
    if (!activeStep) return;

    // La pregunta es la que contiene al botón. Si no se pasó botón (por
    // compatibilidad), se toma la primera sin contestar del paso.
    const question = (btn && btn.closest('.final-question'))
        || activeStep.querySelector('.final-question:not(.answered)');
    if (!question || question.classList.contains('answered')) return;

    const qId = question.getAttribute('data-question-id');
    const selected = question.querySelector('input:checked');

    if (!selected) {
        showPopupFeedback('Atención', 'Selecciona una opción.', 'alerta');
        return;
    }

    // Bloquear esta pregunta: ya no se puede cambiar la respuesta
    question.classList.add('answered');
    question.querySelectorAll('input').forEach(i => i.disabled = true);
    const submitBtn = question.querySelector('.final-submit-btn');
    if (submitBtn) submitBtn.style.display = 'none';

    // Evaluar
    const isCorrect = selected.value === quizDef.questions[qId].answer;
    if (isCorrect) quizDef.correctAnswerCount++;

    // Texto de retro: primero el específico de la opción, si no el 'default'.
    // Si no hay ninguno, queda vacío y el popup muestra solo el título.
    let feedbackText = "";
    const fb = quizDef.questions[qId].feedback;
    if (fb && fb[selected.value]) {
        feedbackText = fb[selected.value];
    } else if (fb && fb['default']) {
        feedbackText = fb['default'];
    }

    const type = isCorrect ? 'success' : 'error';
    const title = isCorrect ? '¡Muy bien!' : 'Respuesta incorrecta';

    showPopupFeedback(title, feedbackText, type, () => {
        // ¿Quedan preguntas sin contestar en este caso?
        const pending = activeStep.querySelector('.final-question:not(.answered)');
        if (pending) {
            pending.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            nextFinalStep();
        }
    });
}

function finishFinalExam() {
    const quizId = 'quiz-final';
    const quizDef = allQuizDefinitions[quizId];
    const score = quizDef.correctAnswerCount * 10;
    const passed = score >= 80;

    // 1. Actualizar estado global: Avanzar solo se desbloquea si se aprobó.
    // Si reprobó, sigue bloqueado (debe reintentar o volver al inicio).
    finalExamPassed = passed;
    updateNavigation();

    // 2. Mostrar resultados
    const container = document.getElementById(quizId);
    const resultsDiv = document.getElementById('final-results-screen');

    container.style.display = 'none';
    resultsDiv.style.display = 'flex';
    resultsDiv.classList.add('visible');

    // 3. Registrar el intento consumido y ver cuántos quedan
    const attemptsUsed = getFinalExamAttempts() + 1;
    setFinalExamAttempts(attemptsUsed);
    const attemptsLeft = Math.max(0, FINAL_EXAM_MAX_ATTEMPTS - attemptsUsed);

    let title, msg, colorClass, htmlBotones, htmlIntentos = '';

    if (passed) {
        // --- APROBADO --- No se ofrece reintentar: la evaluación está superada.
        colorClass = "passed-score";
        if (score === 100) {
            title = `<div style="text-align: center;">¡Excelente resultado! <br>100 Puntos`;
            msg = "Dominio completo del contenido. ¡Felicidades! Haz clic en la flecha 'Avanzar' para finalizar.";
        } else {
            title = `<div style="text-align: center;">¡Aprobado! <br>${score} Puntos`;
            msg = "Superaste la evaluación final del curso. Haz clic en la flecha 'Avanzar' para finalizar.";
        }
        htmlBotones = ``;

    } else if (attemptsLeft > 0) {
        // --- REPROBADO, quedan intentos (1.º y 2.º) ---
        title = `<div style="text-align: center;">No aprobado <br>${score} Puntos`;
        msg = "Se requieren 80 puntos para aprobar. Repasa el contenido y vuelve a intentarlo.";
        colorClass = "failed-score";
        htmlIntentos = `<p style="margin:10px 0; font-weight:bold;">Te ${attemptsLeft === 1 ? 'queda 1 intento' : `quedan ${attemptsLeft} intentos`}.</p>`;
        htmlBotones = `
            <button class="nav-button primary-blue-btn" onclick="retryFinalExam()">Intentar de nuevo</button>
        `;

    } else {
        // --- REPROBADO y sin intentos: solo queda repasar el curso ---
        title = `<div style="text-align: center;">No aprobado <br>${score} Puntos`;
        msg = "Has agotado los 3 intentos disponibles. Te invitamos a revisar de nuevo el contenido del curso.";
        colorClass = "failed-score";
        htmlBotones = `
            <button class="nav-button primary-blue-btn" onclick="showSlide(0); resetFinalExamUI();">Volver a ver el curso</button>
        `;
    }

    resultsDiv.innerHTML = `
        <div class="quiz-results-box anim-target anim-bounce-up">
            <h2 class="${colorClass}" style="font-size: 2.5em;">${title}</h2>
            <p style="margin: 20px 0;">${msg}</p>
            ${htmlIntentos}
            <div style="margin-top: 30px; display: flex; justify-content: center; flex-wrap: wrap; gap: 10px;">
                ${htmlBotones}
            </div>
        </div>
    `;

    if (typeof reportScoreToLMS === "function") {
        reportScoreToLMS(score, passed);
    }
}

/**
 * Reintenta la evaluación final. Solo se ofrece si se reprobó y quedan
 * intentos; el contador ya se incrementó en finishFinalExam().
 * El reinicio es idéntico al arranque, así que se reutiliza
 * startFinalEvaluation() en lugar de duplicar la limpieza.
 */
function retryFinalExam() {
    if (finalExamAttemptsLeft() <= 0) return;
    startFinalEvaluation();
}

// Función para resetear visualmente la Evaluación Final al entrar al slide
function resetFinalExamUI() {
    // 1. Elementos
    const intro = document.getElementById('final-intro');
    const container = document.getElementById('quiz-final');
    const resultsDiv = document.getElementById('final-results-screen');

    // Re-bloquear Avanzar: vuelve a la intro, aún no está aprobado.
    finalExamPassed = false;

    // 2. OCULTAR RESULTADOS Y PREGUNTAS
    if (resultsDiv) {
        resultsDiv.classList.remove('visible');
        resultsDiv.style.display = 'none';
    }

    if (container) {
        container.classList.remove('visible');
        container.style.display = 'none';

        // Pausar videos
        container.querySelectorAll('video').forEach(v => {
            v.pause();
            v.currentTime = 0;
        });

        // 3. RESETEAR PASOS INTERNOS (CRÍTICO: Volver al Video 1)
        const allSteps = container.querySelectorAll('.final-step');
        allSteps.forEach(step => step.classList.remove('active'));

        // Activar el primer paso
        const firstStep = container.querySelector('#step-video-1') || allSteps[0];
        if (firstStep) firstStep.classList.add('active');

        // Limpiar inputs
        container.querySelectorAll('input').forEach(i => {
            i.checked = false;
            i.disabled = false;
        });

        // Restaurar botones y desmarcar las preguntas ya contestadas
        container.querySelectorAll('.submit-answer-btn').forEach(btn => btn.style.display = 'inline-block');
        container.querySelectorAll('.final-question').forEach(q => q.classList.remove('answered'));
        container.querySelectorAll('.final-submit-btn').forEach(btn => btn.style.display = '');
    }

    // 4. MOSTRAR INTRODUCCIÓN (SOLUCIÓN AL PROBLEMA VISUAL)
    if (intro) {
        intro.style.display = 'flex';
        intro.style.opacity = '1';

        const box = intro.querySelector('.intro-box');
        if (box) {
            // A. Matamos la animación actual
            box.style.animation = 'none';

            // B. Forzamos al navegador a "darse cuenta" (Reflow)
            void box.offsetWidth;

            // C. Inyectamos la animación directamente en el estilo (Gana a cualquier CSS)
            box.style.animation = 'slideInLeftBounce 1s ease-out forwards';
        }
    }

    // 5. Resetear variables
    if (allQuizDefinitions && allQuizDefinitions['quiz-final']) {
        allQuizDefinitions['quiz-final'].correctAnswerCount = 0;
    }
}

function exitCourse() {
    // 1. Mandar datos y cerrar sesión SCORM (Tu función ya hace Commit y Finish)
    finishSCORM();

    // 2. Intentar ceder el control al LMS (Mejora de Rustici)
    // Esto ayuda en LMS que no permiten window.close directo
    if (typeof SD !== 'undefined') {
        SD.ConcedeControl();
    }

    // 3. Fallback manual (Tu código original, por si el LMS no responde)
    setTimeout(() => {
        window.close();
        top.window.close();
        parent.window.close();

        // Si el navegador bloquea el cierre, avisar al usuario
        if (!window.closed) {
            alert("Los datos se han guardado correctamente. Puedes cerrar esta pestaña manualmente.");
        }
    }, 500);
}

/* ==========================================
   SUPER VIGILANTE: CONFETI Y RESETEO FINAL
   ========================================== */
function limpiarConfeti() {
    const existing = document.querySelectorAll('.confetti-piece');
    existing.forEach(el => el.remove());
}
// 1. Función de Confeti (Ya la tenías, la dejamos igual)
function lanzarConfeti() {
    const colors = ['#ec633c', '#22335e', '#F05587', '#03b6dc', '#6c3b8f', '#fcda32', '#7dbb4b'];
    const particleCount = 100;

    for (let i = 0; i < particleCount; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti-piece');
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

        const duration = Math.random() * 3 + 2;
        confetti.style.animationDuration = duration + 's';
        confetti.style.animationDelay = Math.random() * 2 + 's';

        const size = Math.random() * 7 + 8;
        confetti.style.width = size + 'px';
        confetti.style.height = size + 'px';

        document.body.appendChild(confetti);

        setTimeout(() => { confetti.remove(); }, duration * 1000 + 2000);
    }
}



// Variable para saber en qué paso de la conversación vamos
let conversationStep = 0;

function handleConversation(character) {
    // Referencias a elementos
    const btnWoman = document.getElementById('btn-woman');
    const btnMan = document.getElementById('btn-man');

    const bubbleWoman1 = document.getElementById('bubble-woman-1');
    const bubbleWoman2 = document.getElementById('bubble-woman-2');
    const bubbleMan1 = document.getElementById('bubble-man-1');

    // Lógica de pasos
    if (character === 'woman') {

        // --- PASO 1: ARRANQUE (Habla ella) ---
        if (conversationStep === 0) {
            bubbleWoman1.classList.remove('hidden'); // Sale globo 1 ella
            btnWoman.classList.add('hidden');        // Se va botón ella

            // Esperamos 1 seg y mostramos el botón de él
            setTimeout(() => {
                btnMan.classList.remove('hidden');
                btnMan.classList.add('anim-bounce-up');
            }, 1000);

            conversationStep = 1;
        }

        // --- PASO 3: CIERRE (Ella termina) ---
        else if (conversationStep === 2) {
            // AQUI ES EL CAMBIO:
            // Al dar clic en ella por 2da vez, borramos el globo de él (que seguía visible)
            bubbleMan1.classList.add('hidden');

            // Y mostramos el final de ella
            bubbleWoman2.classList.remove('hidden');
            btnWoman.classList.add('hidden'); // Ya no hay más botones

            // FIN DE LA INTERACCIÓN
        }
    }
    else if (character === 'man') {

        // --- PASO 2: RESPUESTA (Habla él) ---
        if (conversationStep === 1) {
            bubbleWoman1.classList.add('hidden'); // Adiós globo 1 ella
            bubbleMan1.classList.remove('hidden'); // Hola globo él
            btnMan.classList.add('hidden'); // Adiós botón él

            // CAMBIO IMPORTANTE:
            // Ya NO ocultamos el globo de él automáticamente.
            // Solo esperamos un poco para mostrar el botón de ella nuevamente.
            setTimeout(() => {
                // El globo de él SIGUE VISIBLE aquí
                btnWoman.classList.remove('hidden'); // Regresa el turno a ella
                btnWoman.classList.add('anim-bounce-up');
            }, 1500); // 1.5 seg para que el usuario lea un poco antes de ver el botón

            conversationStep = 2; // Listos para el cierre
        }
    }
}


// ===============================================
// INICIO
// ===============================================
document.addEventListener('DOMContentLoaded', initializeCourse);
window.addEventListener('unload', finishSCORM);
window.addEventListener('pagehide', finishSCORM);