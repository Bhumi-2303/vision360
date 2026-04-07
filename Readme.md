# Vision360 - Virtual Campus Explorer

A 360° virtual campus tour platform built with Pannellum.js and Firebase.

## 🚀 For Users

Vision360 allows you to explore the campus virtually using high-quality 360° panoramas.

### Features
- **360° Campus Exploration:** Look around and experience the campus dynamically.
- **Interactive Navigation:** Click on hotspots to seamlessly transition between different locations, buildings, and rooms.
- **Auto Virtual Tour:** Sit back and let the system guide you circularly through the campus automatically.

### How to Use
Simply navigate to the deployed web application link from the maintainer and start clicking around! You can use your mouse or touchscreen to pan around scenes, and click on floating markers to travel to new spots. No installation is required.

---

## 💻 For Developers

Welcome! If you want to contribute, test, or build upon Vision360, follow the guide below to set up your local development environment.

### Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Bhumi-2303/vision360.git
   cd vision360
   ```

2. **Install Dependencies:**
   Ensure you have Node.js installed, then run:
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Ensure you have your Firebase configuration set up if you intend to interact with the database. The project uses Firebase for hosting, Firestore for database management, and Firebase Storage/Cloudinary for 360 images.

### Running the Project for Development

**To start the local development server (Recommended for UI & Frontend Work):**
```bash
npm run dev
```
> **Note:** This command starts the Vite development server with Hot Module Replacement (HMR) for the fastest development experience.

**Alternative - Running the full stack (Node.js Server + Firebase Hosting Emulator):**
```bash
npm start
```
> **Note:** This will start both the local node server (`server.js`) and the Firebase hosting emulator concurrently.

### Available Scripts

- `npm run dev` - Starts the Vite development server.
- `npm start` - Runs the backend `server.js` and the Firebase hosting emulator.
- `npm run build` - Builds the application for production into the `dist/` directory.
- `npm run firebase:host` - Runs just the Firebase Hosting emulator.
- `npm run test` - Runs the Vitest test suite.
- `npm run lint` - Runs ESLint to check for syntax and stylistic errors.
- `npm run format` - Runs Prettier to auto-format the codebase.

### Project Structure
- `public/`: Contains all static assets, HTML, entry JavaScript files, and CSS.
  - `admin/`: Admin dashboard files.
  - `css/`: Modular CSS styling base.
  - `js/`: Modular JavaScript logic pieces.
- `dist/`: Generated optimized build output (created after running `npm run build`).
- `tests/`: Unit and integration test suites.
- `server.js`: Express server primarily used for backend integrations or legacy APIs.

### Additional Documentation

- **Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md) for instructions on how to submit Pull Requests.
- **Code of Conduct:** Please adhere to our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) when interacting in this community.