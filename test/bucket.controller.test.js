const bucketController = require("../controller/bucket.controller");
const db = require("../configs/db");
const { decrypt } = require("../utils/cryptoUtils");
const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");

jest.mock("../configs/db", () => ({
  query: jest.fn(),
}));
jest.mock("../utils/cryptoUtils", () => ({
  decrypt: jest.fn(),
}));

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(),
  ListBucketsCommand: jest.fn(),
}));

describe("listBuckets", () => {
  let mockReq, mockRes;
  let mockS3Send;
  beforeEach(() => {
    mockReq = {
      user: { id: 1 },
      params: { id: "123" },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockS3Send = jest.fn();
    S3Client.mockImplementation(() => ({
      send: mockS3Send,
    }));

    jest.clearAllMocks();
  });

  it("should return 403 if user has no role assigned", async () => {
    db.query.mockResolvedValueOnce([[]]); // No roles found

    await bucketController.listBuckets(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Unauthorized: No roles assigned",
    });
  });

  it("should list buckets successfully for admin user ", async () => {
    db.query
      .mockResolvedValueOnce([[{ role_id: 1 }]])
      .mockResolvedValueOnce([[{ name: "admin" }]]);

    db.query.mockResolvedValueOnce([[
      { 
        access_key_id: "encrypted-access-key", 
        secret_access_key: "encrypted-secret-key", 
        region: "encrypted-region" 
      }
    ]]);

    decrypt
      .mockReturnValueOnce("decrypted-access-key")
      .mockReturnValueOnce("decrypted-secret-key")
      .mockReturnValueOnce("decrypted-region");

    // Mock S3 response
    mockS3Send.mockResolvedValueOnce({
      Buckets: [
        { Name: "bucket-1" },
        { Name: "bucket-2" }
      ]
    });

    await bucketController.listBuckets(mockReq, mockRes);
   expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([
      { bucket_name: "bucket-1" },
      { bucket_name: "bucket-2" }
    ]);
  });

  it("Admin user- but account not found,should return 404", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 1 }]]);
    db.query.mockResolvedValueOnce([[{ name: "admin" }]]);
    db.query.mockResolvedValueOnce([[]]);

    await bucketController.listBuckets(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Account with ID 123 not found"
    });
  });

  it("Regular user with role access - should return assigned buckets", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 2 }]]);
    db.query.mockResolvedValueOnce([[{ name: "user" }]]);
    db.query.mockResolvedValueOnce([
      [{bucket_name: "test-bucket"}],
    ]);

    await bucketController.listBuckets(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([
      { bucket_name: "test-bucket" },
    ]);
  });

  it("Regular user with no bucket access - should return 403", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 2 }]]);
    db.query.mockResolvedValueOnce([[{ name: "user" }]]);
    db.query.mockResolvedValueOnce([[]]);

    await bucketController.listBuckets(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "No buckets accessible for your roles",
    });
  });
});
