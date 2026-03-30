# Vision360 - Virtual Campus Explorer

A 360° virtual campus tour platform built with Pannellum.js and Firebase.

## Features
- 360° campus exploration
- Interactive scene hotspot navigation
- Dynamic scene management via Admin Dashboard
- Cloud storage for panoramas

## Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Bhumi-2303/vision360.git
   cd vision360
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Ensure you have your Firebase configuration. You can run the app locally using `.env` variables if needed, though Firebase is primarily initialized using static config.

4. **Run Development Server:**
   ```bash
   npm run dev
   ```
   This will start both the local node server and the Firebase hosting emulator.

## Scripts
- `npm run dev` - Starts development servers.
- `npm run build` - Builds the application using Vite.
- `npm run test` - Runs the test suite via Vitest.
- `npm run lint` - Runs ESLint to check for stylistic and programmatic errors.
- `npm run format` - Runs Prettier to auto-format the codebase.

## Project Structure
- `public/`: Contains all static assets, HTML, JavaScript, and CSS.
  - `admin/`: Admin dashboard files.
  - `css/`: Modular CSS files.
  - `js/`: Modular JavaScript files.
- `dist/`: Generated build output.
- `tests/`: Unit and integration test suites.

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Code of Conduct
Please adhere to our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).