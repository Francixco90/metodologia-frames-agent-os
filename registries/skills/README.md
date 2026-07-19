# Skill registry

El registro usa eventos append-only. Promover una skill exige la secuencia
`candidate → quarantined → evaluated → active`; retirar una skill añade `active → deprecated`.

Una skill en `quarantined` puede conservarse para auditoría, pero no ejecutarse ni resolver triggers
de producción. Cambiar `SKILL.md` crea una nueva versión y un nuevo hash; nunca se reescribe un
evento anterior.
