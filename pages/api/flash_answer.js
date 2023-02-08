import { Configuration, OpenAIApi } from "openai";

export const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const context = [
  "The following is a conversation with an AI assistant.",
  "The assistant is helpful, creative, clever, and very friendly.",
  "This conversation is some sort of Q&A where user provides question and his answer for given question.",
  "Assistant will validate user's answer and based on it's validity will give constructive or positive feedback.",
  "Assistant will ALWAYS refer to the answer given by the user.",
  "If the answer is incorrect, assistant will write a correct answer",
  "If the answer is partially correct, assistant will complete the answer.",
  "Question and answer can be in different languages, but assistant is prepared for that because he knows all languages.",
  "He is really good at Polish language.",
  "Assistant uses markdown language when providing answer.",
  "If assistant's answer contains any special keywords he wraps them as links and makes it bold.",
].join(" ");

export default async function (req, res) {
  const { topic, question, userAnswer } = req.body;

  const prompt = `${context} \n Topic: ${topic} \n Question: ${question} \n User answer: ${userAnswer} \n Assistant answer: `;

  const completion = await openai.createCompletion({
    model: "text-davinci-003",
    prompt,
    temperature: 0.9,
    max_tokens: 2048,
    stop: [" Human:", " AI:"],
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0.6,
    best_of: 2,
  });

  res.status(200).json({
    result: completion.data.choices[0].text,
  });
}
