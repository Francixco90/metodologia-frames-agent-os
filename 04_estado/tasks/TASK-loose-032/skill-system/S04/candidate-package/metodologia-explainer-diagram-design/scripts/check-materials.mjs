import {CheckError, assertUniqueSemanticRelations, canonicalRelationKey, fail, sha} from './check-core.mjs';

export const materialAttackCases = `zero-material-hash arbitrary-reason-code spec-schema-drift beat-schema-drift total-frames-drift fps-drift
method-id-drift fixture-method-ref-mismatch beat-binding-drift relation-kind-grammar-mismatch radial-disconnected radial-overlap radial-crossing
edge-through-node collinear-edge-overlap flow-cycle flow-disconnected relation-self-loop radial-semantic-duplicate flow-semantic-duplicate
reverse-bidirectional-semantic-duplicate cross-kind-visual-projection-duplicate`.split(/\s+/u);
// prettier-ignore
const methodBeats = new Map([['PASA',['PLANIFICA','ACELERA','SISTEMATIZA','AMPLIFICA']],['PIVOTE',['PERSONAS','INTERACCIONES','VALOR','ORDEN','TECNOLOGIA','EVOLUCION']]]);
// prettier-ignore
const reasonCodes = new Map([['flow','SEQUENTIAL_CAUSAL_RELATIONS'],['radial-lenses','INTERDEPENDENT_REINFORCING_RELATIONS']]);
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sorted = (items) =>
  [...items].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

export const validatorInput = (fixture) =>
  JSON.stringify({
    schema_version: fixture.schema_version,
    total_frames: fixture.total_frames,
    expected_spec_sha256: fixture.expected_spec_sha256,
    expected_beat_budget_sha256: fixture.expected_beat_budget_sha256,
    diagram: fixture.diagram,
  });
