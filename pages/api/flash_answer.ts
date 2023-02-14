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
  "Question and answer can be in different languages, but assistant is prepared for that because he knows all languages.",
  "He is really good at Polish language.",
  "Assistant uses markdown language when providing answer.",
  "If assistant's answer contains any special keywords he wraps them as links and makes it bold.",
].join(" ");

const USER_ANSWER_THRESHOLD = 0.25;
const TOPIC_THRESHOLD = 0.66;
const QUESTION_THRESHOLD = 0.8;

export default async function (req, res) {
  const { topic, question, userAnswer } = req.body;

  const { Items } = await ddb.scan({ TableName: "flashcards" }).promise();

  const similarQuestions = Items.filter((item) => {
    const topicSim = compareTwoStrings(item.topic, topic);
    const questionSim = compareTwoStrings(item.question, question);
    const userAnswerSim = compareTwoStrings(item.userAnswer, userAnswer);

    console.log({ topicSim, questionSim, userAnswerSim });

    return (
      topicSim >= TOPIC_THRESHOLD &&
      questionSim >= QUESTION_THRESHOLD &&
      userAnswerSim >= USER_ANSWER_THRESHOLD
    );
  }).sort((a, b) => {
    const topicSimA = compareTwoStrings(a.topic, topic);
    const questionSimA = compareTwoStrings(a.question, question);
    const userAnswerSimA = compareTwoStrings(a.userAnswer, userAnswer);
    const ratingA = a.likes / (a.likes + a.dislikes);
    const simA = topicSimA * questionSimA * userAnswerSimA * ratingA;

    const topicSimB = compareTwoStrings(b.topic, topic);
    const questionSimB = compareTwoStrings(b.question, question);
    const userAnswerSimB = compareTwoStrings(b.userAnswer, userAnswer);
    const ratingB = b.likes / (b.likes + b.dislikes);
    const simB = topicSimB * questionSimB * userAnswerSimB * ratingB;

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

  const prompt = `${context} \n Topic: ${topic} \n Question: ${question} \n User answer: ${userAnswer} \n Assistant answer: `;

  try {
    console.log({ prompt });
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt,
      temperature: 0.9,
      max_tokens: 2048,
      stop: ["Assistant answer:"],
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0.6,
      best_of: 1,
    });

    console.log({ completion });

    res.status(200).json({
      result: completion.data.choices[0].text,
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
