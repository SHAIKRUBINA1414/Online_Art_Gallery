/* ── Theme Toggle ── */
const themeToggle = document.querySelector("#themeToggle");
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
  document.body.classList.add("dark");
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
  });
}

/* ── Toast Notification System ── */
function showToast(message, type) {
  type = type || "info";
  var container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-label", "Notifications");
    document.body.appendChild(container);
  }
  var toast = document.createElement("div");
  toast.className = "toast-message";
  toast.setAttribute("role", "alert");
  var icon = type === "success" ? "\u2714" : type === "danger" ? "\u2716" : "\u2139";
  toast.innerHTML = "<span>" + icon + "</span><span>" + escapeHtml(String(message)) + "</span><button class=\"toast-close\" aria-label=\"Dismiss\">&times;</button>";
  container.appendChild(toast);

  var closeBtn = toast.querySelector(".toast-close");
  closeBtn.addEventListener("click", function () {
    removeToast(toast);
  });

  window.setTimeout(function () {
    removeToast(toast);
  }, 4500);
}

function removeToast(toast) {
  toast.classList.add("removing");
  window.setTimeout(function () {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
}

function escapeHtml(str) {
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* ── Scroll-to-top ── */
function initScrollTop() {
  var btn = document.querySelector(".scroll-top-btn");
  if (!btn) {
    btn = document.createElement("button");
    btn.className = "scroll-top-btn";
    btn.setAttribute("aria-label", "Scroll to top");
    btn.innerHTML = "&#8593;";
    document.body.appendChild(btn);
  }
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        btn.classList.toggle("visible", window.scrollY > 400);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  btn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

document.addEventListener("DOMContentLoaded", function () {
  initScrollTop();
});

/* ── Chatbot with async API ── */
var chatbot = document.querySelector("#chatbot");
var chatToggle = document.querySelector(".chatbot-toggle");
var chatForm = document.querySelector("#chatForm");
var chatInput = document.querySelector("#chatInput");
var chatLog = document.querySelector("#chatLog");
var chatPending = false;

if (chatToggle && chatbot) {
  chatToggle.addEventListener("click", function () {
    chatbot.classList.toggle("open");
    if (chatbot.classList.contains("open")) {
      chatToggle.setAttribute("aria-expanded", "true");
    } else {
      chatToggle.setAttribute("aria-expanded", "false");
    }
  });
}

if (chatForm && chatInput && chatLog) {
  chatForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (chatPending) return;
    var message = chatInput.value.trim();
    if (!message) return;

    appendChatMessage("You", message);
    chatInput.value = "";
    chatLog.scrollTop = chatLog.scrollHeight;

    // Show typing indicator
    var typingEl = document.createElement("p");
    typingEl.className = "chat-typing";
    typingEl.innerHTML = "<b>Riri:</b> <span class=\"typing-dots\">typing<span>.</span><span>.</span><span>.</span></span>";
    chatLog.appendChild(typingEl);
    chatLog.scrollTop = chatLog.scrollHeight;

    chatPending = true;

    fetch("/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      // Remove typing indicator
      if (typingEl && typingEl.parentNode) {
        typingEl.parentNode.removeChild(typingEl);
      }
      appendChatMessage("Riri", data.reply || "Sorry, I couldn't process that. Try again!");
      chatLog.scrollTop = chatLog.scrollHeight;
    })
    .catch(function () {
      // Remove typing indicator
      if (typingEl && typingEl.parentNode) {
        typingEl.parentNode.removeChild(typingEl);
      }
      appendChatMessage("Riri", "Oops! I'm having trouble connecting. Please check your internet and try again.");
      chatLog.scrollTop = chatLog.scrollHeight;
    })
    .finally(function () {
      chatPending = false;
    });
  });
}

function appendChatMessage(sender, text) {
  var msg = document.createElement("p");
  var bold = document.createElement("b");
  bold.textContent = sender + ":";
  msg.appendChild(bold);
  msg.appendChild(document.createTextNode(" " + text));
  chatLog.appendChild(msg);
}

/* ── Heart form ── */
document.querySelectorAll(".heart-form").forEach(function (form) {
  if (form.tagName.toLowerCase() !== "form") return;
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    form.classList.add("popping");
    window.setTimeout(function () { form.submit(); }, 420);
  });
});

