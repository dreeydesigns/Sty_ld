import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export class CDPBrowser {
  constructor(options = {}) {
    this.port = options.port || 9444;
    this.browserProcess = null;
    this.userDataDir = path.join(process.cwd(), ".browser-profile-e2e");
    this.browserPath = fs.existsSync("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe")
      ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
      : "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  }

  async launch() {
    if (fs.existsSync(this.userDataDir)) {
      try {
        fs.rmSync(this.userDataDir, { recursive: true, force: true });
      } catch {}
    }
    fs.mkdirSync(this.userDataDir, { recursive: true });

    this.browserProcess = spawn(this.browserPath, [
      `--remote-debugging-port=${this.port}`,
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--window-size=1280,800",
      `--user-data-dir=${this.userDataDir}`
    ], { stdio: "ignore" });

    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${this.port}/json/version`);
        if (res.ok) {
          return this;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 250));
    }
    throw new Error("Failed to start headless browser via CDP on port " + this.port);
  }

  async newPage() {
    let target = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const listRes = await fetch(`http://127.0.0.1:${this.port}/json/list`);
        const targets = await listRes.json();
        target = targets.find(t => t.type === "page");
        if (target) break;
      } catch {}
      await new Promise(r => setTimeout(r, 200));
    }

    if (!target) {
      const newRes = await fetch(`http://127.0.0.1:${this.port}/json/new`, { method: "PUT" });
      target = await newRes.json();
    }

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    const page = new CDPPage(ws, target.id, this.port);
    await page.init();
    return page;
  }

  async close() {
    if (this.browserProcess && this.browserProcess.pid) {
      try {
        execSync(`taskkill /F /T /PID ${this.browserProcess.pid}`, { stdio: "ignore" });
      } catch {}
      this.browserProcess = null;
    }
    if (fs.existsSync(this.userDataDir)) {
      try {
        fs.rmSync(this.userDataDir, { recursive: true, force: true });
      } catch {}
    }
  }
}

export class CDPPage {
  constructor(ws, targetId, port) {
    this.ws = ws;
    this.targetId = targetId;
    this.port = port;
    this.idCounter = 1;
    this.callbacks = new Map();
    this.consoleLogs = [];
    this.pageErrors = [];
    this.pageLoadResolver = null;

    this.ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { resolve, reject } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) {
            reject(new Error(data.error.message || JSON.stringify(data.error)));
          } else {
            resolve(data.result);
          }
        } else if (data.method === "Page.loadEventFired") {
          if (this.pageLoadResolver) {
            const res = this.pageLoadResolver;
            this.pageLoadResolver = null;
            res();
          }
        } else if (data.method === "Runtime.consoleAPICalled") {
          const text = (data.params.args || []).map(a => a.value ?? a.description ?? "").join(" ");
          this.consoleLogs.push({ type: data.params.type, text });
        } else if (data.method === "Runtime.exceptionThrown") {
          this.pageErrors.push(data.params.exceptionDetails?.text || "Unknown exception");
        }
      } catch (err) {}
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.idCounter++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async init() {
    await this.send("Page.enable");
    await this.send("Runtime.enable");
    await this.send("DOM.enable");
  }

  async goto(url, { timeout = 20000 } = {}) {
    this.consoleLogs = [];
    this.pageErrors = [];

    await new Promise(async (resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.pageLoadResolver = null;
          resolve();
        }
      }, timeout);

      this.pageLoadResolver = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          setTimeout(resolve, 600); // brief pause for client hydration
        }
      };

      try {
        await this.send("Page.navigate", { url });
      } catch {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve();
        }
      }
    });
  }

  async setViewport({ width, height, deviceScaleFactor = 1, isMobile = false }) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width: Math.round(width),
      height: Math.round(height),
      deviceScaleFactor,
      mobile: isMobile
    });
    await new Promise(r => setTimeout(r, 100));
  }

  async evaluate(fn, ...args) {
    let fnStr;
    if (typeof fn === "string") {
      fnStr = fn;
    } else {
      const serializedArgs = args.map(a => JSON.stringify(a)).join(",");
      fnStr = `(${fn.toString()})(${serializedArgs})`;
    }
    const res = await this.send("Runtime.evaluate", {
      expression: fnStr,
      returnByValue: true,
      awaitPromise: true
    });
    if (res && res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res?.result?.value;
  }

  async click(selector) {
    const res = await this.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      el.scrollIntoView({ block: "center", inline: "center" });
      el.click();
      return true;
    }, selector);
    if (!res) throw new Error(`Element not found for selector: ${selector}`);
    await new Promise(r => setTimeout(r, 300));
  }

  async waitForSelector(selector, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const found = await this.evaluate((sel) => !!document.querySelector(sel), selector);
      if (found) return true;
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error(`Timeout waiting for selector: ${selector}`);
  }

  async screenshot({ path: filePath }) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(res.data, "base64");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);

    const artifactDir = "C:\\Users\\Muti\\.gemini\\antigravity\\brain\\e39183a4-4cb5-4bd1-a198-6715d2b684ce\\screenshots";
    try {
      fs.mkdirSync(artifactDir, { recursive: true });
      const base = path.basename(filePath);
      fs.writeFileSync(path.join(artifactDir, base), buffer);
    } catch {}

    return buffer;
  }

  async close() {
    try {
      this.ws.close();
      await fetch(`http://127.0.0.1:${this.port}/json/close/${this.targetId}`);
    } catch {}
  }
}
