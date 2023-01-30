import Head from "next/head";
import { useRef, useState, useCallback, useMemo } from "react";
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
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css"; // `rehype-katex` does not import the CSS for you
import { DesmosCalculator } from "../components/desmos";
import { useDefaultLogic } from "@client";

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
  const {
    messages,
    onSubmit,
    loading,
    prompt,
    setPrompt,
    fileInputRef,
    uploadImage,
    image,
  } = useDefaultLogic();

  const renderedMessages = useMemo(
    () =>
      [...messages].reverse().map(({ sender, message }, index) => {
        const latex = [...message.matchAll(/\$.*?\$/g)];
        let formatted = latex.length ? message.replaceAll("`", "") : message;
        let desmos = [];

        formatted = formatted.replace(
          /(?:<desmos>|<Desmos>)([\w\W\s]*?)(?:<\/desmos>|<\/Desmos>)/g,
          (raw, extracted) => {
            desmos.push(extracted.replaceAll("\n", ""));
            return extracted;
          }
        );

        console.log({ desmos });

        return (
          <div
            className={`${styles.message} ${
              sender.includes("Human") && styles.human
            }`}
            key={index}
          >
            {sender}
            <ReactMarkdown
              rehypePlugins={[rehypeRaw, rehypeKatex]}
              remarkPlugins={[remarkMath]}
              components={CodeBlock}
            >
              {formatted}
            </ReactMarkdown>
            {desmos.length ? <DesmosCalculator formulas={desmos} /> : null}
          </div>
        );
      }),
    [messages]
  );

  return (
    <div className={styles.container}>
      <Head>
        <title>OpenAI Quickstart</title>
        <link rel="icon" href="/dog.png" />
      </Head>

      <main className={styles.main}>
        <div className={styles.result}>{renderedMessages}</div>
        <form onSubmit={(evt) => onSubmit(evt, "solver")}>
          <input
            type="text"
            placeholder={loading ? "AI is thinking..." : "Ask your question:"}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            autoComplete="off"
            autoFocus={true}
          />
          <div
            className={styles.attachment}
            onClick={() => fileInputRef.current.click()}
          >
            <input
              type="file"
              onChange={uploadImage}
              ref={fileInputRef}
              hidden
            />
            {image ? (
              <img src={image.Location} />
            ) : (
              <img src="/attachment.svg" />
            )}
          </div>
          <input type="submit" value="Send" />
        </form>
      </main>
    </div>
  );
}
