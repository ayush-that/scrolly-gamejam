import type { NextPage } from "next";
import Head from "next/head";
import dynamic from "next/dynamic";

const HomeView = dynamic(() => import("../views").then((mod) => ({ default: mod.HomeView })), {
  ssr: false,
});

const Home: NextPage = (props) => {
  return (
    <div className="w-full">
      <Head>
        <title>Solana Scaffold</title>
        <meta name="description" content="Solana Scaffold" />
      </Head>
      <HomeView />
    </div>
  );
};

export default Home;
