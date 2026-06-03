#!/usr/bin/env python3
import os
import base64
import sqlite3

BASE = os.path.abspath(os.path.dirname(__file__))
UP = os.path.join(BASE, 'static', 'uploads')

def png_size(path):
    with open(path, 'rb') as f:
        data = f.read(24)
    # PNG header: width and height are 4-byte big-endian at offset 16
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        return None, None
    width = int.from_bytes(data[16:20], 'big')
    height = int.from_bytes(data[20:24], 'big')
    return width, height

converted = []
for i in range(1,7):
    png_name = f'sample_art_{i}.png'
    svg_name = f'sample_art_{i}.svg'
    png_path = os.path.join(UP, png_name)
    svg_path = os.path.join(UP, svg_name)
    if not os.path.exists(png_path):
        print('missing', png_path)
        continue
    with open(png_path, 'rb') as f:
        png_data = f.read()
    b64 = base64.b64encode(png_data).decode('ascii')
    w,h = png_size(png_path)
    if not w:
        w = ''
        h = ''
        viewBox = ''
    else:
        viewBox = f'viewBox="0 0 {w} {h}"'
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" {viewBox}>
  <image href="data:image/png;base64,{b64}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid meet" />
</svg>'''
    with open(svg_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    converted.append((png_name, svg_name))
    print('converted', png_name, '->', svg_name)

# Update DB to reference svg files
db_path = os.path.join(BASE, 'art_gallery.db')
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    for png, svg in converted:
        cur.execute('UPDATE artwork SET image_filename=? WHERE image_filename=?', (svg, png))
    conn.commit()
    cur.execute('SELECT id, image_filename FROM artwork ORDER BY id')
    for row in cur.fetchall():
        print(row)
    conn.close()
    print('DB updated')
else:
    print('database not found, skipped DB update')
