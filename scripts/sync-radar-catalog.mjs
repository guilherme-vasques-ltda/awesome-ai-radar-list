import { writeFile } from 'node:fs/promises';

const origin = 'https://my-tierroom.party';
const catalogs = [
 { title: 'AI agents', endpoint: '/api/agents', field: 'agents', list: '/explore', agent: true, summary: 'tagline' },
 { title: 'Coding tools', endpoint: '/api/coding-catalog', field: 'tools', list: '/coding', summary: 'description' },
 { title: 'Software and infrastructure', endpoint: '/api/software', field: 'software', list: '/software', summary: 'description' },
 { title: 'Startup SaaS', endpoint: '/api/startups', field: 'startups', list: '/startups', summary: 'problem' },
];

function markdown(value) {
 return String(value || '').replace(/\s+/g, ' ').trim()
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replace(/[\\[]*_`|]/g, '\\$&');
}

function radarLink(path, campaign) {
 const url = new URL(path, origin);
 url.searchParams.set('utm_source', 'github');
 url.searchParams.set('utm_medium', 'referral');
 url.searchParams.set('utm_campaign', 'awesome_ai_radar_list');
 url.searchParams.set('utm_content', campaign);
 return url.href;
}

async function section(catalog) {
 const response = await fetch(origin + catalog.endpoint, { signal: AbortSignal.timeout(20000) });
 if (!response.ok) throw Error(catalog.endpoint + ' returned HTTP ' + response.status);
 const entries = (await response.json())[catalog.field];
 if (!Array.isArray(entries) || !entries.length ||
     entries.some(item => !/^[a-z0-9-]+$/.test(item?.id) || typeof item.name !== 'string' || !item.name.trim())) {
  throw Error('Invalid catalog payload: ' + catalog.endpoint);
 }
 const rows = [...new Map(entries.map(item => [item.id, item])).values()]
  .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
 const lines = rows.map(item => {
  const path = catalog.agent ? '/agents/' + item.id : catalog.list + '?q=' + encodeURIComponent(item.name);
  const facts = [item.license, item[catalog.summary]].filter(Boolean);
  const detail = facts.map(value => markdown(String(value).slice(0, 150))).join(' · ');
  return '- [' + markdown(item.name) + '](' + radarLink(path, catalog.field) + ')' + (detail ? ' — ' + detail : '');
 });
 return ['## ' + catalog.title, '', ...lines].join('\n');
}

const sections = await Promise.all(catalogs.map(section));
await writeFile('live-catalog.md', [
 '# Live Radar Scout catalog',
 '',
 'This index follows the public Radar Scout catalog automatically. The curated guides in the README carry additional editorial context. Open an entry for current details, licensing and official sources.',
 '',
 ...sections.flatMap(section => [section, ''])
].join('\n'));
