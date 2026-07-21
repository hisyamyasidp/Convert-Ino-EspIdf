# Arduino to ESP-IDF Converter 🔄

![UI Preview](https://img.shields.io/badge/UI-Modern_3D_Flip_Card-blue)
![Architecture](https://img.shields.io/badge/Architecture-100%25_Client--Side-brightgreen)
![Status](https://img.shields.io/badge/Status-Active-success)

A fast, fully client-side web application to seamlessly translate code between **Arduino** (`.ino`) and native **ESP-IDF** (`main.cpp`/`main.c`). 

Try it live here: **[https://hisyamyasidp.github.io/Convert-Ino-EspIdf/](https://hisyamyasidp.github.io/Convert-Ino-EspIdf/)**

---

## ✨ Features

* **Two-Way Conversion**:
  * `Arduino ➡️ ESP-IDF`: Automatically converts `setup()`/`loop()` to `app_main()`, maps Arduino core functions (`pinMode`, `digitalWrite`, `delay`) to ESP-IDF native functions (`gpio_set_direction`, `gpio_set_level`, `vTaskDelay`), and generates `CMakeLists.txt` automatically.
  * `ESP-IDF ➡️ Arduino`: Reverts `app_main()` and native ESP-IDF GPIO functions back into standard Arduino format.
* **Smart Wi-Fi Boilerplate Detection**: 
  * Automatically detects `#include <WiFi.h>`.
  * Generates native ESP-IDF NVS Flash initialization, LwIP event loops, and Wi-Fi Event Handlers for you.
  * Reverts them back cleanly when converting to Arduino.
* **Multi-File (.zip) Support**: Upload your entire project directory as a `.zip`. The tool translates the main file and safely copies over all your `.h` and `.cpp` helper files into the final generated `.zip`.
* **100% Client-Side (Privacy First)**: There is **no backend server**. The conversion engine and `.zip` file generation are handled entirely inside your browser using JavaScript and `JSZip`. Your code never leaves your computer!
* **Beautiful 3D UI**: Enjoy a modern Dark Mode interface with interactive 3D Flip Card animations.

## 🚀 How to Use

1. Compress your Arduino project folder (or ESP-IDF project folder) into a **`.zip`** file.
2. Go to the [Web App](https://hisyamyasidp.github.io/Convert-Ino-EspIdf/).
3. Use the toggle switch at the top to select your desired conversion direction.
4. Drag and Drop your `.zip` file into the designated zone.
5. Click **Convert**. The translated project will automatically download as a new `.zip` file.

## 🛠️ How it Works (Under the Hood)

The core translation engine uses a **Rule-Based Regex Parsing System** written in Vanilla JavaScript. 
- It parses the syntax strings to locate core Arduino API calls.
- Injects standard ESP-IDF includes (`freertos/FreeRTOS.h`, `driver/gpio.h`, etc.).
- Compiles a dynamic `CMakeLists.txt` linking the required ESP-IDF components based on the detected libraries (e.g., automatically adding `REQUIRES esp_wifi nvs_flash` if Wi-Fi is used).
- Re-bundles the folder structure using `JSZip` and creates a Blob URL for instant download.

## 👨‍💻 Author

Built by **hisyamyasidp**.
© 2026 hisyamyasidp. All rights reserved.
