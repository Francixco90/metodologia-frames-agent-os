// Generated P00-P09 projections and their single canonical template. [CONFIG]
const stageSlugs = [
  'definir-sistema',
  'curar-material',
  'investigar',
  'crear-brief',
  'calendarizar',
  'disenar-pieza',
  'crear-activos',
  'revisar',
  'editar',
  'distribuir',
] as const;

export const multimediaSchematicPaths = stageSlugs.map(
  (slug, stage) => `workflows/multimedia/p${String(stage).padStart(2, '0')}-${slug}/schematic.html`,
);

export const multimediaGeneratedPaths = [
  ...multimediaSchematicPaths,
  'workflows/multimedia/_assets/multimedia-library.md',
  'workflows/multimedia/_assets/multimedia-library.html',
] as const;

export const multimediaTemplateBindings = multimediaSchematicPaths.map((output_path) => ({
  output_path,
  template_path: 'workflows/multimedia/_assets/schematic-template.html',
}));
