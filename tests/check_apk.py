from pathlib import Path
import zipfile
r=Path(__file__).resolve().parents[1]
apk=r/'releases/ZooPit-0.1.0.apk'
with zipfile.ZipFile(apk) as z:
    assert z.testzip() is None
    for p in (r/'app/src/main/assets').iterdir():
        if p.is_file():assert z.read('assets/'+p.name)==p.read_bytes(),p.name+' differs from source'
    assert 'classes.dex' in z.namelist()
    assert 'AndroidManifest.xml' in z.namelist()
print('PASS: installable APK structure and all bundled game assets match the repository source.')
