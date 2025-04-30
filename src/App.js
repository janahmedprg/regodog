import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import NewsFeed from "./components/NewsFeed";
import Auth from "./components/Auth";
import Article from "./components/Article";
import CreateArticle from "./components/CreateArticle";
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
          <Route path="/article/:id" element={<Article />} />
          <Route path="/create" element={<CreateArticle />} />
          <Route path="/bakery" element={<NewsFeed tag="bakery" />} />
          <Route
            path="/standard_schnouzer"
            element={<NewsFeed tag="standard_schnouzer" />}
          />
          <Route path="/farm_house" element={<NewsFeed tag="farm_house" />} />
          <Route path="/anything" element={<NewsFeed tag="anything" />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
