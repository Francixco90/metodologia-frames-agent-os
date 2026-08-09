/** Parse the fixture subset: scalars, folded blocks, and indented lists. */
export function parseSimpleYml(text) {
  const lines = text.split('\n');
  const result = {};
  let index = 0;
  while (index < lines.length) {
    const raw = lines[index];
    const match = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/u.exec(raw);
    if (!match) {
      index += 1;
      continue;
    }
    const [, key, rest] = match;
    if (rest === '') {
      const items = [];
      index += 1;
      while (index < lines.length && /^\s/u.test(lines[index])) {
        const value = lines[index].trim();
        if (value !== '') items.push(value.startsWith('- ') ? value.slice(2) : value);
        index += 1;
      }
      result[key] = items.length > 0 ? items : {};
      continue;
    }
    if (['>', '>-', '|'].includes(rest) || rest.startsWith('> ')) {
      const parts = rest.startsWith('> ') ? [rest.slice(2)] : [];
      index += 1;
      while (index < lines.length && (/^\s/u.test(lines[index]) || lines[index].trim() === '')) {
        const value = lines[index].trim();
        if (value !== '') parts.push(value);
        index += 1;
      }
      result[key] = parts.join(' ');
      continue;
    }
    if (rest.startsWith('- ')) {
      const items = [rest.slice(2)];
      index += 1;
      while (index < lines.length) {
        const line = lines[index];
        const item = /^\s*-\s+(.*)$/u.exec(line);
        if (item) items.push(item[1]);
        else if (/^\s\S/u.test(line)) items[items.length - 1] += ` ${line.trim()}`;
        else break;
        index += 1;
      }
      result[key] = items;
      continue;
    }
    result[key] = rest;
    index += 1;
  }
  return result;
}
