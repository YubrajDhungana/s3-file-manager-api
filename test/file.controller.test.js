const {
  uploadFile,
  deleteFile,
  listFilesByFolder,
  renameFile,
  searchFiles,
  downloadFile,
} = require("../controller/file.controller");
const { mockClient } = require("aws-sdk-client-mock");
const db = require("../configs/db");
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");

//mock s3 client
const s3Mock = mockClient(S3Client);

jest.mock("../configs/s3", () => ({
  getS3Client: jest.fn(),
}));

jest.mock("../configs/db", () => ({
  query: jest.fn(),
}));

const { getS3Client } = require("../configs/s3");
const { json } = require("express");

beforeEach(() => {
  s3Mock.reset();
  getS3Client.mockReset();
  jest.clearAllMocks();
});

//upload file test
describe("Upload file", () => {
  let mockReq, mockRes;
  beforeEach(() => {
    mockReq = {
      user: { id: 1 },
      params: { accountId: "123" },
      files: [
        {
          originalname: "test.jpg",
          mimetype: "image/jpeg",
          buffer: Buffer.from("test"),
          size: 1234,
        },
      ],
      body: {
        bucketName: "test-bucket",
        key: "/s3-filemanager/",
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it("should upload multiple files successfully", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 1, role_name: "admin" }]]);
    getS3Client.mockResolvedValue({
      s3Client: s3Mock,
      region: "us-east-1",
    });

    s3Mock.on(PutObjectCommand).resolves({});
    await uploadFile(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Files uploaded successfully",
      files: expect.arrayContaining([
        expect.objectContaining({
          name: "test.jpg",
          location: expect.stringContaining("test.jpg"),
          size: 1234,
          contentType: "image/jpeg",
        }),
      ]),
    });
  });

  it("should return 403 for non-admin user without bucket access", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 2, role_name: "QA_ROLE" }]]);
    db.query.mockResolvedValueOnce([[]]);

    await uploadFile(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "You don't have access to this bucket",
    });
  });

  it("should return message on no file upload", async () => {
    mockReq.files = [];

    await uploadFile(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: expect.stringContaining("No files were uploaded"),
    });
  });

  it("should handle upload errors", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 1, role_name: "admin" }]]);
    getS3Client.mockResolvedValue({
      s3Client: s3Mock,
      region: "us-east-1",
    });
    s3Mock.on(PutObjectCommand).rejects(new Error("Error uploading file"));

    await uploadFile(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: expect.stringContaining("Error uploading file"),
    });
  });
});

//test for rename file
describe("rename file", () => {
  let mockReq, mockRes;
  beforeEach(() => {
    mockReq = {
      user: { id: 1 },
      params: { accountId: "123" },
      body: {
        oldKey: "old-name.txt",
        newKey: "new-name.txt",
        bucketName: "test-bucket",
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it("should rename a file successfully", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 2, role_name: "QA_ROLE" }]]);
    db.query.mockResolvedValueOnce([
      [{ id: 1, role_id: 2, accountId: 123, bucket_name: "test-bucket" }],
    ]);

    getS3Client.mockResolvedValue({
      s3Client: s3Mock,
      region: "us-east-1",
    });

    s3Mock.on(CopyObjectCommand).resolves({});
    s3Mock.on(DeleteObjectCommand).resolves({});

    await renameFile(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "File renamed successfully",
      newKey: "new-name.txt",
    });
  });

  it("should return 403 for non-admin user without bucket access", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 2, role_name: "QA_ROLE" }]]);
    db.query.mockResolvedValueOnce([[]]);

    await renameFile(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "You don't have access to this bucket",
    });
  });

  it("should handle error renaming files", async () => {
    getS3Client.mockRejectedValue(new Error());

    await renameFile(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: expect.stringContaining("Error renaming file"),
    });
  });
});

