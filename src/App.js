import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import NewsFeed from "./components/NewsFeed";
import Auth from "./components/Auth";
import Article from "./components/Article"; // Added Article component
import "./styles/styles.css";

const App = () => {
  return (
    <Router>
      <div className="container">
        <Header />
        <Routes>
          <Route path="/" element={<NewsFeed />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/article/:id" element={<Article />} />{" "}
          {/* Added Article Route */}
        </Routes>
      </div>
    </Router>
  );
};

export default App;
