---
schema_version: career-template-v1
template_id: TPL-C06-CAREER-CV
workflow_id: C06
state: DRAFT
next_gate: CR_CV_SPEC_APPROVED
---

# CV Spec-First Source

## 1. Autoridad de spec

`cv-spec-v1`, `spec_sha256`, intent, variante y aprobación humana exacta antes de compilar.

## 2. Encabezado y contacto

Nombre, headline y binding privado autorizado; PII no se versiona en la spec pública.

## 3. BLUF profesional

Valor principal en las primeras líneas, sustentado por evidencia seleccionada.

## 4. Experiencia y logros

Orden recruiter-first, cronología preservada y cada claim ligado a Evidence IDs y hashes.

## 5. Capacidades y keywords

Taxonomía ATS fiel; requisito de vacante no equivale a capacidad.

## 6. Formación y credenciales

Programa, institución, estado y fecha con claim proporcional.

## 7. Omisiones y gaps

Registrar exclusiones, tratamiento `qualify|omit|block` y límites de atribución.

## 8. Matriz de variantes

Idioma, audiencia, formatos, presupuesto de páginas y perfil visual por variante.

## 9. Compilación

La fuente v2 deriva de spec aprobada y evidence bank vigente; no se edita como autoridad.

## 10. Proyecciones y paridad

Claims y orden semántico equivalentes en ATS HTML/DOCX/PDF y HTML ejecutivo solicitados.

## 11. ATS y accesibilidad

Texto seleccionable, jerarquía lineal, contraste y cero contenido solo gráfico.

## 12. Estado y gates

Primero `CR_CV_SPEC_APPROVED`; derivados quedan `RENDERED_DRAFT` hasta `CR_PACKAGE_APPROVED`.
