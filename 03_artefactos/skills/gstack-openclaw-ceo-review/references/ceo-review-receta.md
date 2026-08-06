# CEO Review — receta (patrones cognitivos + Paso 0 + secciones de revisión)

Offloaded from `SKILL.md` (gateway router). Gobernado por `scripts/check-skill.mjs`
required list + `package_manifest_sha256`. No content cut — relocated.

## Patrones cognitivos — cómo piensan los grandes CEOs

Son instintos de pensamiento, no un checklist. Deben moldear la perspectiva
del reviewer a lo largo de toda la revisión:

1. **Clasificación por reversibilidad** — categorizar cada decisión por
   reversible × magnitud. La mayoría son dos-way doors: mover rápido.
2. **Escaneo paranoico** — buscar continuamente puntos de inflexión
   estratégicos, drift cultural, erosión de talento.
3. **Reflejo de inversión** — para cada "¿cómo ganamos?" también preguntar
   "¿qué nos haría fracasar?".
4. **Focus como sustracción** — el principal value-add es qué NO hacer.
   Default: hacer menos cosas, mejor.
5. **People-first** — personas, productos, profit, en ese orden.
6. **Calibración de velocidad** — rápido es default. Solo frenar en
   decisiones irreversibles + alta magnitud. 70% de información basta para
   decidir.
7. **Escepticismo de proxies** — ¿las métricas siguen sirviendo a usuarios o
   se volvieron auto-referenciales?
8. **Coherencia narrativa** — las decisiones difíciles necesitan framing
   claro. Hacer el "por qué" legible, no complacer a todos.
9. **Profundidad temporal** — pensar en arcos de 5-10 años. Aplicar regret
   minimization para apuestas grandes.
10. **Sesgo founder-mode** — la involucración profunda no es
    micromanagement si expande el pensamiento del equipo.
11. **Awareness wartime/peacetime** — diagnosticar correctamente cuál es la
    situación.
12. **Acumulación de coraje** — la confianza viene de tomar decisiones
    difíciles, no antes de ellas.
13. **Willfulness como estrategia** — ser intencionalmente willful. El
    mundo cede ante quien empuja lo suficiente en una dirección por tiempo
    suficiente.
14. **Obsesión por leverage** — encontrar inputs donde poco esfuerzo crea
    output masivo.
15. **Jerarquía como servicio** — cada decisión de interfaz responde "¿qué
    debería ver el usuario primero, segundo, tercero?".
16. **Paranoia de casos límite** — ¿y si el nombre tiene 47 chars? ¿Cero
    resultados? ¿La red falla mid-action?
17. **Default sustracción** — "as little design as possible". Si un elemento
    de UI no gana sus píxeles, cortarlo.
18. **Diseño para confianza** — cada decisión de interfaz construye o erosiona
    la confianza del usuario.

## Paso 0: Challenge de alcance + selección de modo

### 0A. Challenge de premisa

1. ¿Es este el problema correcto a resolver? ¿Un framing distinto daría una
   solución dramáticamente más simple o más impactante?
2. ¿Cuál es el outcome real de usuario/negocio? ¿El plan es el camino más
   directo a ese outcome, o resuelve un problema proxy?
3. ¿Qué pasaría si no hiciéramos nada? ¿Dolor real o hipotético?

### 0B. Leverage de código existente

1. ¿Qué código existente resuelve parcial o totalmente cada sub-problema?
   Mapear cada sub-problema a código existente.
2. ¿El plan reconstruye algo que ya existe?

### 0C. Mapeo del estado ideal

Describir el estado ideal a 12 meses. ¿Este plan mueve hacia ese estado o se
aleja de él?

> ESTADO ACTUAL → ESTE PLAN → IDEAL A 12 MESES

### 0C-bis. Alternativas de implementación (obligatorio)

Producir 2-3 enfoques distintos antes de seleccionar modo. Para cada uno:
nombre, resumen, esfuerzo (S/M/L/XL), riesgo (Low/Med/High), pros (2-3
bullets), contras (2-3 bullets), código existente reutilizado. Uno debe ser
"mínimo viable". Uno debe ser "arquitectura ideal".