const derivedGrammar = (relations) => {
  if (!Array.isArray(relations) || relations.length === 0) fail('CHECK_RELATION_EVIDENCE');
  if (relations.every(({kind}) => kind === 'sequence' || kind === 'enables')) return 'flow';
  if (relations.every(({kind}) => kind === 'reinforces')) return 'radial-lenses';
  return fail('CHECK_RELATION_KIND_NOT_ALLOWED');
};
const assertGraph = (fixture, relations) => {
  const ids = fixture.diagram.nodes.map(({id}) => id);
  const beats = methodBeats.get(fixture.synthetic_materials.spec.method_id);
  if (!beats || !equal(fixture.synthetic_materials.beat_budget.beat_ids, beats))
    fail('CHECK_METHOD_BEAT_BINDING');
  if (!equal(ids, beats.map((id) => `NODE-${id}`))) fail('CHECK_METHOD_BEAT_BINDING');
  const adjacency = new Map(ids.map((id) => [id, new Set()]));
  const indegree = new Map(ids.map((id) => [id, 0]));
  assertUniqueSemanticRelations(relations);
  for (const relation of relations) {
    if (!adjacency.has(relation.source) || !adjacency.has(relation.target))
      fail('CHECK_GRAPH_ENDPOINT');
    adjacency.get(relation.source).add(relation.target);
    adjacency.get(relation.target).add(relation.source);
    indegree.set(relation.target, indegree.get(relation.target) + 1);
  }
  const seen = new Set([ids[0]]);
  for (const queue = [ids[0]]; queue.length > 0; )
    for (const next of adjacency.get(queue.shift()))
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
  if (seen.size !== ids.length)
    fail(fixture.diagram.grammar === 'flow' ? 'CHECK_FLOW_GRAPH' : 'CHECK_RADIAL_GRAPH');
  if (fixture.diagram.grammar === 'radial-lenses') {
    if (relations.some(({direction}) => direction !== 'bidirectional')) fail('CHECK_RADIAL_GRAPH');
    if (relations.length < ids.length || [...adjacency.values()].some((links) => links.size < 2))
      fail('CHECK_RADIAL_GRAPH');
    return;
  }
  if (relations.some(({direction}) => direction !== 'forward')) fail('CHECK_FLOW_GRAPH');
  const queue = ids.filter((id) => indegree.get(id) === 0);
  let visited = 0;
  for (; queue.length > 0; visited += 1) {
    const current = queue.shift();
    for (const relation of relations.filter(({source}) => source === current)) {
      indegree.set(relation.target, indegree.get(relation.target) - 1);
      if (indegree.get(relation.target) === 0) queue.push(relation.target);
    }
  }
  if (visited !== ids.length) fail('CHECK_FLOW_GRAPH');
};
const assertGeometry = ({nodes, edges}) => {
  const byId = new Map(nodes.map((node) => [node.id, node.bounds]));
  for (let left = 0; left < nodes.length; left += 1)
    for (let right = left + 1; right < nodes.length; right += 1) {
      const a = nodes[left].bounds;
      const b = nodes[right].bounds;
      if (
        a.x < b.x + b.width && a.x + a.width > b.x &&
        a.y < b.y + b.height && a.y + a.height > b.y
      ) fail('CHECK_DIAGRAM_GEOMETRY');
    }
  const center = (id) => {
    const box = byId.get(id);
    return {x: box.x + box.width / 2, y: box.y + box.height / 2};
  };
  const turn = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const on = (a, b, c) => turn(a,b,c) === 0 && c.x >= Math.min(a.x,b.x) && c.x <= Math.max(a.x,b.x) && c.y >= Math.min(a.y,b.y) && c.y <= Math.max(a.y,b.y);
  const crosses = (a,b,c,d) => {
    const [abC,abD,cdA,cdB] = [turn(a,b,c),turn(a,b,d),turn(c,d,a),turn(c,d,b)];
    return abC*abD < 0 && cdA*cdB < 0 || on(a,b,c) || on(a,b,d) || on(c,d,a) || on(c,d,b);
  };
  for (const edge of edges) for (const node of nodes) {
    if (node.id === edge.source || node.id === edge.target) continue;
    const a=center(edge.source), b=center(edge.target), r=node.bounds;
    const corners=[{x:r.x,y:r.y},{x:r.x+r.width,y:r.y},{x:r.x+r.width,y:r.y+r.height},{x:r.x,y:r.y+r.height}];
    if (corners.some((corner,index) => crosses(a,b,corner,corners[(index+1)%4]))) fail('CHECK_DIAGRAM_GEOMETRY');
  }
  for (let left = 0; left < edges.length; left += 1)
    for (let right = left + 1; right < edges.length; right += 1) {
      const a = edges[left];
      const b = edges[right];
      if ([a.source, a.target].some((id) => id === b.source || id === b.target)) continue;
      if (crosses(center(a.source), center(a.target), center(b.source), center(b.target)))
        fail('CHECK_DIAGRAM_GEOMETRY');
    }
};

