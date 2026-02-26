import React from "react";
import { Routes, Route } from "react-router-dom";

import Header from "./components/Header";
import NewsFeed from "./components/NewsFeed";
import Auth from "./components/Auth";
import ResetPassword from "./components/ResetPassword";
import Article from "./components/Article";
import "./styles/styles.css";
import Footer from "./components/Footer";
import { HeaderTags } from "./components/HeaderTags";
import type { SSRData } from "./ssr/types";

interface LayoutProps {
  initialNewsItems?: SSRData["newsItems"];
}

interface AppProps {
  initialData?: SSRData;
}

const Layout: React.FC<LayoutProps> = ({ initialNewsItems }) => {
  return (
    <div className="app-container">
      <div className="main-content-container">
        <div className="content-wrapper">
          <NewsFeed initialNewsItems={initialNewsItems} />
        </div>
        {/* <FeaturedPostsSidebar /> */}
      </div>
    </div>
  );
};

const App: React.FC<AppProps> = ({ initialData }) => {
  return (
    <div className="container">
      <Header />

      <Routes>
        <Route
          path="/"
          element={<Layout initialNewsItems={initialData?.newsItems} />}
        />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/forgot-password" element={<Auth initialView="forgot" />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route
          path="/article/:id"
          element={<Article initialArticle={initialData?.article} />}
        />

        {/* Filtered news routes */}
        {Object.values(HeaderTags).map((tag: string) => (
          <Route
            key={tag}
            path={`/${tag}`}
            element={
              <NewsFeed
                tag={tag}
                initialNewsItems={
                  initialData?.tag === tag ? initialData.newsItems : undefined
                }
              />
            }
          />
        ))}
      </Routes>

      <Footer />
    </div>
  );
};

export default App;
