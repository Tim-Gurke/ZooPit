#!/usr/bin/env python3
"""Download official Android build tools and the Eclipse Java compiler."""
from pathlib import Path
from urllib.request import urlretrieve, urlopen
from concurrent.futures import ThreadPoolExecutor
import hashlib,os,stat,xml.etree.ElementTree as ET,zipfile
ROOT=Path(__file__).resolve().parents[1];TOOLS=ROOT/'tools'
def main():
    TOOLS.mkdir(exist_ok=True)
    xml=urlopen('https://dl.google.com/android/repository/repository2-1.xml',timeout=60).read()
    meta=ET.fromstring(xml)
    def sdk(entry):
        name,url=entry;checksum=None
        for archive in meta.iter('archive'):
            if archive.findtext('./complete/url')==url:checksum=archive.findtext('./complete/checksum');break
        if not checksum:raise RuntimeError('Official SDK checksum not found: '+url)
        archive=TOOLS/(name+'.zip')
        if not archive.exists() or hashlib.sha1(archive.read_bytes()).hexdigest()!=checksum:
            urlretrieve('https://dl.google.com/android/repository/'+url,archive)
        if hashlib.sha1(archive.read_bytes()).hexdigest()!=checksum:raise RuntimeError('SDK download checksum mismatch')
        with zipfile.ZipFile(archive) as z:z.extractall(TOOLS/name)
        print('Verified and extracted',name,flush=True)
    with ThreadPoolExecutor(2) as pool:list(pool.map(sdk,[('platform','platform-35_r02.zip'),('build-tools','build-tools_r35_linux.zip')]))
    ecj=TOOLS/'ecj.jar'
    if not ecj.exists():urlretrieve('https://repo.maven.apache.org/maven2/org/eclipse/jdt/ecj/3.39.0/ecj-3.39.0.jar',ecj)
    with zipfile.ZipFile(ecj) as z:
        if z.testzip():raise RuntimeError('Invalid Java compiler jar')
    for p in (TOOLS/'build-tools').rglob('*'):
        if p.name in ['aapt2','zipalign','apksigner','d8']:p.chmod(p.stat().st_mode|stat.S_IXUSR|stat.S_IXGRP|stat.S_IXOTH)
    print('Android tools ready. Java 17+ with keytool must be on PATH.')
if __name__=='__main__':main()
