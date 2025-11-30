// src/components/Ad.tsx
import React, { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const Ad: React.FC = () => {
  useEffect(() => {
    // Refresh or reload the ad when this component is rendered
    window.adsbygoogle && window.adsbygoogle.push({});
  }, []);

  return (
    <div
      className="ad-container"
      style={{ marginTop: "50px", textAlign: "center" }}
    >
      <ins className="adsbygoogle" style={{ display: "block" }}></ins>
    </div>
  );
};

export default Ad;
