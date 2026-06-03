Deployment instructions

1) Create a new repository on your GitHub account (example name: `ART_GALLERY`).

2) Locally, add the remote and push your code (run in project root):

```bash
git remote remove origin || true
git remote add origin https://github.com/SHAIKRUBINA1414/ART_GALLERY.git
git branch -M main
git add --all
git commit -m "Prepare app + CI/CD workflow"
git push -u origin main
```

3) Configure GitHub repository secrets (Settings -> Secrets -> Actions) if you want automatic deploy:
- `RENDER_API_KEY` and `RENDER_SERVICE_ID` — to deploy to Render (optional)
- `HEROKU_API_KEY` and `HEROKU_APP_NAME` — to deploy to Heroku (optional)

If you don't set deploy secrets, the workflow will still run tests and build/publish a Docker image to GitHub Container Registry (GHCR).

4) After pushing, check Actions tab — CI will run on push. If you want me to push the repo for you, provide the repo name and confirm you created a Personal Access Token with `repo` permissions and paste it here (or run the push commands above locally).