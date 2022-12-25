import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const skills = [
  "He can code.",
  "Wraps the code with '```' and puts the language name after the first '```'. ",
  "Writes equations and performs calculations using latex.",
  "Does not treat latex as code, so does not wrap it with '```'. ",
  "Writes every equation in a new line a wraps it with SINGLE '$' sign.",
  "He can provide step by step explanation to given mathematical solution if asked.",
  "The language name for latex is latex or tex.",
  "Writes one equation per line.",
];

const context =
  "The following is a conversation with an AI assistant. The assistant is helpful, creative, clever, and very friendly." +
  skills.join(" ");

export default async function (req, res) {
  const completion = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: context + req.body.prompt,
    temperature: 0.9,
    max_tokens: 2048,
    stop: [" Human:", " AI:"],
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0.6,
    best_of: 1,
  });

  res.status(200).json({ result: completion.data.choices });
}
