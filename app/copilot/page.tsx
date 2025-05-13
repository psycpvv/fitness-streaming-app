"use client";
import React from "react";
import Header from "./components/Header";
import PostureChecker from "./components/PostureChecker";
import Footer from "./components/Footer";

const Page = () => {
  return (
    <div>
      <Header />
      <main>
        <PostureChecker />
      </main>
      <Footer />
    </div>
  );
};

export default Page;
