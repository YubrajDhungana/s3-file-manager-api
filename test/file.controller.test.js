const {

  uploadFile,
  deleteFile,
  listFilesByFolder,
  renameFile,
  listFolders,
} = require("../controller/file.controller");
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

jest.mock("../configs/s3", () => ({
  getS3ClientByBucketId: jest.fn(),
}));


const { getS3ClientByBucketId } = require("../configs/s3");

beforeEach(() => {
  s3Mock.reset();
  getS3ClientByBucketId.mockReset();
  
});

//upload file test
describe("Upload file", () => {
  it("should upload multiple files successfully", async () => {
    getS3ClientByBucketId.mockResolvedValue({
      s3Client: s3Mock,
      bucketConfig: {
        bucket_name: "test-bucket",
        aws_bucket_url: "https://test-bucket.s3.amazonaws.com",
      },
    });

    const req = {
      params: { bucketId: 1 },
      files: [
        {
          originalname: "test.jpg",
          mimetype: "image/jpeg",
          buffer: Buffer.from("test"),
          size: 1234,
        },
      ],
      body: {
        key: "/s3-filemanager/",
      },
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

  it("should return message on no file upload", async () => {
    const req = {
      params:{bucketId: 1},
      files: [],
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await uploadFile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: expect.stringContaining("No files were uploaded"),
    });
  });

  it("should handle upload errors", async () => {
    const req = {
      params: { bucketId: 1 },
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

    s3Mock.on(PutObjectCommand).rejects(new Error("Error uploading file"));

    await uploadFile(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: expect.stringContaining("Error uploading file"),
    });
  });
});

//test for rename file
describe("rename file", () => {
  it("should rename a file successfully", async () => {
    getS3ClientByBucketId.mockResolvedValue({
      s3Client: s3Mock,
      bucketConfig: {
        bucket_name: "test-bucket",
        aws_bucket_url: "https://test-bucket.s3.amazonaws.com",
      },
    });
    const req = {
      params: { bucketId: 1 },
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

  it("should handle error renaming files", async () => {
    getS3ClientByBucketId.mockRejectedValue(new Error("Database error"));
    const req = {
      params: { bucketId: 1 },
      body: {
        oldKey: "/s3-file-manager/file1.txt",
        newKey: "/s3-file-manager/file2.txt",
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    await renameFile(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: expect.stringContaining("Error renaming file"),
    });
  });
});

//test for delete the file
describe("delete file", () => {
  it("should delete files successfully", async () => {
    getS3ClientByBucketId.mockResolvedValue({
      s3Client:s3Mock,
      bucketConfig: {
        bucket_name: "test-bucket",
        aws_bucket_url: "https://test-bucket.s3.amazonaws.com",
      },
    });
    const req = {
      params: { bucketId: 1 },
      body: {
        filePaths: ["/test/file1.txt", "/test/file2.txt"],
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    s3Mock.on(DeleteObjectsCommand).resolves({});

    await deleteFile(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Files deleted successfully",
    });
  });

  it("should handle error deleting file", async () => {
    getS3ClientByBucketId.mockResolvedValue({
      s3Client: s3Mock,
      bucketConfig: {
        bucket_name: "test-bucket",
        aws_bucket_url: "https://test-bucket.s3.amazonaws.com",
      },
    });

    const req = {
      params: { bucketId: 1 },
      body: {
        filePaths: ["/test/file1.txt", "/test/file2.txt"],
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    s3Mock.on(DeleteObjectsCommand).rejects(new Error("Error deleting files"));
    await deleteFile(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: expect.stringContaining("Error deleting files"),
    });
  });

  it("should return message on no file selection", async () => {
    const req = {
      params : { bucketId: 1 },
      body: {},
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await deleteFile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: expect.stringContaining("No file selected"),
    });
  });
});

//list by folder test
//list by folder test
describe("List files by folder/search files", () => {

  it("should list files by folder", async () => {
    getS3ClientByBucketId.mockResolvedValue({
      s3Client: s3Mock,
      bucketConfig: {
        bucket_name: "test-bucket",
        aws_bucket_url: "https://test-bucket.s3.amazonaws.com",
      },
    });

    const req = {
      params:{bucketId:1},
      query: {
        limit: "5",
        continuationToken: "5",
        folder: "/test/files",
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [
        {
          Key: "/test/files/file1.txt",
          LastModified: new Date(),
          Size: 1024,
        },
      ],
      CommonPrefixes: [
        {
          Prefix: "/test/files/subfolder/",
        },
      ],
      IsTruncated: true,
      NextContinuationToken: "nextToken456",
      KeyCount: 2,
    });

    await listFilesByFolder(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      path: "/test/files/",
      items: expect.arrayContaining([
        expect.objectContaining({
          name: "subfolder",
          key: "/test/files/subfolder/",
          type: "folder",
        }),
        expect.objectContaining({
          name: "file1.txt",
          key: "/test/files/file1.txt",
          type: "file",
          size: 1024,
          lastModified: expect.any(Date),
          url: expect.stringContaining("file1.txt"),
        }),
      ]),
      isTruncated: true,
      nextContinuationToken: "nextToken456",
      keyCount: 2,
    });
  });

  it("should handle error on listing file by folder or search", async () => {
    getS3ClientByBucketId.mockRejectedValue(new Error("Database error"));
    const req = {
      params: { bucketId: 1 },
      query: {
        limit: "5",
        continuationToken: "5",
        folder: "/test/files",
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    s3Mock.on(ListObjectsV2Command).rejects(new Error("S3 Error"));
    await listFilesByFolder(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Internal server error",
    });
  });

  it("should list files from root when no folder is specified", async () => {
    getS3ClientByBucketId.mockResolvedValue({
      s3Client: s3Mock,
      bucketConfig: {
        bucket_name: "test-bucket",
        aws_bucket_url: "https://test-bucket.s3.amazonaws.com",
      },
    });
    const req = {
      params: { bucketId: 1 },
      query: {
        limit: "10",
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [
        {
          Key: "root-file.txt",
          LastModified: new Date(),
          Size: 512,
          ContentType: "text/plain",
        },
      ],
      CommonPrefixes: [
        {
          Prefix: "folder1/",
        },
      ],
      IsTruncated: false,
      NextContinuationToken: null,
      KeyCount: 2,
    });

    await listFilesByFolder(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      path: "",
      items: expect.arrayContaining([
        expect.objectContaining({
          name: "folder1",
          key: "folder1/",
          type: "folder",
        }),
        expect.objectContaining({
          name: "root-file.txt",
          key: "root-file.txt",
          type: "file",
        }),
      ]),
      isTruncated: false,
      nextContinuationToken: null,
      keyCount: 2,
    });
  });
});

// //list folder test
// describe("list folders", () => {
//   it("should list folder successfully", async () => {
//     getS3ClientByBucketId.mockResolvedValue({
//       s3Client: s3Mock,
//       bucketConfig: {
//         bucket_name: "test-bucket",
//         aws_bucket_url: "https://test-bucket.s3.amazonaws.com",
//       },
//     });
//     req = {
//       params: { bucketId: 1 },
//       query: {
//         prefix: "/s3-filemanager/",
//       },
//     };

//     res = {
//       status: jest.fn().mockReturnThis(),
//       json: jest.fn(),
//     };

//     s3Mock.on(ListObjectsV2Command).resolves({
//       CommonPrefixes: [{ Prefix: "folder1/" }, { Prefix: "folder2/" }],
//     });

//     await listFolders(req, res);
//     expect(res.status).toHaveBeenCalledWith(200);
//     expect(res.json).toHaveBeenCalledWith({
//       folders: expect.any(Array),
//     });
//   });

//   it("should handle error listing folders", async () => {
//     const req = {
//       query: {
//         prefix: "/s3-filemanager/",
//       },
//     };

//     const res = {
//       status: jest.fn().mockReturnThis(),
//       json: jest.fn(),
//     };

//     s3Mock.on(ListObjectsV2Command).rejects(new Error("Error listing folders"));

//     await listFolders(req, res);
//     expect(res.status).toHaveBeenCalledWith(500);
//     expect(res.json).toHaveBeenCalledWith({
//       message: expect.stringContaining("Error listing folders"),
//     });
//   });
// });
