import AWS, { DynamoDB } from "aws-sdk";
import { randomUUID } from "crypto";
import { NextApiRequest, NextApiResponse } from "next";

AWS.config.update({ region: "eu-central-1" });

const ddb = new AWS.DynamoDB.DocumentClient();
export default async function (req: NextApiRequest, res: NextApiResponse) {
  const { question, answer, userAnswer, topic } = req.body;

  const params: DynamoDB.DocumentClient.PutItemInput = {
    TableName: "flashcards",
    Item: {
      uuid: randomUUID(),
      question,
      topic,
      userAnswer,
      answer,
      likes: 1,
      dislikes: 0,
    },
  };

  await ddb.put(params).promise();

  res.status(200).json({ success: true });
}
