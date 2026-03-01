// ============================================
// TERIN Toolkit — Content Script Entry Point
// ============================================
// Injects the Command Palette into every web page.
// Uses a Shadow DOM to isolate styles from the host page.

import React from "react";
import ReactDOM from "react-dom/client";
import { CommandPalette } from "./CommandPalette";

// Only inject once
if (!document.getElementById("terin-command-palette-root")) {
    // Create the host container
    const host = document.createElement("div");
    host.id = "terin-command-palette-root";
    host.style.cssText = "all: initial; position: fixed; z-index: 2147483647; top: 0; left: 0;";
    document.body.appendChild(host);

    // Attach Shadow DOM for style isolation
    const shadow = host.attachShadow({ mode: "open" });

    // Inject scoped styles into the shadow DOM
    const style = document.createElement("style");
    style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .terin-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 20vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      z-index: 2147483647;
    }

    .terin-palette {
      background: #1c1c1e;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      width: 560px;
      max-width: 90vw;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
      overflow: hidden;
      animation: terin-slide-in 0.15s ease-out;
    }

    @keyframes terin-slide-in {
      from {
        opacity: 0;
        transform: translateY(-10px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .terin-input-wrapper {
      padding: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .terin-input {
      width: 100%;
      background: transparent;
      border: none;
      outline: none;
      color: #f5f5f7;
      font-size: 16px;
      line-height: 1.5;
      font-family: inherit;
    }

    .terin-input::placeholder {
      color: rgba(255, 255, 255, 0.35);
    }

    .terin-results {
      max-height: 300px;
      overflow-y: auto;
      padding: 8px;
    }

    .terin-result-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
      transition: background 0.1s;
    }

    .terin-result-item:hover,
    .terin-result-item.terin-active {
      background: rgba(255, 255, 255, 0.08);
      color: #f5f5f7;
    }

    .terin-result-icon {
      width: 20px;
      height: 20px;
      opacity: 0.6;
    }

    .terin-result-label {
      flex: 1;
    }

    .terin-result-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.5);
    }

    .terin-footer {
      padding: 10px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.3);
    }

    .terin-kbd {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .terin-kbd kbd {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      padding: 1px 5px;
      font-family: inherit;
      font-size: 10px;
    }
  `;
    shadow.appendChild(style);

    // Create the React mount point
    const mountPoint = document.createElement("div");
    shadow.appendChild(mountPoint);

    // Render the CommandPalette
    const root = ReactDOM.createRoot(mountPoint);
    root.render(React.createElement(CommandPalette));
}
