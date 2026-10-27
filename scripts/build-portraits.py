#!/usr/bin/env python3
"""Rebuild the responsive portraits from reviewed face/crop coordinates. Requires Pillow.
Run from any directory: python scripts/build-portraits.py
Coordinates in assets/portraits/crops.json were detected per source image and visually reviewed.
Original full-body portraits are preserved. Retired portraits are skipped.
"""
from pathlib import Path
import json
from PIL import Image,ImageFilter
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/portraits'
manifest=json.loads((OUT/'crops.json').read_text())
for file,entry in manifest.items():
    source=ROOT/'assets/cast'/f'{file}.png'
    if not source.exists():
        raise FileNotFoundError(f'Missing active portrait: {source}')
    im=Image.open(source).convert('RGBA')
    if list(im.size)!=entry['size']:
        raise ValueError(f'Review face coordinates after replacing {file}')
    bg=Image.new('RGBA',im.size,'#26233d');bg.alpha_composite(im)
    for kind,key,sizes,ratio in [('face','faceCrop',[96,192,320],1),('bust','bustCrop',[240,480],1.25)]:
        crop=bg.crop(tuple(entry[key])).convert('RGB')
        for size in sizes:
            thumb=crop.resize((size,round(size*ratio)),Image.Resampling.LANCZOS)
            thumb=thumb.filter(ImageFilter.UnsharpMask(radius=.7,percent=110,threshold=3))
            thumb.save(OUT/f'{file}-{kind}-{size}.webp',quality=92,method=6)
print(f'Rebuilt centered portraits for {len(manifest)} residents')
