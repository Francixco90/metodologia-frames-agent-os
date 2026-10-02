#!/usr/bin/env python3
"""Pinned optional asset bank; bounded archives and safe original SVG only."""
import argparse, hashlib, json, pathlib, re, stat, tempfile, urllib.parse, urllib.request, xml.etree.ElementTree as ET, zipfile
MAX_FILES=1024
MAX_BYTES=30_000_000
SVG_TAGS={'svg','g','path','rect','circle','ellipse','line','polyline','polygon','text','tspan','title','desc'}
SVG_ATTRS={'viewBox','width','height','x','y','x1','y1','x2','y2','cx','cy','r','rx','ry','d','points','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','fill-rule','clip-rule','opacity','fill-opacity','stroke-opacity','transform','font-family','font-size','font-weight','text-anchor','dominant-baseline','role','aria-hidden','aria-label','id','class'}
def sha(data): return hashlib.sha256(data).hexdigest()
def safe_member(name):
 parts=pathlib.PurePosixPath(name)
 return bool(name) and not parts.is_absolute() and '..' not in parts.parts and not any(c in name for c in ('\\',':')) and not name.startswith('.')
def safe_svg(data):
 if isinstance(data,bytes): data=data.decode('utf-8')
 if len(data.encode())>1_000_000 or re.search(r'<!DOCTYPE|<!ENTITY',data,re.I): raise ValueError('BANK_UNSAFE_SVG')
 try: root=ET.fromstring(data)
 except ET.ParseError as exc: raise ValueError('BANK_UNSAFE_SVG') from exc
 if root.tag not in ('svg','{http://www.w3.org/2000/svg}svg'): raise ValueError('BANK_UNSAFE_SVG')
 for node in root.iter():
  if node.tag.split('}')[-1] not in SVG_TAGS: raise ValueError('BANK_UNSAFE_SVG')
  for name,value in node.attrib.items():
   if name not in SVG_ATTRS or re.search(r'url\s*\(|javascript:|https?:|data:|[<>]',value,re.I): raise ValueError('BANK_UNSAFE_SVG')
 return root
def validate_manifest(manifest,files):
 if not isinstance(manifest,dict) or manifest.get('schemaVersion')!='frames-aula-asset-bank-v1' or manifest.get('originalOnly') is not True: raise ValueError('BANK_MANIFEST_INVALID')
 expected=manifest.get('files')
 if not isinstance(expected,dict) or any(not safe_member(k) or not isinstance(v,str) or not re.fullmatch('[0-9a-f]{64}',v) for k,v in expected.items()): raise ValueError('BANK_MANIFEST_INVALID')
 if set(files)!={*expected,'manifest.json'}: raise ValueError('BANK_FILESET_MISMATCH')
 if len(files)>MAX_FILES or sum(len(value) for value in files.values())>MAX_BYTES: raise ValueError('BANK_BUDGET_OR_DUPLICATE')
 for name,digest in expected.items():
  if sha(files[name])!=digest: raise ValueError('BANK_MEMBER_HASH_MISMATCH: '+name)
  if name.endswith('.svg'): safe_svg(files[name])
 return manifest
def verify_archive(archive,digest):
 data=pathlib.Path(archive).read_bytes()
 if sha(data)!=digest: raise ValueError('BANK_HASH_MISMATCH')
 with zipfile.ZipFile(archive) as z:
  names=z.namelist()
  if len(names)!=len(set(names)) or len(names)>MAX_FILES or sum(x.file_size for x in z.infolist())>MAX_BYTES: raise ValueError('BANK_BUDGET_OR_DUPLICATE')
  for info in z.infolist():
   if not safe_member(info.filename) or stat.S_ISLNK(info.external_attr>>16) or info.is_dir(): raise ValueError('BANK_UNSAFE_MEMBER')
  if 'manifest.json' not in names: raise ValueError('BANK_MANIFEST_MISSING')
  files={name:z.read(name) for name in names}
  return validate_manifest(json.loads(files['manifest.json']),files),files
def verify_directory(directory):
 directory=pathlib.Path(directory).absolute()
 if any(p.is_symlink() for p in (directory,*directory.parents)): raise ValueError('BANK_UNSAFE_PATH')
 paths=list(directory.rglob('*'))
 if any(p.is_symlink() for p in paths): raise ValueError('BANK_UNSAFE_PATH')
 members=[p for p in paths if p.is_file()]
 if len(members)>MAX_FILES or sum(p.stat().st_size for p in members)>MAX_BYTES: raise ValueError('BANK_BUDGET_OR_DUPLICATE')
 if not (directory/'manifest.json').is_file(): raise ValueError('BANK_MANIFEST_MISSING')
 files={p.relative_to(directory).as_posix():p.read_bytes() for p in members}
 return validate_manifest(json.loads(files['manifest.json']),files)
