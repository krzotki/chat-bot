import AWS from "aws-sdk";
import formidable from "formidable";
import fs from "fs";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
});

const form = formidable({ multiples: true }); // multiples means req.files will be an array

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function (req, res) {
  const contentType = req.headers["content-type"];

  if (contentType && contentType.indexOf("multipart/form-data") !== -1) {
    const image = await new Promise((resolve, reject) => {
      form.parse(req, async (err, fields, files) => {
        if (!err) {
          const imagePath = files.file.filepath;
          const blob = fs.readFileSync(imagePath);
          const uploadedImage = await s3
            .upload({
              Bucket: process.env.AWS_S3_BUCKET_NAME,
              Key: `${Date.now()}_${fields.name}`,
              Body: blob,
            })
            .promise();
          resolve(uploadedImage);
        } else {
          reject();
        }
      });
    });

    res.status(200).json({ image });
    return;
  }

  res.status(500).json({});
}
