# Screen OCR

A powerful, cross-platform screen capture and OCR (Optical Character Recognition) tool built with **Electron**, **Vite**, **React**, and **TypeScript**. 

Instantly capture any part of your screen, extract text or scan QR codes, and copy the result to your clipboard.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Electron](https://img.shields.io/badge/Electron-29.0.0-blueviolet)
![React](https://img.shields.io/badge/React-18.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## 🚀 Features

- **Screen Capture & OCR**: Select any area on your screen to extract text.
- **QR & Barcode Scanning**: Instantly read QR codes and barcodes from your screen.
- **Clipboard Integration**: Automatically copies extracted text to your clipboard.
- **Multi-Language Support**: Supports multiple languages including English, Turkish, German, French, Spanish, and more.
- **History Tracking**: Keeps track of your last 10 scans for quick access via the system tray.
- **Auto-Save**: Option to automatically save results (TXT & JSON) to a local directory.
- **Global Shortcuts**:
  - `Ctrl + Shift + O`: Start OCR Capture
  - `Ctrl + Shift + Q`: Start QR/Barcode Capture
- **System Tray**: Quick access to history, settings, and capture modes.
- **Cross-Platform**: Designed for Linux, Windows, and macOS (External tools optimized for Linux).

## 🛠️ Technology Stack

- **Core**: [Electron](https://www.electronjs.org/)
- **Frontend**: [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **OCR Engine**: [Tesseract](https://github.com/tesseract-ocr/tesseract) (System-installed CLI for performance) & Tesseract.js
- **QR Engine**: `zbarimg` (from `zbar-tools`)

## 📋 Prerequisites (Linux)

For the application to function correctly on Linux, you need to install a few system dependencies:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install tesseract-ocr tesseract-ocr-tur tesseract-ocr-deu libnotify-bin zbar-tools

# Screen capture tools (Install at least one)
sudo apt install gnome-screenshot
# OR
sudo apt install scrot
# OR
sudo apt install imagemagick
```

> **Note:** The application uses external system tools (`tesseract`, `zbarimg`, `notify-send`) for better performance and system integration on Linux.

## 📦 Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/screen-ocr.git
    cd screen-ocr
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Run in Development Mode**
    ```bash
    npm run dev
    ```

4.  **Build for Production**
    ```bash
    npm run build
    ```

## 🎮 Usage

1.  **Launch the application**. It will minimize to the system tray.
2.  Press **`Ctrl + Shift + O`** (or your custom shortcut) to freeze the screen.
3.  **Click and drag** to select the area containing text.
4.  The application will process the image, extract text, and show a notification.
5.  The text is now in your **Clipboard**!
6.  For QR codes, use **`Ctrl + Shift + Q`**.

## ⚙️ Configuration

Access the **Settings** menu via the System Tray icon to:
- Change the target OCR language.
- Customize keyboard shortcuts.
- Enable/Disable auto-saving of results.
- Choose the save directory.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Author:** Aras
