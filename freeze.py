"""
Freeze the Flask app to static files using Frozen-Flask.

Notes:
- This generates a static snapshot suitable for GitHub Pages.
- Dynamic features (login, saving, DB writes) will not work on the static site.
"""
from flask_frozen import Freezer
from app import app, ensure_database_shape, create_sample_artworks

if __name__ == "__main__":
    # Ensure DB and sample data exist so pages render correctly
    with app.app_context():
        ensure_database_shape()
        create_sample_artworks()

    freezer = Freezer(app)
    freezer.freeze()
    print("Static site generated in './build' directory")
