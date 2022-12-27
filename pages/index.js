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
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [image, setImage] = useState();
  const fileInputRef = useRef();

  const uploadImage = useCallback(async (evt) => {
    const files = evt.target.files;
    if (!files.length) {
      return;
    }
    const data = new FormData();
    data.append("name", files[0].name);
    data.append("file", files[0]);

    const imageResponse = await fetch("/api/upload", {
      method: "POST",
      credentials: "same-origin",
      body: data,
    });

    const { image } = await imageResponse.json();

    // const image = {
    //   Location:
    //     "https://krzotki-chatbot-images.s3.eu-central-1.amazonaws.com/1672154559985_Bez%C2%A0tytu%C5%82u.png",
    // };

    setImage(image);
  }, []);

  const onSubmit = useCallback(
    async function (event) {
      event.preventDefault();

      if (loading) {
        return;
      }

      const newMessages = [
        ...messages,
        {
          sender: "Human: ",
          message:
            prompt + (image ? `\n ![attachment](${image?.Location})` : ""),
        },
      ];

      setMessages(newMessages);

      const conversation = newMessages.reduce(
        (prev, curr, index) => prev + curr.sender + curr.message + "\n",
        ""
      );

      setPrompt("");
      setLoading(true);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          prompt: conversation,
          attachment: image?.Location,
        }),
      });

      setImage(undefined);
      fileInputRef.current.value = "";

      setLoading(false);
      const { result } = await response.json();
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          sender: "AI: ",
          message: result,
        },
      ]);
    },
    [messages, prompt, loading, image]
  );

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

  console.log({ messages });

  return (
    <div className={styles.container}>
      <Head>
        <title>OpenAI Quickstart</title>
        <link rel="icon" href="/dog.png" />
      </Head>

      <main className={styles.main}>
        <div className={styles.result}>{renderedMessages}</div>
        <form onSubmit={onSubmit}>
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
