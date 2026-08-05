case: El operador pide una revision de un cambio terminado y el skill prepara la solicitud en las cinco fases sin auto-despachar, auto-publicar ni mezclar la sesion del coordinador con la del revisor.
context: Feature terminada con SHAs base y cabeza disponibles, plan o requisitos conocidos, alcance declarado.
request: >-
Pide una revision de codigo para la feature de validacion de indice que acabo
de terminar. Son dos commits: a7981ec a 3df7661. Toca verifyIndex() y
repairIndex() con 4 tipos de issue. El plan es el Task 2 de
deployment-plan.md. Quiero saber si hay edge cases sin cubrir y si el
contrato nuevo responde a los requisitos.
expect:

- El skill prepara la solicitud fase por fase y entrega el contexto en prosa.
- Declarar alcance: nombra la feature, los archivos toca y los SHAs base (a7981ec) y cabeza (3df7661).
- Construir contexto: resume que se construyo (verifyIndex y repairIndex con 4 tipos de issue), enlaza el plan (Task 2 de deployment-plan.md) y acota archivos clave; no vuelca la sesion del coordinador.
- Formular preguntas especificas: pregunta por edge cases sin cubrir y por la adherencia del contrato nuevo a los requisitos; cada pregunta lleva intencion y limite.
- Decidir cuando abrir: declara que la revision es obligatoria antes de avanzar y que no se salta por simple.
- Procesar feedback: clasifica hallazgos en Critical (ya), Important (antes de avanzar) y Minor (despues); declara como se responde si el revisor se equivoca.
- El skill NO despacha, NO publica, NO ejecuta git, NO mezcla la sesion del coordinador con la del revisor; entrega la solicitud y espera confirmacion del operador.
