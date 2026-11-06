#!/usr/bin/env python3
"""Small reproducible native Android build; no Gradle/network at runtime."""
import argparse,json,os,secrets,subprocess,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
TOOLS=ROOT/'tools'
SDK=TOOLS/'platform/android-35/android.jar'
BT=TOOLS/'build-tools/android-15'
B=ROOT/'build'
def run(args):subprocess.run([str(x) for x in args],cwd=ROOT,check=True)
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output');args=parser.parse_args()
    for p in ['compiled','classes','dex','generated']:(B/p).mkdir(parents=True,exist_ok=True)
    if not SDK.is_file() or not (BT/'aapt2').is_file() or not (TOOLS/'ecj.jar').is_file():
        raise SystemExit('Build tools missing. See README.md for bootstrap instructions.')
    run([BT/'aapt2','compile','--dir',ROOT/'app/src/main/res','-o',B/'compiled/resources.zip'])
    run([BT/'aapt2','link','-o',B/'base.apk','-I',SDK,'--manifest',ROOT/'app/src/main/AndroidManifest.xml','--java',B/'generated','-A',ROOT/'app/src/main/assets',B/'compiled/resources.zip'])
    sources=list((ROOT/'app/src/main/java').rglob('*.java'))+list((B/'generated').rglob('*.java'))
    run(['java','-jar',TOOLS/'ecj.jar','-source','1.8','-target','1.8','-classpath',SDK,'-proc:none','-nowarn','-d',B/'classes',*sources])
    with zipfile.ZipFile(B/'classes.jar','w',zipfile.ZIP_DEFLATED) as z:
        for p in (B/'classes').rglob('*.class'):z.write(p,p.relative_to(B/'classes'))
    run(['java','-cp',BT/'lib/d8.jar','com.android.tools.r8.D8','--min-api','24','--lib',SDK,'--output',B/'dex',B/'classes.jar'])
    with zipfile.ZipFile(B/'base.apk','a',zipfile.ZIP_DEFLATED) as z:
        for p in (B/'dex').glob('*.dex'):z.write(p,p.name)
    run([BT/'zipalign','-f','4',B/'base.apk',B/'aligned.apk'])
    keys=ROOT/'.keys';keys.mkdir(exist_ok=True);keys.chmod(0o700)
    cfg=keys/'config.json'
    if cfg.exists():password=json.loads(cfg.read_text())['password']
    else:
        password=secrets.token_urlsafe(32);cfg.write_text(json.dumps({'password':password}));cfg.chmod(0o600)
    os.environ['ZOOPIT_SIGN_PASSWORD']=password
    keystore=keys/'zoopit.jks'
    if not keystore.exists():
        run(['keytool','-genkeypair','-keystore',keystore,'-storetype','PKCS12','-storepass:env','ZOOPIT_SIGN_PASSWORD','-keypass:env','ZOOPIT_SIGN_PASSWORD','-alias','zoopit','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=ZooPit, OU=Android, O=ZooPit'])
        keystore.chmod(0o600)
    output=Path(args.output).resolve() if args.output else ROOT/'releases/ZooPit-0.1.0.apk';output.parent.mkdir(parents=True,exist_ok=True)
    run(['java','-jar',BT/'lib/apksigner.jar','sign','--ks',keystore,'--ks-key-alias','zoopit','--ks-pass','env:ZOOPIT_SIGN_PASSWORD','--key-pass','env:ZOOPIT_SIGN_PASSWORD','--out',output,B/'aligned.apk'])
    run(['java','-jar',BT/'lib/apksigner.jar','verify','--verbose',output])
    print('APK:',output,'bytes:',output.stat().st_size)
if __name__=='__main__':main()
