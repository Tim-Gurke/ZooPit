#!/usr/bin/env python3
from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1]
dest=root/'online/public/game';dest.mkdir(parents=True,exist_ok=True)
for p in (root/'app/src/main/assets').iterdir():
    if p.is_file():shutil.copy(p,dest/p.name)
lib=root/'online/lib';lib.mkdir(exist_ok=True)
(lib/'zoo-engine.mjs').write_text((root/'app/src/main/assets/engine.js').read_text()+'\nexport const E=globalThis.ZooEngine;\n')
shutil.copy(root/'data/levels.json',lib/'levels.json')
print('Android and online game sources synchronized.')
