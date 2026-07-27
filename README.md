# 🌌 Energy Threads

<sub>elevate.n.thrive</sub>

An interactive **AI-powered hand tracking visual experience** that creates glowing “energy threads” between your fingertips in real-time using your webcam.

👉 Move your hands closer, pull them apart, and watch digital energy flow between them.

---

## ✨ Features

* 🖐️ Real-time **hand tracking (2 hands)**
* 🌈 Dynamic **energy threads between fingertips**
* 🔮 Glowing **crystal-like hand structures**
* ⚡ Smooth animations with wave distortion effects
* 🎥 Works directly in the browser (no installation)
* 🔐 Runs on **secure HTTPS (camera access)**

---

## 🛠️ Tech Stack

* HTML5
* CSS3 (Glow + Visual Effects)
* JavaScript (Canvas API)
* MediaPipe Hands (AI Hand Tracking)

---

## 🧠 How It Works

This project combines **computer vision + canvas graphics** to create an interactive visual system:

### 1. Webcam Input

* Uses:

  ```js
  navigator.mediaDevices.getUserMedia()
  ```
* Captures live video from your webcam

---

### 2. Hand Detection (AI)

* Powered by **MediaPipe Hands**
* Detects:

  * 21 landmarks per hand
  * Fingertip positions (important for visuals)

👉 Example:

* Thumb tip → index 4
* Index tip → index 8
* Middle tip → index 12

---

### 3. Coordinate Mapping

* MediaPipe gives normalized coordinates (0 → 1)
* Converted to screen pixels:

  ```js
  x = (1 - lm.x) * canvas.width
  y = lm.y * canvas.height
  ```

---

### 4. Drawing the Visuals

#### 🔷 Crystal Shape (Hand Aura)

* Creates a **convex hull** around hand points
* Draws glowing polygon → looks like energy field

---

#### 🌈 Energy Threads

* Connects fingertips using:

  * Straight + curved lines
  * Wave distortion using `sin()` for movement

```js
const wave = Math.sin(time * 2.5 + stretch * 8)
```

👉 This creates the “alive” flowing effect

---

#### ⚡ Multi-layer Effects

* **Primary threads** → same fingers (index to index)
* **Secondary threads** → cross connections
* **Glow + blur + shadow** → neon effect

---

#### 🔵 Fingertip Nodes

* Drawn as glowing dots
* Outer glow + inner white core

---

### 5. Animation Loop

* Uses:

  ```js
  requestAnimationFrame(render)
  ```
* Continuously updates:

  * Hand positions
  * Energy movement
  * Glow pulse

---

## 📦 Installation & Setup

```bash
git clone https://github.com/your-username/energy-threads.git
cd energy-threads
```

Then simply open:

```bash
index.html
```

OR deploy using:

* Vercel
* Netlify
* GitHub Pages

---

## ⚠️ Important Notes

* Camera permission is required
* Works best on:

  * Chrome / Edge
* Needs good lighting for detection

---


## 📬 Connect

Created with ❤️ by **Riya Raghuwanshi**

Follow  → elevate.n.thrive [ https://www.instagram.com/elevate.n.thrive/ ]

Subscribe → Elevate N Thrive [ https://www.youtube.com/@ElevateandThrive-e2 ]

---

## ⭐ Support

If you like this project:
👉 Star the repo
👉 Share with friends
👉 Tag on LinkedIn / Instagram

---

