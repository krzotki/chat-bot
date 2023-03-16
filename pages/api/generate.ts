import { Configuration, OpenAIApi } from "openai";

export const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const defaultContext =
  "The following is a conversation with an AI assistant. The assistant is helpful, creative, clever, and very friendly.";

const solverSkills = [
  "He can code and is very good at math.",
  "Wraps the code with '```' and puts the language name after the first '```'. ",
  "Writes equations and performs calculations using Katex not Latex - important.",
  "Does NOT wrap math equations (Katex) with '```' - important. ",
  "Example of Katex - $$ f(a,b,c) = (a^2+b^2+c^2)^3 $$",
  "Uses katex if previous message included attachment with equations",
  "Triple checks the validity of Katex syntax",
  "Triple checks if his calculations are correct.",

  "If there is a function to draw, he provides a Latex syntax for it to use it with desmos and wraps the function with <desmos>.",
  "In Latex, he precedes any multi-character symbol by a leading backslash - for example <desmos> f(x) = \\sin(x) </desmos> - important. ",
  "If function has any params, he writes default values for them and wraps them with <desmos> - for example <desmos> f(x) = A * \\sin(x) </desmos> <desmos>A = 1</desmos>",
  "He can provide step by step explanation to given mathematical solution if asked.",
];

const solverContext = defaultContext + solverSkills.join(" ");

const thesisSkills = [
  "He is sciencist.",
  "He wrote and reviewed thousands of computer science thesis.",
  "He knows all about modern and classic algorithms.",
  "He always provides source of his information in form of article names or links.",
  "He talks in scientific language.",
];

const thesisContext = defaultContext + thesisSkills.join(" ");

export default async function (req, res) {
  let image = null;

  const context = req.body.context === "solver" ? solverContext : thesisContext;

  const attachment = req.body.attachment;

  if (attachment) {
    const response = await fetch("https://api.mathpix.com/v3/text", {
      headers: {
        app_id: process.env.MATH_PIX_APP_ID,
        app_key: process.env.MATH_PIX_API_KEY,
        "content-type": "application/json",
      },
      method: "post",
      body: JSON.stringify({
        src: attachment,
        formats: ["text", "data"],
        data_options: {
          include_asciimath: true,
        },
      }),
    });

    const mathpix = await response.json();

    image = {
      src: attachment,
      text: mathpix.text,
    };
  }

  const messages = req.body.messages;

  if (image?.text) {
    messages[messages.length - 1].content += `\n ${image.text}`;
  }

  console.log({ messages });
  const completion = await openai.createChatCompletion({
    model: "gpt-4",
    temperature: 0.9,
    max_tokens: 2048,
    messages: [
      {
        role: "system",
        content: context,
      },
      ...messages,
    ],
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0.6,
  });

  res.status(200).json({
    result: completion.data.choices[0].message.content,
  });
}
