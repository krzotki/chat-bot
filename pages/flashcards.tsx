import Head from "next/head";
import React from "react";
import { useRef, useState, useCallback, useMemo } from "react";
import styles from "./flashcards.module.css";
import cx from "classnames";
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
import { Dictaphone, tempQuestions } from "@client";

SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("scss", scss);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("python", python);

type QuestionType = {
  topic: string;
  question: string;
};

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
  const textareaRef = useRef<HTMLTextAreaElement>();
  const answerTextareaRef = useRef<HTMLTextAreaElement>();
  const [groupedQuestions, setQuestions] = useState<QuestionType[]>();
  const [currentQuestion, setCurrentQuestion] = useState<QuestionType>();

  const [answeredQuestions, setAnsweredQuestions] = React.useState([]);

  const [submitted, setSubmitted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [aiAnswer, setAiAnswer] = React.useState();

  const onSubmit = useCallback(() => {
    const content = textareaRef?.current.value;
    if (!content) {
      return;
    }
    let topic = "";

    const questions = content
      .split("\n")
      .reduce<QuestionType[]>((prev, current) => {
        const last = prev[prev.length - 1];
        let match = current.match(/^\d+/gm);
        if (match && match.length) {
          return [
            ...prev,
            {
              topic,
              question: current.trimEnd(),
            },
          ];
        }

        const endingChar = last?.question.slice(-1);

        const currentFirstChar = current[0];
        const isUppperCase =
          currentFirstChar === currentFirstChar.toUpperCase();

        const currentEndingChar = current.slice(-1);

        if (
          (endingChar && ![".", "?"].includes(endingChar) && !isUppperCase) ||
          [".", "?"].includes(currentEndingChar)
        ) {
          const continuedQuestion = `${last.question} ${current}`;
          return [
            ...prev.slice(0, -1),
            {
              topic,
              question: continuedQuestion,
            },
          ];
        }

        topic = current;

        return prev;
      }, []);

    setQuestions(questions);
    serveQuestion(questions);
  }, [textareaRef]);

  const serveQuestion = React.useCallback((questions) => {
    const index = Math.floor(Math.random() * questions.length);
    const q = questions[index];
    setCurrentQuestion(q);
    setQuestions((current) => {
      const newQuestions = [...current];
      newQuestions.splice(index, 1);
      return newQuestions;
    });
  }, []);

  const onSubmitAnswer = React.useCallback(
    async (override?: string) => {
      const answer = override || answerTextareaRef?.current.value;
      if (!answer?.length) {
        alert("Please write an answer!");
        return;
      }

      console.log({ currentQuestion, answer });

      setSubmitted(true);

      const { question, topic } = currentQuestion;
      setLoading(true);
      const response = await fetch("/api/flash_answer", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          topic,
          question,
          userAnswer: answer,
        }),
      });

      const { result } = await response.json();
      setLoading(false);
      setAiAnswer(result);
    },
    [answerTextareaRef, currentQuestion]
  );

  const onDontKnow = React.useCallback(
    () => onSubmitAnswer("Niestety nie znam odpowiedzi na te pytanie."),
    [onSubmitAnswer]
  );

  const nextQuestion = React.useCallback(() => {
    answerTextareaRef.current.value = "";
    setAnsweredQuestions((current) => [...current, currentQuestion]);
    setSubmitted(false);
    setLoading(false);
    setAiAnswer(undefined);
    serveQuestion(groupedQuestions);
  }, [groupedQuestions]);

  const sendTrascript = React.useCallback(
    (transcript: string) => {
      answerTextareaRef.current.value = transcript;
    },
    [answerTextareaRef]
  );

  return (
    <div className={styles.container}>
      <Head>
        <title>Flashcards</title>
      </Head>

      <main className={styles.main}>
        {currentQuestion ? (
          <div className={styles.question}>
            <h2>{currentQuestion.topic}</h2>
            <p>{currentQuestion.question}</p>
            <textarea
              ref={answerTextareaRef}
              disabled={submitted}
              className={cx(styles.answerTextarea, styles.answer, styles.human)}
            ></textarea>

            {!submitted && (
              <>
                <Dictaphone sendTrascript={sendTrascript} />
                <div className={styles.buttons}>
                  <button
                    onClick={onDontKnow}
                    className={cx(styles.button, styles.buttonRed)}
                  >
                    I don't know
                  </button>
                  <button
                    onClick={() => onSubmitAnswer()}
                    className={cx(styles.button, styles.buttonBlue)}
                  >
                    Submit answer
                  </button>
                </div>
              </>
            )}
            {loading && <p>AI is thinking...</p>}
            {aiAnswer && (
              <>
                <div className={cx(styles.answer)}>
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                    remarkPlugins={[remarkMath]}
                    components={CodeBlock}
                  >
                    {aiAnswer}
                  </ReactMarkdown>
                </div>
                <button
                  onClick={nextQuestion}
                  className={cx(styles.button, styles.buttonBlue)}
                >
                  Next question
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <h1 className={styles.header}>Put here your questions</h1>
            <textarea
              ref={textareaRef}
              defaultValue={tempQuestions}
              className={styles.textarea}
            ></textarea>
            <button onClick={onSubmit} className={styles.button}>
              Submit
            </button>
          </>
        )}
      </main>
    </div>
  );
}
