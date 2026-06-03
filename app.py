import os
import base64
from functools import wraps
from uuid import uuid4

from flask import Flask, abort, flash, jsonify, redirect, render_template, request, send_from_directory, url_for
from flask_login import LoginManager, UserMixin, current_user, login_required, login_user, logout_user
from sqlalchemy import func, text
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-art-gallery-secret")
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(BASE_DIR, "art_gallery.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = "login"


@app.context_processor
def inject_assets():
    from datetime import datetime
    riri_png = os.path.join(BASE_DIR, "static", "img", "riri.png")
    riri_asset = "img/riri.png" if os.path.exists(riri_png) else "img/riri.svg"
    return {"riri_asset": riri_asset, "now": datetime.now()}


class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    ratings = db.relationship("Rating", backref="user", cascade="all, delete-orphan")
    feedback = db.relationship("Feedback", backref="user", cascade="all, delete-orphan")
    likes = db.relationship("Like", backref="user", cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Artwork(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(140), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(60), nullable=False)
    image_filename = db.Column(db.String(255), nullable=False)
    medium = db.Column(db.String(80), default="Acrylic on canvas")
    size = db.Column(db.String(50), default="24 x 18 inches")
    price = db.Column(db.String(40), default="On request")
    views = db.Column(db.Integer, default=0)
    ratings = db.relationship("Rating", backref="artwork", cascade="all, delete-orphan")
    feedback = db.relationship("Feedback", backref="artwork", cascade="all, delete-orphan")
    likes = db.relationship("Like", backref="artwork", cascade="all, delete-orphan")

    @property
    def average_rating(self):
        if not self.ratings:
            return 0
        return round(sum(r.value for r in self.ratings) / len(self.ratings), 1)


class Rating(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    value = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    artwork_id = db.Column(db.Integer, db.ForeignKey("artwork.id"), nullable=False)
    __table_args__ = (db.UniqueConstraint("user_id", "artwork_id", name="one_rating_per_user_artwork"),)


class Like(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    artwork_id = db.Column(db.Integer, db.ForeignKey("artwork.id"), nullable=False)
    __table_args__ = (db.UniqueConstraint("user_id", "artwork_id", name="one_like_per_user_artwork"),)


class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    comment = db.Column(db.Text, nullable=False)
    approved = db.Column(db.Boolean, default=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    artwork_id = db.Column(db.Integer, db.ForeignKey("artwork.id"), nullable=True)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            abort(403)
        return view(*args, **kwargs)

    return wrapped


def ensure_database_shape():
    db.create_all()
    columns = {
        row[1]
        for row in db.session.execute(text("PRAGMA table_info(artwork)")).fetchall()
    }
    additions = {
        "medium": "ALTER TABLE artwork ADD COLUMN medium VARCHAR(80) DEFAULT 'Acrylic on canvas'",
        "size": "ALTER TABLE artwork ADD COLUMN size VARCHAR(50) DEFAULT '24 x 18 inches'",
        "price": "ALTER TABLE artwork ADD COLUMN price VARCHAR(40) DEFAULT 'On request'",
    }
    for column, statement in additions.items():
        if column not in columns:
            db.session.execute(text(statement))
    db.session.commit()


def create_sample_artworks():
    if Artwork.query.first():
        return
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    samples = [
        ("❤️ “You Have My Heart — Mixed Media Frame”", "Keywords: Sentimental, Anatomical", "inspiration", "Mixed media", "24 x 24 inches", "₹800", "#f2d5ff", "#d0f0ff"),
        ("🌷 “Tulip Whispers — Watercolor on Paper”", "Keywords: Delicate, Botanical", "traditional", "Watercolor on paper", "30 x 24 inches", "₹400", "#ffe8c8", "#e7d7ff"),
        ("🌼 “The Gift of Bloom — Canvas Art”", "Keywords: Connection, Gesture", "abstract", "Canvas", "36 x 24 inches", "₹1,000", "#d3e9ff", "#f2c4f7"),
        ("🌹 “Scarlet Stem — Sketch Study”", "Keywords: Minimalist, Romantic", "landscape", "Sketch", "28 x 20 inches", "₹900", "#ffd7e1", "#f7f0c8"),
        ("🌒 “Crimson Horizon — Miniature Painting”", "Keywords: Mystical, Contrast", "portrait", "Miniature painting", "20 x 30 inches", "₹500", "#e9d8ff", "#ffcfd2"),
        ("🎀 “Dream Memoir — Collage Board”", "", "inspiration", "Collage board", "24 x 18 inches", "₹1,500", "#c8f7f4", "#dab6fc"),
    ]
    for index, (title, description, category, medium, size, price, color_a, color_b) in enumerate(samples, start=1):
        png_name = f"sample_art_{index}.png"
        svg_name = f"sample_art_{index}.svg"
        png_path = os.path.join(app.config["UPLOAD_FOLDER"], png_name)

        # Prefer an existing PNG upload; only create an SVG placeholder when PNG is missing.
        if os.path.exists(png_path):
            filename = png_name
        else:
            filename = svg_name
            svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1100">
<defs>
<linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="{color_a}"/><stop offset="1" stop-color="{color_b}"/></linearGradient>
<filter id="soft"><feGaussianBlur stdDeviation="18"/></filter>
</defs>
<rect width="900" height="1100" fill="url(#g)"/>
<circle cx="180" cy="240" r="160" fill="#fff" opacity=".45" filter="url(#soft)"/>
<circle cx="720" cy="760" r="220" fill="#fff" opacity=".35" filter="url(#soft)"/>
<path d="M120 730 C250 520 330 880 470 660 S700 500 790 710" fill="none" stroke="#ffffff" stroke-width="28" stroke-linecap="round" opacity=".76"/>
<path d="M190 380 C330 210 520 250 655 400 C500 465 350 480 190 380Z" fill="#ffffff" opacity=".5"/>
<path d="M300 610 C380 510 520 520 610 620 C515 720 390 715 300 610Z" fill="#ffffff" opacity=".42"/>
<text x="70" y="1000" font-family="Georgia, serif" font-size="58" fill="#2f3d44" opacity=".86">{title}</text>
</svg>"""
            # Only write the SVG if it doesn't already exist
            svg_path = os.path.join(app.config["UPLOAD_FOLDER"], svg_name)
            if not os.path.exists(svg_path):
                with open(svg_path, "w", encoding="utf-8") as file:
                    file.write(svg)

        db.session.add(
            Artwork(
                title=title,
                description=description,
                category=category,
                image_filename=filename,
                medium=medium,
                size=size,
                price=price,
            )
        )
    db.session.commit()


@app.cli.command("init-db")
def init_db_command():
    ensure_database_shape()
    if not User.query.filter_by(username="admin").first():
        admin = User(username="admin", email="admin@example.com", is_admin=True)
        admin.set_password("admin123")
        db.session.add(admin)
        db.session.commit()
    create_sample_artworks()
    print("Database ready. Admin login: admin / admin123")


@app.route("/")
def index():
    featured = Artwork.query.order_by(Artwork.views.desc()).limit(6).all()
    return render_template("index.html", featured=featured)


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        username = request.form["username"].strip()
        email = request.form["email"].strip().lower()
        password = request.form["password"]

        errors = []
        if not username or len(username) < 3:
            errors.append("Username must be at least 3 characters.")
        if not email or "@" not in email or "." not in email.split("@")[-1]:
            errors.append("Please enter a valid email address.")
        if not password or len(password) < 6:
            errors.append("Password must be at least 6 characters.")

        existing = User.query.filter(
            (func.lower(User.username) == username.lower()) | (func.lower(User.email) == email)
        ).first()
        if existing:
            errors.append("An account with this username or email already exists. Please log in instead.")

        if errors:
            for error in errors:
                flash(error, "danger")
            return render_template("signup.html")

        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        login_user(user)
        flash("Welcome to the gallery.", "success")
        return redirect(url_for("gallery"))
    return render_template("signup.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"].strip().lower()
        password = request.form["password"]
        if not username or not password:
            flash("Please enter both username/email and password.", "danger")
            return render_template("login.html")
        user = User.query.filter(
            (func.lower(User.username) == username) | (func.lower(User.email) == username)
        ).first()
        if user and user.check_password(password):
            login_user(user)
            flash("Logged in successfully.", "success")
            return redirect(url_for("gallery"))
        flash("Invalid username/email or password.", "danger")
    return render_template("login.html")


@app.route("/logout")
@login_required
def logout():
    logout_user()
    flash("You have been logged out.", "info")
    return redirect(url_for("index"))


@app.route("/gallery")
def gallery():
    category = request.args.get("category", "all")
    query = Artwork.query
    if category != "all":
        query = query.filter_by(category=category)
    artworks = query.order_by(Artwork.id.desc()).all()
    categories = [row[0] for row in db.session.query(Artwork.category).distinct().all()]
    return render_template("gallery.html", artworks=artworks, categories=categories, active_category=category)


@app.route("/artwork/<int:artwork_id>", methods=["GET", "POST"])
def artwork_detail(artwork_id):
    artwork = Artwork.query.get_or_404(artwork_id)
    if request.method == "GET":
        artwork.views += 1
        db.session.commit()
    approved_feedback = Feedback.query.filter_by(artwork_id=artwork.id, approved=True).order_by(Feedback.id.desc()).all()
    return render_template("artwork_detail.html", artwork=artwork, feedback=approved_feedback)


@app.route("/rate/<int:artwork_id>", methods=["POST"])
@login_required
def rate_artwork(artwork_id):
    artwork = Artwork.query.get_or_404(artwork_id)
    try:
        value = max(1, min(5, int(request.form.get("rating", 0))))
    except (ValueError, TypeError):
        flash("Please select a rating between 1 and 5.", "danger")
        return redirect(url_for("artwork_detail", artwork_id=artwork.id))
    rating = Rating.query.filter_by(user_id=current_user.id, artwork_id=artwork.id).first()
    if rating:
        rating.value = value
    else:
        db.session.add(Rating(value=value, user_id=current_user.id, artwork_id=artwork.id))
    db.session.commit()
    flash("Thanks for rating this artwork.", "success")
    return redirect(url_for("artwork_detail", artwork_id=artwork.id))


@app.route("/like/<int:artwork_id>", methods=["POST"])
@login_required
def like_artwork(artwork_id):
    artwork = Artwork.query.get_or_404(artwork_id)
    existing = Like.query.filter_by(user_id=current_user.id, artwork_id=artwork.id).first()
    if existing:
        db.session.delete(existing)
        flash("Removed from your liked artworks.", "info")
    else:
        db.session.add(Like(user_id=current_user.id, artwork_id=artwork.id))
        flash("Added to your liked artworks.", "success")
    db.session.commit()
    return redirect(request.referrer or url_for("gallery"))


@app.route("/feedback", methods=["GET", "POST"])
def feedback():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        comment = request.form.get("comment", "").strip()
        artwork_id = request.form.get("artwork_id") or None
        if not name:
            flash("Please enter your name.", "danger")
            return redirect(url_for("feedback"))
        if not comment:
            flash("Please enter a comment.", "danger")
            return redirect(url_for("feedback"))
        if len(comment) > 2000:
            flash("Comment is too long (maximum 2000 characters).", "danger")
            return redirect(url_for("feedback"))
        db.session.add(
            Feedback(
                name=name[:100],
                comment=comment,
                artwork_id=artwork_id,
                user_id=current_user.id if current_user.is_authenticated else None,
            )
        )
        db.session.commit()
        flash("Feedback submitted for approval.", "success")
        return redirect(url_for("feedback"))
    comments = Feedback.query.filter_by(approved=True).order_by(Feedback.id.desc()).all()
    artworks = Artwork.query.order_by(Artwork.title).all()
    return render_template("feedback.html", comments=comments, artworks=artworks)


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/games/")
def games():
    game_cards = [
        ("splash", "Color Splash", "Click or drag colorful splashes with random pastel energy."),
        ("pixel", "Pixel Painter", "Draw pixel by pixel with a grid and color palette."),
        ("symphony", "Shape Symphony", "Generate beat-like geometric shapes from each click."),
        ("motion", "Abstract Motion", "Create particle trails that follow mouse movement."),
        ("puzzle", "Art Puzzle", "Rearrange pastel artwork tiles into a complete image."),
        ("chaos", "Canvas Chaos", "Match target colors in a quick pattern-recognition challenge."),
        ("graffiti", "Graffiti Wall", "Spray-paint a soft digital wall texture."),
        ("mandala", "Mandala Maker", "Draw mirrored patterns around a central point."),
        ("collector", "Art Collector", "Move through the canvas and collect art pieces."),
        ("light", "Light & Shadow", "Move a light source and create shadow artwork."),
    ]
    return render_template("games.html", game_cards=game_cards)


@app.route("/games/<game_key>")
def game_detail(game_key):
    games_map = {
        "splash": ("Color Splash", "Click or drag colorful splashes with random pastel energy."),
        "pixel": ("Pixel Painter", "Draw pixel by pixel with a grid and color palette."),
        "symphony": ("Shape Symphony", "Generate beat-like geometric shapes from each click."),
        "motion": ("Abstract Motion", "Create particle trails that follow mouse movement."),
        "puzzle": ("Art Puzzle", "Rearrange pastel artwork tiles into a complete image."),
        "chaos": ("Canvas Chaos", "Match target colors in a quick pattern-recognition challenge."),
        "graffiti": ("Graffiti Wall", "Spray-paint a soft digital wall texture."),
        "mandala": ("Mandala Maker", "Draw mirrored patterns around a central point."),
        "collector": ("Art Collector", "Move through the canvas and collect art pieces."),
        "light": ("Light & Shadow", "Move a light source and create shadow artwork."),
    }
    if game_key not in games_map:
        abort(404)
    title, summary = games_map[game_key]
    return render_template("game_detail.html", game_key=game_key, game_title=title, game_summary=summary)


@app.route("/games/save", methods=["POST"])
@login_required
def save_game_art():
    payload = request.get_json() or {}
    image_data = payload.get("image", "")
    title = (payload.get("title") or "My Game Artwork").strip()[:120]
    game_name = (payload.get("game") or "art game").strip()
    if not image_data.startswith("data:image/png;base64,"):
        return jsonify({"ok": False, "message": "Invalid image data."}), 400
    try:
        raw = base64.b64decode(image_data.split(",", 1)[1])
    except (ValueError, base64.binascii.Error):
        return jsonify({"ok": False, "message": "Could not decode the image data."}), 400
    if len(raw) > 10 * 1024 * 1024:
        return jsonify({"ok": False, "message": "Image is too large (maximum 10 MB)."}), 400
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    filename = f"game_art_{current_user.id}_{uuid4().hex}.png"
    try:
        with open(os.path.join(app.config["UPLOAD_FOLDER"], filename), "wb") as file:
            file.write(raw)
    except OSError:
        return jsonify({"ok": False, "message": "Could not save the image file."}), 500
    artwork = Artwork(
        title=title,
        description=f"Saved from the {game_name} mini game by {current_user.username}.",
        category="game-art",
        medium="Digital canvas",
        size="1200 x 680 px",
        price="Not for sale",
        image_filename=filename,
    )
    db.session.add(artwork)
    db.session.commit()
    return jsonify({"ok": True, "url": url_for("artwork_detail", artwork_id=artwork.id)})


@app.route("/admin/")
@login_required
@admin_required
def admin_dashboard():
    artworks = Artwork.query.order_by(Artwork.id.desc()).all()
    feedback_items = Feedback.query.order_by(Feedback.id.desc()).all()
    users = User.query.order_by(User.id.desc()).all()
    highest_rated = sorted(artworks, key=lambda item: item.average_rating, reverse=True)[:5]
    most_viewed = sorted(artworks, key=lambda item: item.views, reverse=True)[:5]
    return render_template(
        "admin.html",
        artworks=artworks,
        feedback_items=feedback_items,
        users=users,
        highest_rated=highest_rated,
        most_viewed=most_viewed,
    )


@app.route("/admin/artwork/new", methods=["GET", "POST"])
@login_required
@admin_required
def new_artwork():
    if request.method == "POST":
        file = request.files.get("image")
        if not file or file.filename == "" or not allowed_file(file.filename):
            flash("Please upload a valid image file (PNG, JPG, GIF, or WEBP).", "danger")
            return redirect(url_for("new_artwork"))
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()
        category = request.form.get("category", "").strip().lower()
        if not title:
            flash("Please enter a title for the artwork.", "danger")
            return redirect(url_for("new_artwork"))
        if not description:
            flash("Please enter a description.", "danger")
            return redirect(url_for("new_artwork"))
        if not category:
            flash("Please enter a category.", "danger")
            return redirect(url_for("new_artwork"))
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid4().hex}_{filename}"
        os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
        try:
            file.save(os.path.join(app.config["UPLOAD_FOLDER"], unique_filename))
        except OSError:
            flash("Could not save the uploaded file. Please try again.", "danger")
            return redirect(url_for("new_artwork"))
        artwork = Artwork(
            title=title,
            description=description,
            category=category,
            medium=request.form.get("medium", "Acrylic on canvas").strip(),
            size=request.form.get("size", "24 x 18 inches").strip(),
            price=request.form.get("price", "On request").strip(),
            image_filename=unique_filename,
        )
        db.session.add(artwork)
        db.session.commit()
        flash("Artwork uploaded.", "success")
        return redirect(url_for("admin_dashboard"))
    return render_template("artwork_form.html")


@app.route("/admin/artwork/<int:artwork_id>/delete", methods=["POST"])
@login_required
@admin_required
def delete_artwork(artwork_id):
    artwork = Artwork.query.get_or_404(artwork_id)
    image_path = os.path.join(app.config["UPLOAD_FOLDER"], artwork.image_filename)
    if os.path.exists(image_path):
        os.remove(image_path)
    db.session.delete(artwork)
    db.session.commit()
    flash("Artwork deleted.", "info")
    return redirect(url_for("admin_dashboard"))


@app.route("/admin/feedback/<int:feedback_id>/approve", methods=["POST"])
@login_required
@admin_required
def approve_feedback(feedback_id):
    item = Feedback.query.get_or_404(feedback_id)
    item.approved = True
    db.session.commit()
    return redirect(url_for("admin_dashboard"))


@app.route("/admin/feedback/<int:feedback_id>/delete", methods=["POST"])
@login_required
@admin_required
def delete_feedback(feedback_id):
    item = Feedback.query.get_or_404(feedback_id)
    db.session.delete(item)
    db.session.commit()
    return redirect(url_for("admin_dashboard"))


@app.route("/admin/user/<int:user_id>/delete", methods=["POST"])
@login_required
@admin_required
def delete_user(user_id):
    if user_id == current_user.id:
        flash("You cannot delete your own admin account.", "warning")
        return redirect(url_for("admin_dashboard"))
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    flash("User removed.", "info")
    return redirect(url_for("admin_dashboard"))


@app.route("/api/chatbot", methods=["POST"])
def chatbot_api():
    """Smart chatbot endpoint that queries the database for relevant artwork info."""
    data = request.get_json() or {}
    message = (data.get("message") or "").strip().lower()
    if not message:
        return jsonify({"reply": "I didn't catch that. Try asking about artworks, categories, prices, or games!"})

    reply = _generate_chatbot_reply(message)
    return jsonify({"reply": reply})


def _generate_chatbot_reply(message: str) -> str:
    import re

    # ── GREETINGS ──
    if re.search(r"\b(hello|hi|hey|greetings|good\s*(morning|afternoon|evening)|hola|yo)\b", message):
        return (
            "Hi, I'm Riri — your pastel art guide at Ru's Art Vault! \u2665 "
            "Ask me about our artworks (count, categories, prices, ratings), "
            "art games, room suggestions, the artist, or how to navigate the site."
        )

    # ── THANKS / BYE ──
    if re.search(r"\b(thanks|thank\s*you|thx|bye|goodbye|see\s*ya|cya)\b", message):
        return "You're welcome! Enjoy exploring Ru's Art Vault. Come back anytime! \u2665"

    # ── HELP / WHAT CAN YOU DO ──
    if re.search(r"\b(help|what\s*can\s*you\s*do|how\s*.*work|commands|options|features)\b", message):
        return (
            "I can help you with: \u2022 Artwork count & categories \u2022 Prices & mediums "
            "\u2022 Room-style suggestions \u2022 Highest-rated & most-viewed pieces \u2022 Art games info "
            "\u2022 About the artist \u2022 How to sign up, rate, like, or leave feedback. Just ask!"
        )

    # ── ARTWORK COUNT ──
    if re.search(r"\b(how\s*many|count|number|total)\s*(artwork|art\s*piece|painting|piece|art)\b", message):
        count = Artwork.query.count()
        return f"There are currently {count} artworks in Ru's Art Vault. Browse them all in the Gallery!"

    # ── CATEGORIES ──
    if re.search(r"\b(categor|types?|kinds?|style|genre|sort)\b", message):
        cats = [row[0] for row in db.session.query(Artwork.category).distinct().order_by(Artwork.category).all()]
        if cats:
            joined = ", ".join(c.title() for c in cats)
            return f"Our artwork categories: {joined}. You can filter by any category on the Gallery page."
        return "No categories found yet. An admin can upload artworks to create categories."

    # ── PRICE ──
    if re.search(r"\b(price|cost|₹|how\s*much|expensive|cheap|budget|for\s*sale|buy)\b", message):
        prices = [r[0] for r in db.session.query(Artwork.price).distinct().all() if r[0] and r[0] != "On request"]
        on_req = any(p == "On request" for (p,) in db.session.query(Artwork.price).distinct().all())
        if prices:
            reply = f"Artwork prices range from {min(prices)} to {max(prices)}."
            if on_req:
                reply += " Some pieces are marked 'On request' — contact us for details."
            return reply
        return "Prices are shown on each artwork's detail page. Browse the Gallery to see them!"

    # ── MEDIUM ──
    if re.search(r"\b(medium|media|material|acrylic|oil|watercolor|digital|canvas|gouache|pastel|mixed)\b", message):
        mediums = [r[0] for r in db.session.query(Artwork.medium).distinct().order_by(Artwork.medium).all() if r[0]]
        if mediums:
            return f"We have artworks in: {', '.join(mediums)}. Each artwork detail page shows its medium."
        return "Each artwork lists its medium (acrylic, digital, watercolor, etc.) on its detail page."

    # ── SIZE ──
    if re.search(r"\b(size|dimension|inches?|large|small|big)\b", message):
        sizes = [r[0] for r in db.session.query(Artwork.size).distinct().all() if r[0]]
        if sizes:
            return f"Artwork sizes include: {', '.join(sizes)}. Check individual artwork pages for exact dimensions."
        return "Artwork sizes are shown on each detail page — ranging from small canvases to large statement pieces."

    # ── TOP RATED / BEST ──
    if re.search(r"\b(best|top|highest|rated|popular|favorite|recommend|suggest)\b", message):
        artworks = Artwork.query.all()
        if artworks:
            best = sorted(artworks, key=lambda a: a.average_rating, reverse=True)[:3]
            names = [f"{a.title} ({a.average_rating}\u2605)" for a in best if a.average_rating > 0]
            if names:
                return f"Our highest-rated artworks: {', '.join(names)}. Click on any artwork to see details and leave your own rating!"
            else:
                return "No ratings yet — be the first! Log in, browse the Gallery, and rate your favorite pieces."
        return "Browse the Gallery to discover beautiful artworks and rate them!"

    # ── MOST VIEWED ──
    if re.search(r"\b(most\s*viewed|popular|trending|hot|famous|known)\b", message):
        artworks = Artwork.query.order_by(Artwork.views.desc()).limit(3).all()
        if artworks:
            names = [f"{a.title} ({a.views} views)" for a in artworks if a.views > 0]
            if names:
                return f"Our most viewed pieces: {', '.join(names)}. Check them out in the Gallery!"
        return "Visit the Gallery to see all artworks — the most viewed ones are featured on the homepage!"

    # ── ROOM SUGGESTIONS ──
    if re.search(r"\b(room|bedroom|living|office|space|decor|wall|home|house|interior|decorate)\b", message):
        return (
            "Riri's room tips: \u2022 Bedroom: soft floral or landscape pieces for calm vibes "
            "\u2022 Living room: folk or traditional art for warmth \u2022 Office: abstract or geometric works "
            "for creative energy \u2022 Kids' room: colorful pastel game-art saved from the Art Arcade!"
        )

    # ── GAMES ──
    if re.search(r"\b(game|play|arcade|paint|puzzle|mandala|splash|pixel|graffiti|symphony|motion|chaos|collector|light|shadow)\b", message):
        games_list = [
            "Color Splash", "Pixel Painter", "Shape Symphony", "Abstract Motion",
            "Art Puzzle", "Canvas Chaos", "Graffiti Wall", "Mandala Maker",
            "Art Collector", "Light & Shadow"
        ]
        return f"Visit the Art Arcade to play: {', '.join(games_list)}. You can save your creations to the gallery too!"

    # ── ABOUT / ARTIST ──
    if re.search(r"\b(about|artist|who|rubina|ru|bio|journey|story|background|creator|made|built)\b", message):
        return (
            "Ru's Art Vault was created by Rubina Shaik — an artist who blends pastel palettes, "
            "Indian art inspiration, expressive portraits, and digital canvases. "
            "Visit the About page to see her bio, creative journey, achievements, certifications, and more!"
        )

    # ── SIGNUP / LOGIN / ACCOUNT ──
    if re.search(r"\b(sign\s*up|register|create\s*account|login|log\s*in|account|join)\b", message):
        return (
            "You can sign up for a free account to rate artworks, like your favorites, "
            "save game art, and leave feedback. Click 'Sign up' in the top menu to get started!"
        )

    # ── LIKE / HEART / WISHLIST ──
    if re.search(r"\b(like|heart|love|wishlist|save|bookmark|favorite)\b", message):
        return (
            "Click the heart button on any artwork to like it! You need to be logged in. "
            "Liked artworks are your personal favorites collection."
        )

    # ── RATE / RATING ──
    if re.search(r"\b(rate|rating|star|score|review)\b", message):
        return (
            "Logged-in visitors can rate artworks from 1 to 5 stars on each artwork's detail page. "
            "Ratings help other visitors discover the best pieces!"
        )

    # ── FEEDBACK ──
    if re.search(r"\b(feedback|comment|review|opinion|message|contact)\b", message):
        return (
            "We'd love your feedback! Visit the Feedback page to leave a comment. "
            "You can also leave artwork-specific feedback on individual artwork pages. "
            "All feedback is reviewed before being displayed."
        )

    # ── COLOR / PASTEL / THEME ──
    if re.search(r"\b(color|colour|pastel|shade|palette|theme|pink|blue|purple|white|tone)\b", message):
        return (
            "Ru's Art Vault uses a soft pastel palette: light blues, pinks, purples, and whites. "
            "This gives the gallery a dreamy, calm, and creative mood! You can toggle dark mode too."
        )

    # ── NAVIGATION / SITE ──
    if re.search(r"\b(navigate|site|website|pages?|where|find|go\s*to|menu|link)\b", message):
        return (
            "Navigate using the top menu: \u2022 Gallery — browse all artworks \u2022 Feedback — leave comments "
            "\u2022 Art Games — play mini games \u2022 About — learn about the artist. "
            "Use the category chips in the Gallery to filter by style!"
        )

    # ── AI / WHO ARE YOU ──
    if re.search(r"\b(who\s*are\s*you|your\s*name|are\s*you|riri|bot|ai|human|real)\b", message):
        return (
            "I'm Riri — the chatbot guide of Ru's Art Vault! I'm here to help you explore "
            "the gallery, discover artworks, learn about the artist, and find your way around. "
            "Think of me as your friendly pastel art companion! \u2665"
        )

    # ── FALLBACK ──
    fallbacks = [
        "I'm not sure I understood that. Try asking about: artworks, categories, prices, games, room suggestions, or the artist!",
        "Hmm, I didn't quite catch that. You can ask me things like 'How many artworks are there?', 'What categories do you have?', or 'Suggest art for my bedroom'.",
        "I'm still learning! Try questions like: 'Show me top-rated artworks', 'What games are available?', 'How do I leave feedback?', or 'Tell me about the artist'.",
        "Good question! I can help with artwork counts, categories, prices, ratings, room ideas, art games, and site navigation. What would you like to know?",
    ]
    import random as _random
    return _random.choice(fallbacks)


@app.errorhandler(404)
def not_found(_error):
    return render_template("base.html", page_title="Page not found"), 404


@app.errorhandler(403)
def forbidden(_error):
    return render_template("base.html", page_title="Access denied"), 403


@app.errorhandler(500)
def server_error(_error):
    db.session.rollback()
    return render_template("base.html", page_title="Something went wrong"), 500


with app.app_context():
    ensure_database_shape()
    create_sample_artworks()
    if not User.query.filter_by(username="admin").first():
        admin = User(username="admin", email="admin@artvault.com", is_admin=True)
        admin.set_password("admin123")
        db.session.add(admin)
        db.session.commit()
        print("Admin user created: admin / admin123")


if __name__ == "__main__":
    app.run(debug=True)