//test for delete the file
describe("delete file", () => {
  let mockReq, mockRes;
  beforeEach(() => {
    (mockReq = {
      user: { id: 1 },
      params: { accountId: "123" },
      body: {
        filePaths: ["/test/file1.txt", "/test/file2.txt"],
        bucketName: "test-bucket"
      },
    }),
      (mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      });
  });
  it("should delete files successfully", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 2, role_name: "QA_ROLE" }]]);
    db.query.mockResolvedValueOnce([
      [{ id: 1, role_id: 2, accountId: 123, bucket_name: "test-bucket" }],
    ]);
    getS3Client.mockResolvedValue({
      s3Client: s3Mock,
      region: "us-east-1",
    });

    s3Mock.on(DeleteObjectsCommand).resolves({});

    await deleteFile(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Files deleted successfully",
    });
  });

  it("should return message on no file selection", async () => {
    mockReq.body.filePaths = [];

    await deleteFile(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "No file selected",
    });
  });

  it("should return 403 for non-admin user without bucket access", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 2, role_name: "QA_ROLE" }]]);
    db.query.mockResolvedValueOnce([[]]);

    await deleteFile(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "You don't have access to this bucket",
    });
  });

  it("should handle error deleting file", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 2, role_name: "QA_ROLE" }]]);
    db.query.mockResolvedValueOnce([
      [{ id: 1, role_id: 2, accountId: 123, bucket_name: "test-bucket" }],
    ]);
    getS3Client.mockResolvedValue({
      s3Client: s3Mock,
      region: "us-east-1",
    });

    s3Mock.on(DeleteObjectsCommand).rejects(new Error());
    await deleteFile(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: expect.stringContaining("Error deleting files"),
    });
  });
});

//list by folder test
describe("List files by folder", () => {
  let mockReq, mockRes;
  beforeEach(() => {
    mockReq = {
      user: { id: 1 },
      params: { accountId: "123" },
      query: {
        limit: 10,
        continuationToken: "nextToken456",
        folder: "/test/files",
        bucketName: "test-bucket"
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });
  it("should list files by folder", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 2, role_name: "QA_ROLE" }]]);
    db.query.mockResolvedValueOnce([
      [{ id: 1, role_id: 2, accountId: 123, bucket_name: "test-bucket" }],
    ]);

    getS3Client.mockResolvedValue({
      s3Client: s3Mock,
      region: "us-east-1",
    });

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

    await listFilesByFolder(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
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

  it("should return 403 for non-admin user without bucket access", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 2, role_name: "QA_ROLE" }]]);
    db.query.mockResolvedValueOnce([[]]);

    await listFilesByFolder(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "You don't have access to this bucket",
    });
  });

  it("should handle error on listing file by folder", async () => {
    getS3Client.mockRejectedValue(new Error("Database error"));

    s3Mock.on(ListObjectsV2Command).rejects(new Error("S3 Error"));
    await listFilesByFolder(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Internal server error",
    });
  });

  it("should list files from root when no folder is specified", async () => {
    mockReq.query.folder = "";
    db.query.mockResolvedValueOnce([[{ role_id: 2, role_name: "QA_ROLE" }]]);
    db.query.mockResolvedValueOnce([
      [{ id: 1, role_id: 2, accountId: 123, bucket_name: "test-bucket" }],
    ]);
    getS3Client.mockResolvedValue({
      s3Client: s3Mock,
      region: "us-east-1",
    });

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

    await listFilesByFolder(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
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

//test for search files
describe("search files", () => {
  let mockReq, mockRes;
  beforeEach(() => {
    mockReq = {
      user: { id: 1 },
      params: { accountId: "123" },
      query: {
        folder: "/documents/",
        search: "report",
        bucketName: "test-bucket"
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it("should search files successfully", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 2, role_name: "QA_ROLE" }]]);
    db.query.mockResolvedValueOnce([
      [{ id: 1, role_id: 2, accountId: 123, bucket_name: "test-bucket" }],
    ]);

    getS3Client.mockResolvedValue({
      s3Client: s3Mock,
      region: "us-east-1",
    });

    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [
        {
          Key: "/documents/annual-report.pdf",
          LastModified: new Date(),
          Size: 2048,
        },
        {
          Key: "/documents/monthly-report.docx",
          LastModified: new Date(),
          Size: 1024,
        },
        {
          Key: "/documents/other-file.txt",
          LastModified: new Date(),
          Size: 512,
        },
      ],
      IsTruncated: false,
      NextContinuationToken: null,
      KeyCount: 3,
    });

    await searchFiles(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      path: "/documents/",
      items: expect.arrayContaining([
        expect.objectContaining({
          name: "annual-report.pdf",
          key: "/documents/annual-report.pdf",
          type: "file",
          size: 2048,
          url: expect.stringContaining("annual-report.pdf"),
        }),
        expect.objectContaining({
          name: "monthly-report.docx",
          key: "/documents/monthly-report.docx",
          type: "file",
          size: 1024,
          url: expect.stringContaining("monthly-report.docx"),
        }),
      ]),
      isTruncated: false,
      nextContinuationToken: null,
      keyCount: 2, // Only files matching "report" search term
    });
  });

  it("should return 403 for non-admin user without bucket access", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 2, role_name: "user" }]]);
    db.query.mockResolvedValueOnce([[]]);

    await searchFiles(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "You don't have access to this bucket",
    });
  });

  it("should return empty results when no files match search term", async () => {
    mockReq.query.search = "nonexistent";

    db.query.mockResolvedValueOnce([[{ role_id: 2, role_name: "QA_ROLE" }]]);
    db.query.mockResolvedValueOnce([
      [{ id: 1, role_id: 2, accountId: 123, bucket_name: "test-bucket" }],
    ]);
    getS3Client.mockResolvedValue({
      s3Client: s3Mock,
      region: "us-east-1",
    });

    s3Mock.on(ListObjectsV2Command).resolves({
      Contents: [
        {
          Key: "/documents/other-file.txt",
          LastModified: new Date(),
          Size: 512,
        },
      ],
      IsTruncated: false,
      NextContinuationToken: null,
      KeyCount: 1,
    });

    await searchFiles(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      path: "/documents/",
      items: [],
      isTruncated: false,
      nextContinuationToken: null,
      keyCount: 0,
    });
  });
  it("should handle error on searching files", async () => {
    db.query.mockRejectedValue(new Error("Database error"));

    await searchFiles(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Internal server error",
    });
  });
});

