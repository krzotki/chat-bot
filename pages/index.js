import Head from "next/head";
import { useRef, useState } from "react";
import styles from "./index.module.css";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import tsx from "react-syntax-highlighter/dist/cjs/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/cjs/languages/prism/typescript";
import scss from "react-syntax-highlighter/dist/cjs/languages/prism/scss";
import bash from "react-syntax-highlighter/dist/cjs/languages/prism/bash";
import markdown from "react-syntax-highlighter/dist/cjs/languages/prism/markdown";
import json from "react-syntax-highlighter/dist/cjs/languages/prism/json";
import python from "react-syntax-highlighter/dist/cjs/languages/prism/python";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import dynamic from "next/dynamic";

const MathComponent = dynamic(
  () => import("mathjax-react").then((mod) => mod.MathComponent),
  {
    ssr: false,
  }
);

SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("scss", scss);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("python", python);

const CodeBlock = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    if (match && match[1].toLowerCase().includes("tex")) {
      const tex = String(children).replace("```", "");
      return <MathComponent tex={tex} />;
    }

    return !inline && match ? (
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={match[1].toLowerCase()}
        PreTag="div"
        {...props}
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};

export default function Home() {
  const [prompt, setPrompt] = useState("");

  const resultsRef = useRef();

  const [messages, setMessages] = useState([]);

  async function onSubmit(event) {
    event.preventDefault();

    const newMessages = [...messages, { sender: "Human: ", message: prompt }];

    setMessages(newMessages);

    const conversation = newMessages.reduce(
      (prev, curr, index) => prev + curr.sender + curr.message + "\n",
      ""
    );

    setPrompt("");

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: conversation + "AI: " }),
    });

    const { result } = await response.json();
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        sender: "AI: ",
        message: result[0].text.replace("\n", ""),
      },
    ]);
  }

  console.log({ messages });

  return (
    <div className={styles.container}>
      <Head>
        <title>OpenAI Quickstart</title>
        <link rel="icon" href="/dog.png" />
      </Head>

      <main className={styles.main}>
        <div className={styles.result} ref={resultsRef}>
          {[...messages].reverse().map(({ sender, message }, index) => (
            <div
              className={`${styles.message} ${
                sender.includes("Human") && styles.human
              }`}
              key={index}
            >
              {sender}
              <ReactMarkdown rehypePlugins={[rehypeRaw]} components={CodeBlock}>
                {message}
              </ReactMarkdown>
            </div>
          ))}
        </div>
        <form onSubmit={onSubmit}>
          <input
            type="text"
            placeholder="Ask your question:"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            autoComplete="off"
          />
          <input type="submit" value="Send" />
        </form>
      </main>
    </div>
  );
}
