import React from "react";
import "../styles/styles.css";

interface FeaturedPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
}

const FeaturedPostsSidebar: React.FC = () => {
  const featuredPosts: FeaturedPost[] = [
    {
      id: "torta-della-nonna",
      title: "Recipe: Torta della Nonna",
      excerpt:
        "Delicately fragranced with lemon both in its crème pâtissière filling and pastry case...",
      category: "RECIPES",
      date: "JUNE 19, 2018",
    },
    // Add more featured posts as needed
  ];

  return (
    <aside className="featured-sidebar">
      <h3 className="sidebar-title">Featured</h3>
      {featuredPosts.map((post, index) => (
        <div key={index} className="sidebar-post">
          <div className="post-date">{post.date}</div>
          <h4 className="post-title">{post.title}</h4>
          <p className="post-excerpt">{post.excerpt}</p>
          <a href={`/article/${post.id}`} className="post-category">
            {post.category}
          </a>
          {index !== featuredPosts.length - 1 && (
            <hr className="post-divider" />
          )}
        </div>
      ))}
    </aside>
  );
};

export default FeaturedPostsSidebar;