/* ── Throttled heart trail ── */
var heartTrailReady = true;
var heartTrailLayer = document.querySelector("#heartTrailLayer");
var trailThrottleMs = 110;

window.addEventListener("mousemove", function (event) {
  if (!heartTrailReady || !heartTrailLayer) return;
  heartTrailReady = false;
  var heart = document.createElement("span");
  heart.className = "cursor-heart";
  heart.textContent = "\u2665";
  heart.style.left = event.clientX + "px";
  heart.style.top = event.clientY + "px";
  heartTrailLayer.appendChild(heart);
  window.setTimeout(function () { heart.remove(); }, 900);
  window.setTimeout(function () {
    heartTrailReady = true;
  }, trailThrottleMs);
}, { passive: true });

/* ── Page fade on navigation ── */
document.querySelectorAll("a[href]").forEach(function (link) {
  var href = link.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("http")) return;
  link.addEventListener("click", function () {
    document.body.style.opacity = "0.72";
  });
});

/* ── Share / Copy ── */
document.querySelectorAll(".share-page").forEach(function (button) {
  button.dataset.originalText = button.textContent;
  button.addEventListener("click", async function () {
    var title = (button.closest("[data-share-title]") && button.closest("[data-share-title]").dataset.shareTitle) || document.title;
    var shareData = { title: title, text: "Explore this page on Ru's Art Vault.", url: window.location.href };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (e) { /* user cancelled */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      button.textContent = "Link copied";
      showToast("Link copied to clipboard!", "success");
    } catch (e) {
      showToast("Could not copy link. Please try again.", "danger");
    }
    window.setTimeout(function () {
      button.textContent = button.dataset.originalText || "Share";
    }, 1200);
  });
});

document.querySelectorAll(".copy-link").forEach(function (button) {
  button.addEventListener("click", async function () {
    try {
      await navigator.clipboard.writeText(window.location.href);
      button.textContent = "Copied";
      showToast("Link copied!", "success");
    } catch (e) {
      showToast("Could not copy link.", "danger");
    }
    window.setTimeout(function () {
      button.textContent = "Copy link";
    }, 1200);
  });
});

/* ── Art Game Canvas ── */
var canvas = document.querySelector("#artGame");
var clearGame = document.querySelector("#clearGame");
var saveGame = document.querySelector("#saveGame");
var saveToVault = document.querySelector("#saveToVault");
var gameMenu = document.querySelector("#gameMenu");
var gameHint = document.querySelector("#gameHint");
var gameColor = document.querySelector("#gameColor");
var brushSize = document.querySelector("#brushSize");
var brushTool = document.querySelector("#brushTool");
var gameStatus = document.querySelector("#gameStatus");
var gamePage = document.querySelector(".game-page");

