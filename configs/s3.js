const {S3Client,ListObjectsV2Command,GetObjectCommand,PutObjectCommand} = require("@aws-sdk/client-s3")
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
require("dotenv").config();
const s3Client = new S3Client({
    region: process.env.AWS_DEFAULT_REGION_THIRD,
    credentials:{
        accessKeyId:process.env.AWS_ACCESS_KEY_ID_THIRD,
        secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY_THIRD
    }
})

const  getObjectURL = async (key) =>{ 
    const command = new GetObjectCommand({
        Bucket:process.env.AWS_BUCKET_THIRD,
        Key:key
    })

    const url = await getSignedUrl(s3Client,command);
    return url;
}

const putObject = async (filename,ContentType) =>{
    const command = new PutObjectCommand({
        Bucket:process.env.AWS_BUCKET_THIRD,
        Key:`/s3-filemanager/${filename}`,
        ContentType:ContentType
    })

    const url = await getSignedUrl(s3Client,command,{expiresIn:3600});
    return url;
}

const listFiles = async () => {
    const command = new ListObjectsV2Command({
        Bucket:process.env.AWS_BUCKET_THIRD
    })

    const response = await s3Client.send(command);
    if(response.Contents && response.Contents.length> 0){
        return response.Contents.map(file => ({
            key: file.Key,
            lastModified: file.LastModified,
            size: file.Size
        }))
    }
}

module.exports = {
    getObjectURL,
    putObject,
    listFiles
}