const AWS = require("aws-sdk");

AWS.config.update({ region: "eu-central-1" });

const dynamodb = new AWS.DynamoDB();

const [srcTableName, destTableName] = process.argv.slice(2);

if (!srcTableName || !destTableName) {
  throw new Error("Provide table names");
}

const copy = async () => {
  const queryParams = {
    TableName: srcTableName,
  };

  let items = [];
  let queryResult;
  do {
    queryResult = await dynamodb.scan(queryParams).promise();
    items = items.concat(queryResult.Items);
    queryParams.ExclusiveStartKey = queryResult.LastEvaluatedKey;
  } while (queryResult && queryResult.LastEvaluatedKey);

  const batches = Math.floor(items.length / 25);

  for (let i = 0; i < batches; i++) {
    const batchWriteParams = {
      RequestItems: {
        [destTableName]: [],
      },
    };

    items.slice(i * 25, (i + 1) * 25).forEach((item) => {
      batchWriteParams.RequestItems[destTableName].push({
        PutRequest: { Item: item },
      });
    });

    await dynamodb.batchWriteItem(batchWriteParams).promise();
  }
};

copy();
