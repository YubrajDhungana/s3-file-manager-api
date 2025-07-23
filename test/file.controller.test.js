const {
  getFilesByBucket,
  uploadFile,
  deleteFile,
  getFileURL,
  listFilesByFolder,
  renameFile,
  listFolders,
} = require("../controller/file.controller");
const { s3Client } = require("../configs/s3");
const { mockClient } = require("aws-sdk-client-mock");
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

//mock s3 client
const s3Mock = mockClient(S3Client);

// Mock environment variables
process.env.AWS_BUCKET_THIRD = "test-bucket";
process.env.AWS_URL_THIRD = "https://test-bucket.s3.amazonaws.com";

beforeEach(() => {
  s3Mock.reset();
});

describe("getFilesByBucket", () => {
  it("should return files with pagination", async () => {
    const req = {
      query: {
        limit: "5",
        continuationToken: "token123",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [
        {
          Key: "file1.txt",
          LastModified: new Date(),
          Size: 1024,
          ContentType: "text/plain",
        },
      ],
      IsTruncated: true,
      NextContinuationToken: "nextToken456",
      KeyCount: 1,
    });

    await getFilesByBucket(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      files: {
        files: expect.any(Array),
        isTruncated: true,
        nextContinuationToken: "nextToken456",
        keyCount: 1,
      },
    });
  });
});

describe("Upload file", () => {
  it("should upload multiple files successfully", async () => {
    const req = {
      files: [
        {
          originalname: "test.jpg",
          mimetype: "image/jpeg",
          buffer: Buffer.from("test"),
          size: 1234,
        },
      ],
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    s3Mock.on(PutObjectCommand).resolves({});

    await uploadFile(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Files uploaded successfully",
      files: expect.arrayContaining([
        expect.objectContaining({
          name: "test.jpg",
          location: expect.stringContaining("test.jpg"),
        }),
      ]),
    });
  });
});

//test for rename file
describe("rename file", () => {
  it("should rename a file successfully", async () => {
    const req = {
      body: {
        oldKey: "old-name.txt",
        newKey: "new-name.txt",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    s3Mock.on(CopyObjectCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).resolves({});

    await renameFile(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "File renamed successfully",
      newKey: "new-name.txt",
    });
  });
});
