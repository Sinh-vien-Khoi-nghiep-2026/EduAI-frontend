import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import Home from "./pages/Home";
import { RootLayout } from "./layout/RootLayout";

export function App() {
  return (
      <BrowserRouter>
        <Routes >
          <Route element={<RootLayout />}>
            <Route path="/" element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    );
}

export default App;
