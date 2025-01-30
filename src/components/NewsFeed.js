import React from "react";

const NewsItem = ({ title, content, link, button }) => (
  <div className="news-item">
    <p className="news-title">{title}</p>
    <p className="news-content">{content}</p>
    {link && <p className="news-link">{link}</p>}
    {button && <button className="news-button">{button}</button>}
  </div>
);

const NewsFeed = () => (
  <div className="news-feed">
    <h2 className="news-header">NEWS FEED</h2>
    <NewsItem 
      title="1/28/2025 AKC Meet the Breeds" 
      content="I had so many awesome talks with the AKC Meet the Breeds visitors who commented on Blueberry’s and Valegro’s collars - love NYC, nothing you can’t find here! Have you seen these before?" 
      link="{LINK to STANDARD SCHNAUZER}"
      button="Read the Article"
    />
    <NewsItem 
      title="1/28/2025 Czech green pea soup anyone?" 
      content="I had so many awesome talks with the AKC Meet the Breeds visitors who commented on Blueberry’s and Valegro’s collars - love NYC, nothing you can’t find here! Have you seen these before?" 
      link="[LINK to THE CZECH RESTAURANT]"
    />
    <NewsItem 
      title="1/28/2025 The question: What are we going to cook today?" 
      content="Does your mom also ask you for cooking ideas? Do you also run out of lunch or dinner ideas?" 
      link="[LINK to THE CZECH RESTAURANT]"
    />
  </div>
);

export default NewsFeed;
