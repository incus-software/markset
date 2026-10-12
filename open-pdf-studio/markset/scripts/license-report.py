# Usage (from the repo root):
#   python3 open-pdf-studio/markset/scripts/license-report.py open-pdf-studio/package-lock.json open-pdf-studio/markset/licenses.md
# Needs cargo on PATH. Lists every third-party Rust crate and production npm
# package with its license and flags copyleft or unknown licenses.
import json, re, sys, collections, datetime, subprocess
meta = json.loads(subprocess.check_output(['cargo', 'metadata', '--format-version', '1', '--locked']))
ws = set(meta['workspace_members'])
resolve_ids = {n['id'] for n in meta['resolve']['nodes']}
rows = []
for p in meta['packages']:
    if p['id'] in ws or p['id'] not in resolve_ids: continue
    rows.append(('cargo', p['name'], p['version'], p.get('license') or ('file: '+p['license_file'] if p.get('license_file') else 'UNKNOWN')))
lock = json.load(open(sys.argv[1]))
for path, p in lock['packages'].items():
    if not path or p.get('dev') or p.get('devOptional'): continue
    rows.append(('npm', path.split('node_modules/')[-1], p.get('version',''), p.get('license') or 'UNKNOWN'))
COPYLEFT = re.compile(r'(A?GPL|LGPL|MPL|EPL|CDDL|EUPL|OSL|CC-BY-SA|SSPL|UNKNOWN|file:)', re.I)
def permissive_alt(lic):
    # "MIT OR Apache-2.0" style: fine if any alternative is permissive
    alts = re.split(r'\s+OR\s+|/', lic.strip('()'))
    return any(not COPYLEFT.search(a) for a in alts) and ' AND ' not in lic.upper()
flag = [r for r in rows if COPYLEFT.search(r[3]) and not permissive_alt(r[3])]
summary = collections.Counter(r[3] for r in rows)
out = []
out.append('# Markset dependency license report\n')
out.append(f'Generated {datetime.date.today()} from Cargo.lock (cargo metadata --locked) and open-pdf-studio/package-lock.json (production packages only). Workspace crates excluded.\n')
out.append(f'Total third-party packages: {len(rows)} ({sum(r[0]=="cargo" for r in rows)} Rust crates, {sum(r[0]=="npm" for r in rows)} npm packages).\n')
out.append('## Needs attention (copyleft or unknown, with no permissive alternative)\n')
out.append('| Ecosystem | Package | Version | License |\n|---|---|---|---|')
for r in sorted(flag): out.append(f'| {r[0]} | {r[1]} | {r[2]} | {r[3]} |')
out.append('\n## License counts\n')
out.append('| License expression | Packages |\n|---|---|')
for lic, n in summary.most_common(): out.append(f'| {lic} | {n} |')
out.append('\n## Full list\n')
out.append('| Ecosystem | Package | Version | License |\n|---|---|---|---|')
for r in sorted(rows): out.append(f'| {r[0]} | {r[1]} | {r[2]} | {r[3]} |')
open(sys.argv[2],'w').write('\n'.join(out)+'\n')
print(len(rows), 'flagged:'); [print(' ',r) for r in sorted(flag)]