def install(files,dest):
 dest=pathlib.Path(dest).absolute()
 if dest.exists() or any(x.is_symlink() for x in (dest,*dest.parents)): raise ValueError('BANK_DESTINATION_UNSAFE_OR_EXISTS')
 dest.mkdir(parents=True)
 for name,data in files.items():
  path=dest/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
def safe_release_url(url):
 if not isinstance(url,str):return False
 parsed=urllib.parse.urlparse(url)
 return parsed.scheme=='https' and parsed.hostname=='github.com' and not parsed.username and re.fullmatch(r'/[\w.-]+/[\w.-]+/releases/download/v?[\w.-]+/[\w.-]+\.zip',parsed.path) is not None and '/latest/' not in parsed.path and not parsed.query and not parsed.fragment
class ReleaseRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  parsed=urllib.parse.urlparse(newurl)
  if parsed.scheme!='https' or not parsed.hostname or not (parsed.hostname=='github.com' or parsed.hostname.endswith('.githubusercontent.com')):raise ValueError('BANK_UNSAFE_REDIRECT')
  return super().redirect_request(req,fp,code,msg,headers,newurl)
def main():
 p=argparse.ArgumentParser();p.add_argument('command',choices=['verify','install','sync']);p.add_argument('archive',nargs='?');p.add_argument('--sha256');p.add_argument('--dest');p.add_argument('--pin');a=p.parse_args();network=False
 try:
  if a.command=='sync':
   if not a.pin or not a.dest:p.error('sync requiere --pin y --dest')
   pin=json.loads(pathlib.Path(a.pin).read_text())
   if not isinstance(pin,dict):raise ValueError('BANK_PIN_INVALID')
   url=pin.get('url',pin.get('downloadUrl',pin.get('archive','')));digest=pin.get('sha256','')
   if not safe_release_url(url) or not isinstance(digest,str) or not re.fullmatch('[0-9a-f]{64}',digest):raise ValueError('BANK_PIN_INVALID')
   version=pin.get('version',pin.get('release',pin.get('tag','')))
   if not isinstance(version,str) or not version.strip():raise ValueError('BANK_PIN_INVALID')
   if pin.get('manifestSha256') and (not isinstance(pin['manifestSha256'],str) or not re.fullmatch('[0-9a-f]{64}',pin['manifestSha256'])):raise ValueError('BANK_PIN_INVALID')
   destination=pathlib.Path(a.dest).absolute()
   if destination.exists():
    manifest=verify_directory(destination)
    if not re.fullmatch('[0-9a-f]{64}',pin.get('manifestSha256','')) or sha((destination/'manifest.json').read_bytes())!=pin['manifestSha256']:raise ValueError('BANK_CACHE_MANIFEST_PIN_MISMATCH')
    if not isinstance(version,str) or manifest.get('version')!=version.removeprefix('v') or (pin.get('edition') and manifest.get('edition')!=pin['edition']):raise ValueError('BANK_CACHE_PIN_MISMATCH')
    print(json.dumps({'status':'PASS','version':manifest['version'],'edition':manifest['edition'],'networkUsed':False,'cacheHit':True}));return
   if any(x.is_symlink() for x in (destination,*destination.parents)):raise ValueError('BANK_DESTINATION_UNSAFE_OR_EXISTS')
   with tempfile.TemporaryDirectory(prefix='frames-aula-bank-') as temporary:
    archive=pathlib.Path(temporary)/'bank.zip'
    with urllib.request.build_opener(ReleaseRedirect()).open(url,timeout=30) as response:
     resolved=urllib.parse.urlparse(response.url)
     if resolved.scheme!='https' or not resolved.hostname or not (resolved.hostname=='github.com' or resolved.hostname.endswith('.githubusercontent.com')):raise ValueError('BANK_UNSAFE_REDIRECT')
     data=response.read(MAX_BYTES+1)
     if len(data)>MAX_BYTES:raise ValueError('BANK_DOWNLOAD_BUDGET')
    network=True;archive.write_bytes(data);manifest,files=verify_archive(archive,digest)
    if pin.get('manifestSha256') and sha(files['manifest.json'])!=pin['manifestSha256']:raise ValueError('BANK_CACHE_MANIFEST_PIN_MISMATCH')
    if manifest.get('version')!=version.removeprefix('v'):raise ValueError('BANK_CACHE_PIN_MISMATCH')
    if pin.get('edition') and pin['edition']!=manifest['edition']:raise ValueError('BANK_EDITION_MISMATCH')
    install(files,destination)
  else:
   if not a.archive or not a.sha256:p.error('archive y --sha256 obligatorios')
   manifest,files=verify_archive(a.archive,a.sha256)
   if a.command=='install':
    if not a.dest:p.error('--dest requerido')
    install(files,a.dest)
  print(json.dumps({'status':'PASS','version':manifest['version'],'edition':manifest['edition'],'files':len(files),'networkUsed':network}))
 except (ValueError,OSError,zipfile.BadZipFile,KeyError,TypeError) as exc:p.error(str(exc))
if __name__=='__main__':main()