//test for download file:
describe("Download file", () => {
  let mockReq, mockRes;
  beforeEach(() => {
    mockReq = {
      user: { id: 1 },
      params: { accountId: "123" },
      query: {
        key: "/documents/test-file.pdf",
        bucketName: "test-bucket",
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
  });

  it("should download file successfully", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 2, role_name: "QA_ROLE" }]]);
    db.query.mockResolvedValueOnce([
      [{ id: 1, role_id: 2, accountId: 123, bucket_name: "test-bucket" }],
    ]);
    getS3Client.mockResolvedValue({
      s3Client: s3Mock,
      region: "us-east-1",
    });

    const mockStream = {
      pipe: jest.fn(),
    };

    s3Mock.on(HeadObjectCommand).resolves({
      ContentType: "application/pdf",
      ContentLength: 2048,
      LastModified: new Date("2024-01-01"),
      ETag: '"abc123"',
    });

    s3Mock.on(GetObjectCommand).resolves({
      Body: mockStream,
    });

    await downloadFile(mockReq, mockRes);

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      'attachment; filename="test-file.pdf"'
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/pdf"
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith("Content-Length", 2048);
    expect(mockStream.pipe).toHaveBeenCalledWith(mockRes);
  });

  it("should return 400 if file key is missing", async () => {
    mockReq.query.key = "";

    await downloadFile(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "File key is required",
    });
  });
  it("should return 403 for non-admin user without bucket access", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 2, role_name: "QA_ROLE" }]]);
    db.query.mockResolvedValueOnce([[]]);

    await downloadFile(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "You don't have access to this bucket",
    });
  });
  it("should handle S3 errors during download", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 2, role_name: "QA_ROLE" }]]);
    db.query.mockResolvedValueOnce([
      [{ id: 1, role_id: 2, accountId: 123, bucket_name: "test-bucket" }],
    ]);
    getS3Client.mockResolvedValue({
      s3Client: s3Mock,
      region: "us-east-1",
    });

    s3Mock.on(HeadObjectCommand).rejects(new Error("File not found"));

    await downloadFile(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Internal server error",
    });
  });
});
