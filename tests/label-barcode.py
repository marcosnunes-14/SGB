"""Decodifica o Code 128 produzido pelo código real, com tabela independente."""
import json, tempfile
from pathlib import Path
from reportlab.graphics.barcode.code128 import _patterns

def pattern(value):
    return ''.join(('1' if letter.isupper() else '0') * (ord(letter.lower())-ord('a')+1) for letter in value)
lookup={pattern(value):code for code,value in _patterns.items()}
for sample in json.load(open(Path(tempfile.gettempdir()) / 'sgb-label-code128.json')):
    bits=sample['bits'];stop=pattern(_patterns[106]);assert bits.endswith(stop)
    parts=bits[:-len(stop)];assert len(parts)%11==0
    codes=[lookup[parts[i:i+11]] for i in range(0,len(parts),11)]
    assert (codes[0]+sum(i*code for i,code in enumerate(codes[1:-1],1)))%103==codes[-1]
    mode={103:'A',104:'B',105:'C'}[codes[0]];text=''
    for code in codes[1:-1]:
        if mode=='C':
            if code==100:mode='B'
            elif code==101:mode='A'
            else:text+=f'{code:02d}'
        elif code==99:mode='C'
        elif code==100 and mode=='A':mode='B'
        elif code==101 and mode=='B':mode='A'
        else:text+=chr(code+32 if mode=='B' or code<64 else code-64)
    assert text==sample['code'],(text,sample)
print('PASS: Code 128 decodificado por tabela independente, com checksum correto.')
