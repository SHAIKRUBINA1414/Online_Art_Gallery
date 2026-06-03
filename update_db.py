#!/usr/bin/env python3
import sqlite3

conn = sqlite3.connect('art_gallery.db')
cur = conn.cursor()
for i in range(1, 7):
    svg = f"sample_art_{i}.svg"
    png = f"sample_art_{i}.png"
    cur.execute("UPDATE artwork SET image_filename=? WHERE image_filename=?", (png, svg))
conn.commit()
cur.execute("SELECT id, image_filename FROM artwork ORDER BY id")
rows = cur.fetchall()
for r in rows:
    print(r)
conn.close()
print('update complete')
