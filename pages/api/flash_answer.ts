import { Configuration, OpenAIApi } from "openai";
import AWS from "aws-sdk";
import { compareTwoStrings } from "string-similarity";

export const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

AWS.config.update({ region: "eu-central-1" });

const ddb = new AWS.DynamoDB.DocumentClient();

const context = [
  "The following is a conversation with an AI assistant.",
  "The assistant is helpful, creative, clever, and very friendly.",
  "This conversation is some sort of Q&A where user provides question and his answer for given question.",
  "Assistant will validate user's answer and based on it's validity will give constructive or positive feedback.",
  "If the answer is incorrect, assistant will write a correct answer",
  "If the answer is partially correct, assistant will complete the answer.",
  "If the answer is incomplete, assistant will complete the answer.",
  "ALWAYS provides FULL answer to the question.",
  // "Assistant responds with two asnwers, one based on user's answer and a second which is completly created by the assistant.",
  "Question and answer can be in different languages, but assistant is prepared for that because he knows all languages.",
  "He is really good at Polish language.",
  // "Assistant uses markdown language when providing answer.",
  "If assistant's answer contains any special keywords he wraps them as links and makes it bold.",
  "If user asks to explain like he is 5, explain using simpler terms and keywords.",
  "Assistant uses polish language.",
  `Example:
  Topic: Bazy danych
  Question: Omów pojęcie indeksu. 
  User answer: Indeks przyspiesza wyszukiwanie danych
  Assistant answer: 
    W relacyjnej bazie danych indeks służy do przyspieszenia wykonywania zapytań 
    służących do wyszukiwania danych. Kiedy nasza tabela posiada przykładowo 1 milion 
    rekordów i naszym zadaniem wyszukanie jest pewnego rekordu:
    • W przypadku braku zdefiniowanych indeksów baza danych wyszukuje KAŻDY 
    WIERSZ w poszukiwaniu interesującej nas krotki, co wielokrotnie zwiększa czas 
    oczekiwania na otrzymanie wyniku
    • Kiedy nasza tabela ma zdefiniowane indeksy, rekordy zwracane są o wiele 
    szybcie
  `,
].join(" ");

const USER_ANSWER_THRESHOLD = 0.25;
const TOPIC_THRESHOLD = 0.66;
const QUESTION_THRESHOLD = 0.8;

export default async function (req, res) {
  const { topic, question, userAnswer, lastAnswer } = req.body;

  const { Items } = await ddb.scan({ TableName: "flashcards" }).promise();

  const similarQuestions = Items.filter((item) => {
    const topicSim = compareTwoStrings(item.topic, topic);
    const questionSim = compareTwoStrings(item.question, question);
    // const userAnswerSim = compareTwoStrings(item.userAnswer, userAnswer);

    // console.log({ topicSim, questionSim, userAnswerSim });

    return topicSim >= TOPIC_THRESHOLD && questionSim >= QUESTION_THRESHOLD;
  }).sort((a, b) => {
    const topicSimA = compareTwoStrings(a.topic, topic);
    const questionSimA = compareTwoStrings(a.question, question);
    // const userAnswerSimA = compareTwoStrings(a.userAnswer, userAnswer);
    const ratingA = a.likes / (a.likes + a.dislikes);
    const simA = topicSimA * questionSimA * ratingA;

    const topicSimB = compareTwoStrings(b.topic, topic);
    const questionSimB = compareTwoStrings(b.question, question);
    // const userAnswerSimB = compareTwoStrings(b.userAnswer, userAnswer);
    const ratingB = b.likes / (b.likes + b.dislikes);
    const simB = topicSimB * questionSimB * ratingB;

    return simB - simA;
  });

  console.log({ similarQuestions });

  if (similarQuestions.length) {
    res.status(200).json({
      result: similarQuestions[0].answer,
      error: false,
      cached: similarQuestions[0],
    });
    return;
  }

  const prompt = `
  ${context}
  Topic: ${topic}
  Question: ${question}
  User answer: 
  ${
    lastAnswer
      ? `Niestety nie znam odpowiedzi na te pytanie. Wyjaśnij odpowiedź tak jakbym miał 5 lat.`
      : userAnswer
  }
  Assistant answer:
  `;

  console.log({ prompt, lastAnswer });

  try {
    console.log({ prompt });
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      temperature: 0.9,
      max_tokens: 768,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0.6,
      messages: [
        {
          role: "system",
          content: prompt,
        },
      ],
    });

    console.log({ completion });

    res.status(200).json({
      result: `
      ${lastAnswer ? lastAnswer : ""} 
      ${completion.data.choices[0].message.content}`,
      error: false,
      cached: null,
    });

    return;
  } catch (e) {
    res.status(500).json({
      error: true,
      result: "",
      cached: null,
    });
    return;
  }
}
