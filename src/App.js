import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import NewsFeed from "./components/NewsFeed";
import Auth from "./components/Auth";
import Article from "./components/Article"; // Added Article component
import "./styles/styles.css";
import FeaturedPostsSidebar from "./components/FeaturedPostsSidebar";
import Footer from "./components/Footer";

const Layout = () => {
  return (
    <div className="app-container">
      <div className="main-content-container">
        <div className="content-wrapper">
          <NewsFeed />
        </div>
        <FeaturedPostsSidebar />
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <div className="container">
        <Header />
        <Routes>
          <Route path="/" element={<Layout />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/article/:id" element={<Article />} />{" "}
          {/* Added Article Route */}
        </Routes>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
