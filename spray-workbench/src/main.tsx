import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { WorkbenchProvider } from "./state/WorkbenchProvider";
import "./styles/index.css";
import "./styles/product-workflow.css";

const redirect = new URLSearchParams(window.location.search).get("redirect");
if (redirect) {
  window.history.replaceState(null, "", `/print/${redirect}`);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename="/print">
      <WorkbenchProvider>
        <App />
      </WorkbenchProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
