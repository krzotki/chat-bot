import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const context =
  "The following is a conversation with an AI assistant. The assistant is helpful, creative, clever, and very friendly. He can code.";

export default async function (req, res) {
  console.log(req.body.prompt);
  const completion = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: context + req.body.prompt,
    temperature: 0.9,
    max_tokens: 2048,
    stop: [" Human:", " AI:"],
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0.6,
    best_of: 1
  });

  res.status(200).json({ result: completion.data.choices });
}
