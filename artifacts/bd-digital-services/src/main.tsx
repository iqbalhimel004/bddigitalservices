import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { getInitialTheme } from "./components/theme-provider";

if (getInitialTheme() === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
