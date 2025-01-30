import React from "react";
import Header from "./components/Header";
import NewsFeed from "./components/NewsFeed";
import Auth from "./components/Auth";
import "./styles/styles.css";

const App = () => {
  return (
    <div className="container">
      <Header />
      <Auth />
      <NewsFeed />
    </div>
  );
};

export default App;
