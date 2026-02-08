import "@web/styles.css";

import ReactDOM from "react-dom/client";
import { App } from "./app";

const rootElement = document.getElementById("app");

if (rootElement && !rootElement.innerHTML) {
	rootElement.style.height = "100dvh";

	const root = ReactDOM.createRoot(rootElement);
	root.render(<App />);
}
