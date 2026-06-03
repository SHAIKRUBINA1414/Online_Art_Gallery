# Ru's Art Vault Flask Project

A full-stack Python art gallery app with user login, artwork uploads, ratings, hearts/likes, feedback moderation, an about page, dark mode, a chatbot, a 3D moving showcase, a mini art game, and an admin dashboard.

## Open in VS Code

1. Open VS Code.
2. Choose **File > Open Folder**.
3. Select this folder:

    Select this repository folder on your machine (the project root).

## Setup

Open the VS Code terminal and run:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
flask --app app init-db
```

The database command creates the tables and an initial admin account for convenience.
Run `flask --app app init-db` and then immediately log in and change the admin password to a secure value.

For local testing, if signup reports an account already exists, sign in and use the admin dashboard to manage users or reset passwords securely.

## Run

In VS Code, press `F5` and choose **Python: Flask Art Gallery**.

You can also run it from the terminal:

```powershell
flask --app app run --debug
```

Then open:

```text
http://127.0.0.1:5000
```

## Project Structure

```text
ART_GALLERY/
├── app.py
├── requirements.txt
├── README.md
├── .vscode/
│   ├── launch.json
│   └── settings.json
├── templates/
│   ├── base.html
│   ├── index.html
│   ├── gallery.html
│   ├── artwork_detail.html
│   ├── login.html
│   ├── signup.html
│   ├── feedback.html
│   ├── about.html
│   ├── admin.html
│   └── artwork_form.html
└── static/
    ├── css/style.css
    ├── js/main.js
    └── uploads/
```

## Notes

- Upload artwork from the admin dashboard.
- The first database setup adds pastel sample artworks inspired by Indian online art gallery categories.
- Visitors can browse categories like abstract, traditional, folk, flower, landscape, and portrait.
- Logged-in users can rate artworks and press the heart button to like frames.
- The floating Riri chatbot gives simple collection guidance with a character avatar.
- The Art Games section has ten separate browser-based mini game pages inspired by creative Pygame-style play: Color Splash, Pixel Painter, Shape Symphony, Abstract Motion, Art Puzzle, Canvas Chaos, Graffiti Wall, Mandala Maker, Art Collector, and Light & Shadow.
- Logged-in users can save their canvas game artwork into the gallery as a new digital artwork.
- Brush-based games include multiple brush tools and an eraser.
- Art Puzzle tracks moves and solved state, Canvas Chaos has score/lives/rounds, and Art Collector has keyboard movement, enemies, lives, and win/loss states.
- Feedback is hidden until the admin approves it.
- Put your resume at `static/resume.pdf` if you want the About page download button to work.
- Uploaded images and the SQLite database are ignored by Git.

## After Updating Existing Database

If you already ran the app before these features were added, stop the server with `CTRL+C`, then run:

```powershell
flask --app app init-db
flask --app app run --debug
```

This updates the local SQLite database and adds sample artworks if the gallery is empty.
