import React from "react";
import { Routes, Route } from "react-router-dom";

import Header from "./components/Header";
import NewsFeed from "./components/NewsFeed";
import Auth from "./components/Auth";
import Article from "./components/Article";
import "./styles/styles.css";
import Footer from "./components/Footer";
import { HeaderTags } from "./components/HeaderTags";

const Layout: React.FC = () => {
  return (
    <div className="app-container">
      <div className="main-content-container">
        <div className="content-wrapper">
          <NewsFeed />
        </div>
        {/* <FeaturedPostsSidebar /> */}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <div className="container">
      <Header />

      <Routes>
        <Route path="/" element={<Layout />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/article/:id" element={<Article />} />

        {/* Filtered news routes */}
        {Object.values(HeaderTags).map((tag: string) => (
          <Route key={tag} path={`/${tag}`} element={<NewsFeed tag={tag} />} />
        ))}
      </Routes>

      <Footer />
    </div>
  );
};

export default App;
