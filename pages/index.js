import Head from "next/head";
import { useRef, useState } from "react";
import styles from "./index.module.css";

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
              {sender} {message}
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
