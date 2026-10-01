#!/usr/bin/env python3
"""Optional original asset bank installer: local ZIP, pinned checksum, contained writes."""
import argparse, hashlib, json, pathlib, stat, sys, zipfile
def main():
 p=argparse.ArgumentParser();p.add_argument('command',choices=['verify','install']);p.add_argument('archive');p.add_argument('--sha256',required=True);p.add_argument('--dest');a=p.parse_args()
 archive=pathlib.Path(a.archive)
 if hashlib.sha256(archive.read_bytes()).hexdigest()!=a.sha256:p.error('BANK_HASH_MISMATCH')
 with zipfile.ZipFile(archive) as z:
  names=z.namelist()
  if len(names)!=len(set(names)) or len(names)>200 or sum(x.file_size for x in z.infolist())>30_000_000:p.error('BANK_BUDGET_OR_DUPLICATE')
  for info in z.infolist():
   parts=pathlib.PurePosixPath(info.filename)
   if parts.is_absolute() or '..' in parts.parts or '\\' in info.filename or ':' in info.filename or stat.S_ISLNK(info.external_attr>>16):p.error('BANK_UNSAFE_MEMBER')
  if 'manifest.json' not in names:p.error('BANK_MANIFEST_MISSING')
  manifest=json.loads(z.read('manifest.json'))
  if manifest.get('schemaVersion')!='frames-aula-asset-bank-v1' or manifest.get('originalOnly') is not True:p.error('BANK_MANIFEST_INVALID')
  expected={k:v for k,v in manifest['files'].items() if not k.startswith('.')}
  if set(names)!={*expected,'manifest.json'}:p.error('BANK_FILESET_MISMATCH')
  for name,digest in expected.items():
   if hashlib.sha256(z.read(name)).hexdigest()!=digest:p.error('BANK_MEMBER_HASH_MISMATCH')
  if a.command=='install':
   if not a.dest:p.error('--dest requerido')
   dest=pathlib.Path(a.dest).absolute()
   if dest.exists() or any(x.is_symlink() for x in (dest,*dest.parents)):p.error('BANK_DESTINATION_UNSAFE_OR_EXISTS')
   dest.mkdir(parents=True)
   for name in names:
    path=dest/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(z.read(name))
  print(json.dumps({'status':'PASS','version':manifest['version'],'edition':manifest['edition'],'files':len(names),'networkUsed':False}))
if __name__=='__main__':main()
