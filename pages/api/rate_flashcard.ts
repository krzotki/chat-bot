import AWS, { DynamoDB } from "aws-sdk";
import { NextApiRequest, NextApiResponse } from "next";

AWS.config.update({ region: "eu-central-1" });

const ddb = new AWS.DynamoDB.DocumentClient();

export default async function (req: NextApiRequest, res: NextApiResponse) {
  const { uuid, rate } = req.body;

  const params: DynamoDB.DocumentClient.UpdateItemInput = {
    TableName: "flashcards",
    Key: {
      uuid: uuid,
    },
    UpdateExpression:
      "SET likes = likes + :likes, dislikes = dislikes + :dislikes",
    ExpressionAttributeValues: {
      ":likes": rate === "like" ? 1 : 0,
      ":dislikes": rate === "dislike" ? 1 : 0,
    },
    ReturnValues: "UPDATED_NEW",
  };

  const {
    Attributes: { likes, dislikes },
  } = await ddb.update(params).promise();

  res.status(200).json({ success: true, likes, dislikes });
}