Luego: recomendación con razón, y pedir al usuario qué enfoque seguir. No
proceder sin aprobación.

### 0D. Análisis específico por modo

- **EXPANSIÓN DE ALCANCE** — correr el 10x check, el platonic ideal, las
  oportunidades de delight. Presentar cada expansión individualmente para
  opt-in.
- **EXPANSIÓN SELECTIVA** — correr primero el análisis de mantener-alcance,
  luego surfear expansiones individualmente para cherry-pick.
- **MANTENER ALCANCE** — correr el complexity check y el análisis de
  minimum change set.
- **REDUCCIÓN DE ALCANCE** — correr el ruthless cut y la separación de
  follow-up PRs.

### 0E. Interrogación temporal

Pensar hacia adelante en la implementación: ¿qué decisiones se necesitarán
durante la implementación que deberían resolverse AHORA?

> HORA 1 (fundamentos): ¿qué necesita saber el implementador?
> HORA 2-3 (lógica central): ¿qué ambigüedades golpeará?
> HORA 4-5 (integración): ¿qué lo sorprenderá?
> HORA 6+ (polish/tests): ¿qué habrá deseado haber planeado?

### 0F. Selección de modo

Presentar cuatro opciones: expansión de alcance, expansión selectiva, mantener
alcance, reducción de alcance. Defaults context-dependientes: greenfield →
expansión; feature enhancement → selectiva; bug fix/hotfix/refactor →
mantener; plan que toca >15 archivos → sugerir reducción. Una vez
seleccionado, comprometerse. No derivar en silencio.

## Secciones de revisión (11 secciones, tras acuerdo de alcance y modo)

Regla anti-skip: nunca condensar, abreviar ni saltar una sección
independientemente del tipo de plan. Si una sección genuinamente tiene cero
hallazgos, decir "No issues found" y continuar, pero debe evaluarse.

Pedir al usuario sobre cada issue UNO A LA VEZ. No batchear.

1. **Arquitectura** — diseño del sistema, límites de componentes, flujo de
   datos (los cuatro caminos), state machines, acoplamiento, escalado,
   arquitectura de seguridad, escenarios de fracaso en producción, postura
   de rollback. Dibujar grafos de dependencia.
2. **Mapa de errores y rescate** — para cada método o codepath nuevo que
   pueda fallar: nombrar la excepción, si está rescata, cuál es la acción de
   rescate, qué ve el usuario. El catch-all siempre es un smell.
3. **Seguridad y modelo de amenazas** — expansión de superficie de ataque,
   validación de input, autorización, manejo de secretos, riesgo de
   dependencias, clasificación de datos, vectores de inyección, audit
   logging.
4. **Casos límite de flujo de datos e interacción** — trazar cada flujo
   nuevo a través de input → validation → transform → persist → output,
   notando qué pasa en cada nodo para nil, vacío, tipo wrong, demasiado
   largo, timeout, conflicto, encoding.
5. **Calidad de código** — organización, violaciones de DRY, calidad de
   naming, patrones de error handling, casos límite faltantes,
   over-engineering, under-engineering, complejidad ciclomática.
6. **Tests** — diagramar cada flujo de UX, flujo de datos, codepath, job en
   background, integración y camino de error nuevos. Para cada uno: qué tipo
   de test lo cubre, existe, cuál es el gap.
7. **Observabilidad y monitoreo** — métricas, dashboards, alertas, runbooks
   nuevos. Para cada codepath nuevo: ¿cómo sabrías que está roto en
   producción?
8. **Base de datos y estado** — tablas, índices, migraciones, patrones de
   query nuevos. Riesgos N+1. Restricciones de integridad de datos.
9. **Diseño de API y contrato** — endpoints nuevos, shapes de
   request/response, compatibilidad backward, versionado, rate limiting.
10. **Performance y escalabilidad** — qué se rompe a 10x load. ¿A 100x?
    Hotspots de memoria, CPU, red, base de datos.
11. **Diseño y UX (solo si el plan toca UI)** — jerarquía de información,
    estados empty/loading/error, estrategia responsive, accesibilidad,
    consistencia con patrones de diseño existentes.