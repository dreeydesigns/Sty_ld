# Mobile Salon — Project Export & GitHub Integration Guide

This guide describes how to export your completed **Mobile Salon** project from the Google AI Studio environment as a ZIP archive or push it directly to your GitHub repository using the native sidebar/settings panels.

---

## 📦 How to Export as a ZIP File

If you want to download a local copy of the full codebase (complete with Next.js page routers, database configurations, and UI assets) to run on your personal machine or share with others, follow these steps:

1. **Locate the Settings Menu**:
   - In the **Google AI Studio** workspace, look at the top-right corner or the left-hand sidebar for the **Settings** gear icon (⚙️) or the project operations menu.
2. **Select "Export Project as ZIP"**:
   - Under the Project settings block, click on the **Export as ZIP** button.
3. **Download Process**:
   - AI Studio will package the entire directory (excluding bulky build caches or `node_modules` folders) into a standard `.zip` archive.
   - Your web browser will automatically prompt you to save the file locally.
4. **Local Execution**:
   - Once downloaded, extract the ZIP file on your computer.
   - Open your terminal in the extracted folder and run:
     ```bash
     npm install
     npm run dev
     ```
   - Your local environment will load with all the identical UI views and backend routes!

---

## 🚀 How to Push Your Project to GitHub

Integrating your project with GitHub allows you to store your code version history safely, deploy easily to hosts like Vercel or Netlify, and collaborate with other developers.

1. **Open the GitHub Panel**:
   - In the AI Studio sidebar, click on the **GitHub** integration icon (or open the **Project Settings** dropdown and locate **Link GitHub Repository**).
2. **Authorize Google AI Studio**:
   - If you haven't linked your GitHub account yet, click **Authorize** to connect your GitHub profile securely.
3. **Configure Repository Details**:
   - Select your GitHub username or organization from the dropdown.
   - Choose to link to an **Existing Repository** or select **Create New Repository**.
   - Set the repository name (e.g., `mobile-salon`) and select its privacy level (**Public** or **Private**).
4. **Commit & Push**:
   - Click the **Push Changes** / **Publish** button.
   - Google AI Studio will automatically configure the Git origin, generate a main branch, and commit all modified files (including the newly added `.env.example` configurations, the image compressions, and page features).
   - Once completed, a direct link to your active GitHub repository will be displayed in the UI.

---

## 🔑 A Note on API Keys & Environment Secrets

- **Do NOT commit private keys**: For security, your active `/.env` file containing actual private keys (like `CLOUDINARY_API_SECRET` or `AFRICASTALKING_API_KEY`) is automatically ignored by Git (configured in `.gitignore`).
- **Use the Secrets Panel**: When pushing to GitHub or deploying, make sure you configure your production hosting environment (e.g., Vercel, Firebase) with the secrets listed in your `/.env.example` file.
