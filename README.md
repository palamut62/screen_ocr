# Screen OCR

A powerful, cross-platform screen capture and OCR (Optical Character Recognition) tool built with **Electron**, **Vite**, **React**, and **TypeScript**.

Instantly capture any part of your screen, extract text, scan QR codes, recognize handwriting, extract tables, and copy the result to your clipboard.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Electron](https://img.shields.io/badge/Electron-29.0.0-blueviolet)
![React](https://img.shields.io/badge/React-18.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## Screenshot

![Screen OCR Screenshot](public/screenshoot.png)

## Linux Setup

### Prerequisites
The application requires the following system tools to be installed for full functionality:
- **Tesseract OCR**: `sudo apt install tesseract-ocr` (and language packs like `tesseract-ocr-tur`)
- **ZBar**: `sudo apt install zbar-tools` (for QR/Barcode reading)
- **Scrot/ImageMagick**: `sudo apt install scrot imagemagick` (for advanced screen capture and image processing)

### Installation
You can build the application for Linux using:
```bash
npm run build:linux
```
This will generate `AppImage`, `deb`, `rpm`, and `snap` packages in the `dist` directory.
- **AppImage**: Simply make it executable and run.
- **Deb**: Install using `sudo dpkg -i screen-ocr_*.deb`.

## Features

- **Screen Capture & OCR**: Select any area on your screen to extract text
- **Handwriting Recognition**: Extract text from handwritten notes
- **Table Extraction**: Capture tables and convert them to Markdown format
- **QR & Barcode Scanning**: Instantly read QR codes and barcodes from your screen
- **Translation Support**: Auto-translate extracted text to your preferred language (using translate-shell)
- **Auto Language Detection**: Automatically detect the language of captured text
- **Editor Window**: Review and edit extracted text before copying
- **Dark/Light Theme**: Choose your preferred theme in settings
- **Clipboard Integration**: Automatically copies extracted text to your clipboard
- **Multi-Language OCR**: Supports multiple languages including English, Turkish, German, French, Spanish, Russian, Arabic, Chinese, Japanese, Korean, and more
- **History Tracking**: Keeps track of your last 10 scans for quick access via the system tray
- **Auto-Save**: Option to automatically save results (TXT & JSON) to a local directory
- **Global Shortcuts**:
  - `Ctrl + Shift + O`: OCR Capture (Text)
  - `Ctrl + Shift + H`: Handwriting Capture
  - `Ctrl + Shift + T`: Table Capture
  - `Ctrl + Shift + Q`: QR/Barcode Capture
- **System Tray**: Quick access to history, settings, and all capture modes
- **Minimal UI**: Clean, distraction-free capture interface
- **Cross-Platform**: Designed for Linux, Windows, and macOS

## Technology Stack

- **Core**: [Electron](https://www.electronjs.org/)
- **Frontend**: [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **OCR Engine**: [Tesseract](https://github.com/tesseract-ocr/tesseract) (System CLI)
- **QR Engine**: `zbarimg` (from `zbar-tools`)
- **Translation**: `translate-shell` (optional)

## Prerequisites (Linux)

For the application to function correctly on Linux, install these system dependencies:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install tesseract-ocr tesseract-ocr-tur tesseract-ocr-deu libnotify-bin zbar-tools

# Screen capture tools (Install at least one)
sudo apt install scrot
# OR
sudo apt install imagemagick

# Optional: For translation support
sudo apt install translate-shell

# Optional: Additional OCR languages
sudo apt install tesseract-ocr-fra tesseract-ocr-spa tesseract-ocr-rus tesseract-ocr-ara tesseract-ocr-chi-sim tesseract-ocr-jpn tesseract-ocr-kor
```

> **Note:** The application uses external system tools (`tesseract`, `zbarimg`, `notify-send`, `scrot`) for better performance and system integration on Linux.

## Installation

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

## Usage

1.  **Launch the application**. It will minimize to the system tray.
2.  Press **`Ctrl + Shift + O`** to freeze the screen and start OCR capture.
3.  **Click and drag** to select the area containing text.
4.  The application will process the image, extract text, and show a notification.
5.  The text is now in your **Clipboard**!

### Capture Modes

| Shortcut | Mode | Description |
|----------|------|-------------|
| `Ctrl + Shift + O` | OCR | Extract printed text |
| `Ctrl + Shift + H` | Handwriting | Recognize handwritten text |
| `Ctrl + Shift + T` | Table | Extract tables as Markdown |
| `Ctrl + Shift + Q` | QR/Barcode | Scan QR codes and barcodes |

## Configuration

Access the **Settings** menu via the System Tray icon to:

- **OCR Language**: Select target language(s) for text recognition
- **Auto-Detect Language**: Automatically detect text language
- **Translation**: Enable translation and choose target language
- **Editor Window**: Show editor to review/edit text before copying
- **Theme**: Switch between Dark and Light mode
- **Keyboard Shortcuts**: Customize capture shortcuts
- **Auto-Save**: Enable automatic saving of results
- **Save Directory**: Choose where to save results
- **Auto-Start**: Launch application on system startup

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Author:** Aras