if (canvas) {
  var ctx;
  try {
    ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not supported");
  } catch (e) {
    if (canvas.parentNode) {
      var fallback = document.createElement("div");
      fallback.className = "empty-state";
      fallback.textContent = "Your browser does not support the art canvas. Please use a modern browser to play the art games.";
      canvas.parentNode.replaceChild(fallback, canvas);
    }
    /* Stop: canvas is unavailable */
  }

  if (ctx) {
    var W = canvas.width;
    var H = canvas.height;
    var pastel = ["#bfe9ff", "#ffd1e6", "#d9c5ff", "#ffffff", "#c8f7f4", "#f7b7d2", "#cdb4ff"];
    var hints = {
      splash: "Color Splash: choose a brush or eraser, then drag to paint pastel splashes.",
      pixel: "Pixel Painter: paint grid cells with the selected tool. Use eraser to remove blocks.",
      symphony: "Shape Symphony: click to build combo bursts and keep the rhythm meter alive.",
      motion: "Abstract Motion: create particle trails that follow mouse movement.",
      puzzle: "Art Puzzle: click two tiles to swap them. Solve the image in the fewest moves.",
      chaos: "Canvas Chaos: hit matching target shapes, avoid wrong colors, and protect your lives.",
      graffiti: "Graffiti Wall: use spray, ribbon, round, square, or eraser tools.",
      mandala: "Mandala Maker: draw symmetrical patterns with brush tools or erase them.",
      collector: "Art Collector: use arrow keys or WASD, collect frames, avoid moving paint blobs.",
      light: "Light & Shadow: move the light to reveal hidden stars before time runs out."
    };
    var mode = "splash";
    var selectedTile = null;
    var puzzleTiles = [];
    var puzzleSource = null;
    var puzzleMoves = 0;
    var chaos = { target: "#ffd1e6", score: 0, lives: 3, round: 1, shapes: [] };
    var collector = { player: { x: 80, y: 80 }, pieces: [], enemies: [], score: 0, lives: 3, keys: {}, won: false, hitCooldown: 0 };
    var lightGame = { stars: [], found: 0, time: 35 };
    var pointer = { x: W / 2, y: H / 2 };
    var particles = [];
    var lastPoint = null;

    function random(max) { return Math.random() * max; }
    function color() { return pastel[Math.floor(Math.random() * pastel.length)]; }
    function currentTool() { return brushTool ? brushTool.value : "round"; }
    function currentSize() { return brushSize ? Number(brushSize.value) : 18; }

    function setStatus(text) {
      if (gameStatus) gameStatus.textContent = text;
    }

    function brushPaint(point, options) {
      options = options || {};
      var tool = options.tool || currentTool();
      var size = options.size || currentSize();
      var paintColor = tool === "eraser" || options.erase ? (mode === "graffiti" ? "#f2edf7" : "#ffffff") : (gameColor ? gameColor.value : "#d96fa8");
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = tool === "eraser" ? 0.95 : (options.alpha || 0.78);
      if (tool === "spray") {
        for (var i = 0; i < size * 2; i += 1) {
          ctx.fillStyle = paintColor;
          ctx.beginPath();
          ctx.arc(point.x + random(size * 2) - size, point.y + random(size * 2) - size, random(3) + 1, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (tool === "square") {
        ctx.fillStyle = paintColor;
        ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
      } else if (tool === "ribbon" && lastPoint) {
        ctx.strokeStyle = paintColor;
        ctx.lineWidth = Math.max(4, size / 2);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.quadraticCurveTo((lastPoint.x + point.x) / 2, point.y - 28, point.x, point.y);
        ctx.stroke();
      } else {
        ctx.fillStyle = paintColor;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      lastPoint = point;
    }

    function clearCanvas(fill) {
      fill = fill || "#ffffff";
      ctx.globalAlpha = 1;
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, W, H);
    }

    function canvasPoint(event) {
      var rect = canvas.getBoundingClientRect();
      var point = event.touches ? event.touches[0] : event;
      return {
        x: (point.clientX - rect.left) * (W / rect.width),
        y: (point.clientY - rect.top) * (H / rect.height)
      };
    }

    function drawPixelGrid() {
      clearCanvas("#fbf8ff");
      var cell = W / 32;
      ctx.strokeStyle = "#eadff7";
      for (var x = 0; x <= W; x += cell) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (var y = 0; y <= H; y += cell) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    }

    function drawPuzzleBase() {
      var grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#bfe9ff");
      grad.addColorStop(0.45, "#ffd1e6");
      grad.addColorStop(1, "#d9c5ff");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,.48)";
      for (var i = 0; i < 22; i += 1) {
        ctx.beginPath();
        ctx.arc(random(W), random(H), 40 + random(100), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(60,50,80,.26)";
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(120, 500);
      ctx.bezierCurveTo(300, 170, 560, 760, 820, 310);
      ctx.bezierCurveTo(960, 70, 1050, 400, 1120, 270);
      ctx.stroke();
    }

    function setupPuzzle() {
      clearCanvas();
      drawPuzzleBase();
      puzzleSource = document.createElement("canvas");
      puzzleSource.width = W;
      puzzleSource.height = H;
      puzzleSource.getContext("2d").drawImage(canvas, 0, 0);
      var cols = 4;
      var rows = 3;
      puzzleMoves = 0;
      puzzleTiles = [];
      for (var row = 0; row < rows; row += 1) {
        for (var col = 0; col < cols; col += 1) {
          puzzleTiles.push({ home: row * cols + col, source: row * cols + col });
        }
      }
      do {
        puzzleTiles.sort(function () { return Math.random() - 0.5; });
      } while (puzzleTiles.every(function (tile, index) { return tile.source === index; }));
      selectedTile = null;
      renderPuzzle();
    }

    function renderPuzzle() {
      clearCanvas("#fbf8ff");
      var cols = 4;
      var rows = 3;
      puzzleTiles.forEach(function (tile, index) {
        var sx = (tile.source % cols) * W / cols;
        var sy = Math.floor(tile.source / cols) * H / rows;
        var dx = (index % cols) * W / cols;
        var dy = Math.floor(index / cols) * H / rows;
        ctx.drawImage(puzzleSource, sx, sy, W / cols, H / rows, dx, dy, W / cols, H / rows);
        ctx.strokeStyle = selectedTile === index ? "#d96fa8" : "#ffffff";
        ctx.lineWidth = selectedTile === index ? 10 : 4;
        ctx.strokeRect(dx, dy, W / cols, H / rows);
      });
      setStatus(puzzleTiles.every(function (tile, index) { return tile.source === index; }) ? "Solved in " + puzzleMoves + " moves" : "Moves: " + puzzleMoves);
    }

    function setupChaos() {
      var keepScore = chaos.score || 0;
      var keepLives = chaos.lives || 3;
      var nextRound = chaos.round || 1;
      chaos = { target: color(), score: keepScore, lives: keepLives, round: nextRound, shapes: [] };
      for (var i = 0; i < 20; i += 1) {
        chaos.shapes.push({ x: 70 + random(W - 140), y: 95 + random(H - 175), r: 22 + random(32), c: color(), sides: 3 + Math.floor(random(5)), hit: false });
      }
      for (var i2 = 0; i2 < 5; i2 += 1) {
        chaos.shapes.push({ x: 70 + random(W - 140), y: 95 + random(H - 175), r: 24 + random(34), c: chaos.target, sides: 3 + Math.floor(random(5)), hit: false });
      }
      renderChaos();
    }

    function renderChaos() {
      clearCanvas("#fbf8ff");
      ctx.fillStyle = "#27323a";
      ctx.font = "28px system-ui";
      ctx.fillText("Target color: " + chaos.target, 34, 48);
      chaos.shapes.forEach(function (shape) {
        if (shape.hit) return;
        ctx.fillStyle = shape.c;
        ctx.beginPath();
        for (var i = 0; i < shape.sides; i += 1) {
          var angle = (Math.PI * 2 * i) / shape.sides - Math.PI / 2;
          var px = shape.x + Math.cos(angle) * shape.r;
          var py = shape.y + Math.sin(angle) * shape.r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      });
      setStatus("Score: " + chaos.score + " | Lives: " + chaos.lives + " | Round: " + chaos.round);
      if (chaos.lives <= 0) {
        ctx.fillStyle = "rgba(255,255,255,.82)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#a01565";
        ctx.font = "bold 54px Montserrat, sans-serif";
        ctx.fillText("Game over", W / 2 - 140, H / 2);
        ctx.font = "26px Poppins, sans-serif";
        ctx.fillText("Press Clear to restart Canvas Chaos.", W / 2 - 205, H / 2 + 44);
      }
    }

    function setupCollector() {
      collector = { player: { x: 80, y: 80 }, pieces: [], enemies: [], score: 0, lives: 3, keys: {}, won: false, hitCooldown: 0 };
      for (var i = 0; i < 12; i += 1) {
        collector.pieces.push({ x: 80 + random(W - 160), y: 80 + random(H - 160), got: false, c: color() });
      }
      for (var i2 = 0; i2 < 5; i2 += 1) {
        collector.enemies.push({ x: 160 + random(W - 260), y: 130 + random(H - 230), vx: random(4) + 2, vy: random(4) + 2, r: 22 + random(12) });
      }
      renderCollector();
    }

    function renderCollector() {
      clearCanvas("#fbf8ff");
      ctx.fillStyle = "#27323a";
      ctx.font = "28px system-ui";
      ctx.fillText("Collect the art frames. Avoid moving paint blobs.", 34, 48);
      collector.pieces.forEach(function (piece) {
        if (piece.got) return;
        ctx.fillStyle = piece.c;
        ctx.fillRect(piece.x - 18, piece.y - 22, 36, 44);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        ctx.strokeRect(piece.x - 18, piece.y - 22, 36, 44);
      });
      collector.enemies.forEach(function (enemy) {
        ctx.fillStyle = "rgba(160,21,101,.72)";
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.38)";
        ctx.beginPath();
        ctx.arc(enemy.x - enemy.r / 3, enemy.y - enemy.r / 4, enemy.r / 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = "#d96fa8";
      ctx.beginPath();
      ctx.arc(collector.player.x, collector.player.y, 24, 0, Math.PI * 2);
      ctx.fill();
      setStatus("Collected: " + collector.score + "/12 | Lives: " + collector.lives);
      if (collector.won || collector.lives <= 0) {
        ctx.fillStyle = "rgba(255,255,255,.82)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = collector.won ? "#2f6f73" : "#a01565";
        ctx.font = "bold 54px Montserrat, sans-serif";
        ctx.fillText(collector.won ? "You collected every frame!" : "Game over", W / 2 - 280, H / 2);
        ctx.font = "26px Poppins, sans-serif";
        ctx.fillText("Press Clear to play again.", W / 2 - 140, H / 2 + 44);
      }
    }

    function renderLight() {
      clearCanvas("#f7f0ff");
      lightGame.stars.forEach(function (star) {
        var near = Math.hypot(star.x - pointer.x, star.y - pointer.y) < 115;
        if (near) star.found = true;
        if (!star.found && !near) return;
        ctx.fillStyle = star.found ? "#ffe879" : "rgba(255,232,121,.42)";
        ctx.beginPath();
        for (var i = 0; i < 10; i += 1) {
          var radius = i % 2 === 0 ? 16 : 7;
          var angle = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
          var px = star.x + Math.cos(angle) * radius;
          var py = star.y + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      });
      var objects = [{ x: 240, y: 360, w: 120, h: 150 }, { x: 520, y: 260, w: 170, h: 230 }, { x: 850, y: 330, w: 140, h: 180 }];
      objects.forEach(function (obj) {
        var dx = obj.x - pointer.x;
        var dy = obj.y - pointer.y;
        ctx.fillStyle = "rgba(70,50,90,.28)";
        ctx.save();
        ctx.translate(dx * 0.12, dy * 0.12);
        ctx.fillRect(obj.x + obj.w * 0.2, obj.y + obj.h * 0.82, obj.w * 1.2, 42);
        ctx.restore();
        ctx.fillStyle = "#ffd1e6";
        ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 8;
        ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
      });
      var glow = ctx.createRadialGradient(pointer.x, pointer.y, 10, pointer.x, pointer.y, 290);
      glow.addColorStop(0, "rgba(255,255,255,.92)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      lightGame.found = lightGame.stars.filter(function (star) { return star.found; }).length;
      setStatus("Stars found: " + lightGame.found + "/" + lightGame.stars.length);
    }

    function setupLight() {
      pointer = { x: W / 2, y: H / 2 };
      lightGame = { stars: [], found: 0, time: 35 };
      for (var i = 0; i < 10; i += 1) {
        lightGame.stars.push({ x: 90 + random(W - 180), y: 100 + random(H - 190), found: false });
      }
      renderLight();
    }

    function switchMode(nextMode) {
      mode = nextMode;
      selectedTile = null;
      lastPoint = null;
      if (gameHint) gameHint.textContent = hints[mode];
      setStatus("");
      if (mode === "pixel") drawPixelGrid();
      else if (mode === "puzzle") setupPuzzle();
      else if (mode === "chaos") {
        chaos = { target: "#ffd1e6", score: 0, lives: 3, round: 1, shapes: [] };
        setupChaos();
      }
      else if (mode === "collector") setupCollector();
      else if (mode === "light") setupLight();
      else clearCanvas(mode === "graffiti" ? "#f2edf7" : "#ffffff");
    }

    function splash(point) {
      if (currentTool() === "eraser") {
        brushPaint(point, { erase: true, size: currentSize() * 1.4 });
        return;
      }
      for (var i = 0; i < 9; i += 1) {
        var splashPoint = { x: point.x + random(54) - 27, y: point.y + random(54) - 27 };
        if (currentTool() === "round") {
          ctx.fillStyle = Math.random() > 0.45 ? color() : gameColor.value;
          ctx.globalAlpha = 0.48;
          ctx.beginPath();
          ctx.arc(splashPoint.x, splashPoint.y, random(currentSize()) + 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          brushPaint(splashPoint, { alpha: 0.42, size: random(currentSize()) + 8 });
        }
      }
    }

    function drawMandala(point) {
      var cx = W / 2;
      var cy = H / 2;
      var dx = point.x - cx;
      var dy = point.y - cy;
      for (var i = 0; i < 12; i += 1) {
        var angle = (Math.PI * 2 * i) / 12;
        var rx = cx + dx * Math.cos(angle) - dy * Math.sin(angle);
        var ry = cy + dx * Math.sin(angle) + dy * Math.cos(angle);
        brushPaint({ x: rx, y: ry }, { size: currentSize() / 1.6 });
      }
    }

    function handleDraw(event) {
      var point = canvasPoint(event);
      pointer = point;
      if (mode === "splash") splash(point);
      if (mode === "pixel") {
        var cell = W / 32;
        var gx = Math.floor(point.x / cell) * cell;
        var gy = Math.floor(point.y / cell) * cell;
        ctx.fillStyle = currentTool() === "eraser" ? "#fbf8ff" : gameColor.value;
        ctx.fillRect(gx, gy, cell, cell);
        ctx.strokeStyle = "#eadff7";
        ctx.strokeRect(gx, gy, cell, cell);
        setStatus(currentTool() === "eraser" ? "Erasing pixels" : "Painting pixels");
      }
      if (mode === "symphony") {
        for (var i = 0; i < 10; i += 1) {
          ctx.save();
          ctx.translate(point.x, point.y);
          ctx.rotate(random(Math.PI * 2));
          ctx.fillStyle = color();
          ctx.globalAlpha = 0.65;
          ctx.fillRect(random(120), random(70), 18 + random(80), 18 + random(80));
          ctx.restore();
        }
        ctx.globalAlpha = 1;
        setStatus("Combo burst +10");
      }
      if (mode === "graffiti") {
        if (currentTool() === "spray" || currentTool() === "round") {
          for (var i2 = 0; i2 < 38; i2 += 1) {
            brushPaint({ x: point.x + random(90) - 45, y: point.y + random(90) - 45 }, { alpha: 0.12, size: random(8) + 2 });
          }
        } else {
          brushPaint(point, { alpha: currentTool() === "eraser" ? 0.95 : 0.45 });
        }
        ctx.globalAlpha = 1;
      }
      if (mode === "mandala") drawMandala(point);
      if (mode === "light") renderLight();
    }

    canvas.addEventListener("click", function (event) {
      var point = canvasPoint(event);
      if (mode === "puzzle") {
        var col = Math.floor(point.x / (W / 4));
        var row = Math.floor(point.y / (H / 3));
        var index = row * 4 + col;
        if (selectedTile === null) selectedTile = index;
        else {
          var tmp = puzzleTiles[selectedTile];
          puzzleTiles[selectedTile] = puzzleTiles[index];
          puzzleTiles[index] = tmp;
          puzzleMoves += 1;
          selectedTile = null;
        }
        renderPuzzle();
        return;
      }
      if (mode === "chaos") {
        if (chaos.lives <= 0) return;
        var hit = chaos.shapes.find(function (shape) { return Math.hypot(shape.x - point.x, shape.y - point.y) < shape.r; });
        if (hit && hit.c === chaos.target) {
          hit.hit = true;
          chaos.score += 10;
        } else {
          chaos.lives -= 1;
        }
        if (!chaos.shapes.some(function (shape) { return !shape.hit && shape.c === chaos.target; }) && chaos.lives > 0) {
          chaos.round += 1;
          setupChaos();
          return;
        }
        renderChaos();
        return;
      }
      handleDraw(event);
    });

    canvas.addEventListener("mousemove", function (event) {
      pointer = canvasPoint(event);
      if (mode === "motion") {
        particles.push({ x: pointer.x, y: pointer.y, vx: random(5) - 2.5, vy: random(5) - 2.5, life: 42, c: color() });
      }
      if (event.buttons === 1) handleDraw(event);
      if (mode === "light") renderLight();
    });

    canvas.addEventListener("mousedown", function () {
      lastPoint = null;
    });

    canvas.addEventListener("mouseup", function () {
      lastPoint = null;
    });

    canvas.addEventListener("touchmove", function (event) {
      event.preventDefault();
      handleDraw(event);
    }, { passive: false });

    canvas.addEventListener("touchend", function () {
      lastPoint = null;
    });

    window.addEventListener("keydown", function (event) {
      if (["arrowright", "arrowleft", "arrowdown", "arrowup", "w", "a", "s", "d"].indexOf(event.key.toLowerCase()) !== -1 && mode === "collector") {
        event.preventDefault();
      }
      collector.keys[event.key.toLowerCase()] = true;
    });
    window.addEventListener("keyup", function (event) {
      collector.keys[event.key.toLowerCase()] = false;
    });

    function animate() {
      if (mode === "motion") {
        ctx.fillStyle = "rgba(255,255,255,.08)";
        ctx.fillRect(0, 0, W, H);
        particles.forEach(function (p) {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 1;
          ctx.globalAlpha = Math.max(p.life / 42, 0);
          ctx.fillStyle = p.c;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        particles = particles.filter(function (p) { return p.life > 0; });
      }
      if (mode === "collector") {
        if (collector.won || collector.lives <= 0) {
          renderCollector();
          requestAnimationFrame(animate);
          return;
        }
        var speed = 5;
        if (collector.keys.arrowright || collector.keys.d) collector.player.x += speed;
        if (collector.keys.arrowleft || collector.keys.a) collector.player.x -= speed;
        if (collector.keys.arrowdown || collector.keys.s) collector.player.y += speed;
        if (collector.keys.arrowup || collector.keys.w) collector.player.y -= speed;
        collector.player.x = Math.max(24, Math.min(W - 24, collector.player.x));
        collector.player.y = Math.max(24, Math.min(H - 24, collector.player.y));
        collector.enemies.forEach(function (enemy) {
          enemy.x += enemy.vx;
          enemy.y += enemy.vy;
          if (enemy.x < enemy.r || enemy.x > W - enemy.r) enemy.vx *= -1;
          if (enemy.y < enemy.r + 70 || enemy.y > H - enemy.r) enemy.vy *= -1;
        });
        collector.pieces.forEach(function (piece) {
          if (!piece.got && Math.hypot(piece.x - collector.player.x, piece.y - collector.player.y) < 44) {
            piece.got = true;
            collector.score += 1;
          }
        });
        if (collector.hitCooldown > 0) collector.hitCooldown -= 1;
        var touchedEnemy = collector.enemies.some(function (enemy) { return Math.hypot(enemy.x - collector.player.x, enemy.y - collector.player.y) < enemy.r + 22; });
        if (touchedEnemy && collector.hitCooldown <= 0) {
          collector.lives -= 1;
          collector.hitCooldown = 70;
          collector.player.x = 80;
          collector.player.y = 80;
        }
        if (collector.score >= collector.pieces.length) collector.won = true;
        renderCollector();
      }
      requestAnimationFrame(animate);
    }

    if (gameMenu) {
      gameMenu.addEventListener("click", function (event) {
        var button = event.target.closest("button[data-game]");
        if (!button) return;
        gameMenu.querySelectorAll("button").forEach(function (item) { item.classList.remove("active"); });
        button.classList.add("active");
        switchMode(button.dataset.game);
      });
    }

    if (clearGame) {
      clearGame.addEventListener("click", function () { switchMode(mode); });
    }

    if (saveGame) {
      saveGame.addEventListener("click", function () {
        try {
          var link = document.createElement("a");
          link.download = "pastel-" + mode + "-art.png";
          link.href = canvas.toDataURL("image/png");
          link.click();
          showToast("Artwork saved to your device!", "success");
        } catch (e) {
          showToast("Could not save the artwork. Please try again.", "danger");
        }
      });
    }

    if (saveToVault) {
      saveToVault.addEventListener("click", async function () {
        saveToVault.disabled = true;
        saveToVault.textContent = "Saving...";
        var title = window.prompt("Name your artwork:", "My " + hints[mode].split(":")[0] + " Artwork");
        if (!title) {
          saveToVault.disabled = false;
          saveToVault.textContent = "Save to gallery";
          return;
        }
        try {
          var response = await fetch("/games/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title,
              game: hints[mode].split(":")[0],
              image: canvas.toDataURL("image/png")
            })
          });
          var data = await response.json();
          if (data.ok) {
            window.location.href = data.url;
          } else {
            showToast(data.message || "Could not save artwork.", "danger");
          }
        } catch (error) {
          showToast("Could not save artwork. Please try again.", "danger");
        } finally {
          saveToVault.disabled = false;
          saveToVault.textContent = "Save to gallery";
        }
      });
    }

    switchMode(gamePage ? gamePage.dataset.game : "splash");
    animate();
  }
}

/* ── Vertical Up-Down Carousel (About page) ── */
(function () {
  var track = document.getElementById("carouselTrack");
  var upBtn = document.getElementById("carouselUp");
  var downBtn = document.getElementById("carouselDown");
  var dotsContainer = document.getElementById("carouselDots");

  if (!track || !upBtn || !downBtn || !dotsContainer) return;

  var slides = Array.from(track.querySelectorAll(".carousel-slide"));
  if (slides.length === 0) return;

  var current = 0;
  var total = slides.length;

  // Build dots
  slides.forEach(function (_, i) {
    var dot = document.createElement("button");
    dot.setAttribute("aria-label", "Go to slide " + (i + 1));
    dot.addEventListener("click", function () { goTo(i); });
    dotsContainer.appendChild(dot);
  });

  var dots = Array.from(dotsContainer.querySelectorAll("button"));

  function updateSlides(idx, direction) {
    slides.forEach(function (slide, i) {
      slide.classList.remove("active", "exit-up", "exit-down");
      if (i === current && i !== idx) {
        slide.classList.add(direction === "up" ? "exit-down" : "exit-up");
      }
    });

    current = idx;
    slides[current].classList.add("active");

    dots.forEach(function (dot, i) {
      dot.classList.toggle("active", i === current);
    });
  }

  function goTo(idx) {
    if (idx === current) return;
    var direction = idx > current ? "up" : "down";
    updateSlides(idx, direction);
  }

  function next() {
    var idx = (current + 1) % total;
    updateSlides(idx, "up");
  }

  function prev() {
    var idx = (current - 1 + total) % total;
    updateSlides(idx, "down");
  }

  // Initialize first slide
  slides[0].classList.add("active");
  dots[0].classList.add("active");

  upBtn.addEventListener("click", prev);
  downBtn.addEventListener("click", next);

  // Keyboard navigation when carousel is focused
  track.addEventListener("keydown", function (e) {
    if (e.key === "ArrowUp") { e.preventDefault(); prev(); }
    if (e.key === "ArrowDown") { e.preventDefault(); next(); }
  });

  // Touch swipe
  var touchStartY = 0;
  track.addEventListener("touchstart", function (e) {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  track.addEventListener("touchend", function (e) {
    var diff = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
    }
  });

  // Mouse wheel
  track.addEventListener("wheel", function (e) {
    e.preventDefault();
    if (e.deltaY > 30) next();
    if (e.deltaY < -30) prev();
  }, { passive: false });

  // Auto-rotate every 5 seconds
  var autoTimer = setInterval(next, 5000);

  // Pause auto-rotate on hover
  track.addEventListener("mouseenter", function () { clearInterval(autoTimer); });
  track.addEventListener("mouseleave", function () { autoTimer = setInterval(next, 5000); });

  // Pause when touching
  track.addEventListener("touchstart", function () { clearInterval(autoTimer); });
  track.addEventListener("touchend", function () { autoTimer = setInterval(next, 5000); });
})();