export const assertPositiveFixture = (fixture, expectedMethod) => {
  const materials = fixture.synthetic_materials;
  if (!materials?.spec || !materials?.beat_budget || !materials?.method_relations)
    fail('CHECK_SYNTHETIC_MATERIALS');
  if (expectedMethod && materials.spec.method_id !== expectedMethod) fail('CHECK_METHOD_BEAT_BINDING');
  const specHash = sha(materials.spec);
  const budgetHash = sha(materials.beat_budget);
  if (
    fixture.expected_spec_sha256 !== specHash || fixture.diagram.spec_sha256 !== specHash ||
    fixture.expected_beat_budget_sha256 !== budgetHash ||
    fixture.diagram.beat_budget_sha256 !== budgetHash || /^0{64}$/u.test(specHash) ||
    /^0{64}$/u.test(budgetHash)
  ) fail('CHECK_MATERIAL_HASH_BINDING');
  if (
    materials.spec.schema_version !== 'synthetic-explainer-spec-v1' ||
    materials.beat_budget.schema_version !== 'synthetic-beat-budget-v1' ||
    materials.spec.total_frames !== fixture.total_frames ||
    materials.beat_budget.total_frames !== fixture.total_frames ||
    materials.beat_budget.fps !== 30 || materials.spec.format !== '9:16'
  ) fail('CHECK_TIMING_BINDING');
  const grammar = derivedGrammar(materials.method_relations);
  if (grammar !== fixture.diagram.grammar) fail('CHECK_GRAMMAR_SELECTION_EVIDENCE');
  assertGraph(fixture, materials.method_relations);
  assertGeometry(fixture.diagram);
  const project = ({source, target, direction}) => ({source, target, direction});
  const relations = sorted(materials.method_relations.map(project));
  const edges = sorted(fixture.diagram.edges.map(project));
  const visualKey = (item) => canonicalRelationKey({...item, kind: 'VISUAL'});
  if (new Set(materials.method_relations.map(visualKey)).size !== materials.method_relations.length || new Set(fixture.diagram.edges.map(visualKey)).size !== fixture.diagram.edges.length)
    fail('CHECK_VISUAL_PROJECTION_DUPLICATE');
  const wrongReason = fixture.selection_evidence?.reason_code !== reasonCodes.get(grammar);
  if (
    fixture.selection_evidence?.relations_sha256 !== sha(materials.method_relations) ||
    fixture.selection_evidence?.selected_grammar !== grammar || wrongReason || !equal(relations, edges)
  ) fail(wrongReason ? 'CHECK_REASON_CODE' : 'CHECK_GRAMMAR_SELECTION_EVIDENCE');
};
const expectAttack = (fixture, mutate, code, expectedMethod) => {
  const attack = structuredClone(fixture);
  mutate(attack);
  try {
    assertPositiveFixture(attack, expectedMethod);
    fail('CHECK_MATERIAL_ATTACK_ACCEPTED');
  } catch (error) {
    if (!(error instanceof CheckError) || error.code !== code) throw error;
  }
};
const bindSpec = (x) => (x.diagram.spec_sha256 = x.expected_spec_sha256 = sha(x.synthetic_materials.spec));
const bindBudget = (x) => (x.diagram.beat_budget_sha256 = x.expected_beat_budget_sha256 = sha(x.synthetic_materials.beat_budget));
const bindRelations = (x) => (x.selection_evidence.relations_sha256 = sha(x.synthetic_materials.method_relations));
const setRelations = (x, relations) => {
  x.synthetic_materials.method_relations = relations;
  x.diagram.edges = relations.map((relation, index) => ({
    id: `EDGE-ATTACK-${index}`, ...relation,
    start_frame: 306 + index * 18, end_frame: 322 + index * 18,
  }));
  x.diagram.required_poses.connectors_complete_frame = x.diagram.edges.at(-1).end_frame;
  bindRelations(x);
};
export const assertMaterialAttacks = (fixture) => {
  expectAttack(fixture, (x) => (x.expected_spec_sha256 = '0'.repeat(64)), 'CHECK_MATERIAL_HASH_BINDING');
  expectAttack(fixture, (x) => (x.selection_evidence.reason_code = 'ARBITRARY'), 'CHECK_REASON_CODE');
  expectAttack(fixture, (x) => { x.synthetic_materials.spec.schema_version = 'other'; bindSpec(x); }, 'CHECK_TIMING_BINDING');
  expectAttack(fixture, (x) => { x.synthetic_materials.beat_budget.schema_version = 'other'; bindBudget(x); }, 'CHECK_TIMING_BINDING');
  expectAttack(fixture, (x) => { x.synthetic_materials.spec.total_frames -= 1; bindSpec(x); }, 'CHECK_TIMING_BINDING');
  expectAttack(fixture, (x) => { x.synthetic_materials.beat_budget.fps = 29; bindBudget(x); }, 'CHECK_TIMING_BINDING');
  expectAttack(fixture, (x) => { x.synthetic_materials.spec.method_id = 'UNKNOWN'; bindSpec(x); }, 'CHECK_METHOD_BEAT_BINDING');
  expectAttack(fixture, () => undefined, 'CHECK_METHOD_BEAT_BINDING', fixture.synthetic_materials.spec.method_id === 'PASA' ? 'PIVOTE' : 'PASA');
  expectAttack(fixture, (x) => { x.synthetic_materials.beat_budget.beat_ids.reverse(); bindBudget(x); }, 'CHECK_METHOD_BEAT_BINDING');
  expectAttack(fixture, (x) => setRelations(x,[...x.synthetic_materials.method_relations,{...x.synthetic_materials.method_relations[0],target:x.synthetic_materials.method_relations[0].source}]), 'CHECK_RELATION_EVIDENCE');
  if (fixture.diagram.grammar === 'radial-lenses') assertRadialAttacks(fixture);
  else assertFlowAttacks(fixture);
};
const relation = (source, target, kind, direction) => ({source:`NODE-${source}`, target:`NODE-${target}`, kind, direction});
const assertRadialAttacks = (fixture) => {
  expectAttack(fixture, (x) => { x.synthetic_materials.method_relations[0].kind = 'sequence'; bindRelations(x); }, 'CHECK_RELATION_KIND_NOT_ALLOWED');
  const pairs = [['PERSONAS','INTERACCIONES'],['INTERACCIONES','VALOR'],['VALOR','PERSONAS'],['ORDEN','TECNOLOGIA'],['TECNOLOGIA','EVOLUCION'],['EVOLUCION','ORDEN']];
  expectAttack(fixture, (x) => setRelations(x, pairs.map(([a,b]) => relation(a,b,'reinforces','bidirectional'))), 'CHECK_RADIAL_GRAPH');
  expectAttack(fixture, (x) => setRelations(x,[...x.synthetic_materials.method_relations,{...x.synthetic_materials.method_relations[0]}]), 'CHECK_RELATION_EVIDENCE');
  expectAttack(fixture, (x) => { const edge=x.synthetic_materials.method_relations[0]; setRelations(x,[...x.synthetic_materials.method_relations,{...edge,source:edge.target,target:edge.source}]); }, 'CHECK_RELATION_EVIDENCE');
  expectAttack(fixture, (x) => (x.diagram.nodes[1].bounds = {...x.diagram.nodes[0].bounds}), 'CHECK_DIAGRAM_GEOMETRY');
  const old = [[.12,.18],[.63,.18],[.1,.38],[.65,.38],[.12,.58],[.63,.58]];
  expectAttack(fixture, (x) => x.diagram.nodes.forEach((node,index) => Object.assign(node.bounds,{x:old[index][0],y:old[index][1]})), 'CHECK_DIAGRAM_GEOMETRY');
  expectAttack(fixture, (x) => { x.diagram.nodes[5].bounds={x:.375,y:.4,width:.25,height:.08}; setRelations(x,[...x.synthetic_materials.method_relations,relation('PERSONAS','ORDEN','reinforces','bidirectional')]); }, 'CHECK_DIAGRAM_GEOMETRY');
  expectAttack(fixture, (x) => x.diagram.nodes.forEach((node,index) => Object.assign(node.bounds,{x:.375,y:.1+index*.13})), 'CHECK_DIAGRAM_GEOMETRY');
};
const assertFlowAttacks = (fixture) => {
  expectAttack(fixture, (x) => setRelations(x,[...x.synthetic_materials.method_relations,{...x.synthetic_materials.method_relations[0]}]), 'CHECK_RELATION_EVIDENCE');
  expectAttack(fixture, (x) => { const edge=x.synthetic_materials.method_relations[0]; setRelations(x,[...x.synthetic_materials.method_relations,{...edge,kind:edge.kind === 'sequence' ? 'enables' : 'sequence'}]); }, 'CHECK_VISUAL_PROJECTION_DUPLICATE');
  expectAttack(fixture, (x) => setRelations(x,[...x.synthetic_materials.method_relations,relation('AMPLIFICA','PLANIFICA','sequence','forward')]), 'CHECK_FLOW_GRAPH');
  expectAttack(fixture, (x) => setRelations(x,[relation('PLANIFICA','ACELERA','sequence','forward'),relation('SISTEMATIZA','AMPLIFICA','sequence','forward')]), 'CHECK_FLOW_GRAPH');
};
