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

  it("should return 403 if user has no role assigned and is not superadmin", async () => {
    // roleId query returns empty, user_type is 'user'
    db.query
      .mockResolvedValueOnce([[]]) // roleId query
      .mockResolvedValueOnce([[{ user_type: "user" }]]); // user query

    await bucketController.listBuckets(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Unauthorized: No roles assigned",
    });
  });

  it("should list buckets successfully for superadmin", async () => {
    db.query
      .mockResolvedValueOnce([[{ role_id: 1 }]]) // roleId query
      .mockResolvedValueOnce([[{ user_type: "superadmin" }]]); // user query
    // Should skip role name query for superadmin
    db.query.mockResolvedValueOnce([
      [
        {
          access_key_id: "encrypted-access-key",
          secret_access_key: "encrypted-secret-key",
          region: "encrypted-region",
        },
      ],
    ]);

    decrypt
      .mockReturnValueOnce("decrypted-access-key")
      .mockReturnValueOnce("decrypted-secret-key")
      .mockReturnValueOnce("decrypted-region");

    mockS3Send.mockResolvedValueOnce({
      Buckets: [{ Name: "bucket-1" }, { Name: "bucket-2" }],
    });

    await bucketController.listBuckets(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([
      { bucket_name: "bucket-1" },
      { bucket_name: "bucket-2" },
    ]);
  });

  it("should list buckets successfully for admin user", async () => {
    db.query
      .mockResolvedValueOnce([[{ role_id: 1 }]]) // roleId query
      .mockResolvedValueOnce([[{ user_type: "user" }]]) // user query
      .mockResolvedValueOnce([[{ name: "admin" }]]) // role name query
      .mockResolvedValueOnce([
        [
          {
            access_key_id: "encrypted-access-key",
            secret_access_key: "encrypted-secret-key",
            region: "encrypted-region",
          },
        ],
      ]);

    decrypt
      .mockReturnValueOnce("decrypted-access-key")
      .mockReturnValueOnce("decrypted-secret-key")
      .mockReturnValueOnce("decrypted-region");

    mockS3Send.mockResolvedValueOnce({
      Buckets: [{ Name: "bucket-1" }, { Name: "bucket-2" }],
    });

    await bucketController.listBuckets(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([
      { bucket_name: "bucket-1" },
      { bucket_name: "bucket-2" },
    ]);
  });

  it("should return 404 if account not found for admin/superadmin", async () => {
    db.query
      .mockResolvedValueOnce([[{ role_id: 1 }]]) // roleId query
      .mockResolvedValueOnce([[{ user_type: "user" }]]) // user query
      .mockResolvedValueOnce([[{ name: "admin" }]]) // role name query
      .mockResolvedValueOnce([[]]); // account query returns empty

    await bucketController.listBuckets(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Account with ID 123 not found",
    });
  });

  it("should return assigned buckets for regular user with role access", async () => {
    db.query
      .mockResolvedValueOnce([[{ role_id: 2 }]]) // roleId query
      .mockResolvedValueOnce([[{ user_type: "user" }]]) // user query
      .mockResolvedValueOnce([[{ name: "user" }]]) // role name query
      .mockResolvedValueOnce([[{ bucket_name: "test-bucket" }]]); // buckets query

    await bucketController.listBuckets(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([{ bucket_name: "test-bucket" }]);
  });

  it("should return 403 for regular user with no bucket access", async () => {
    db.query
      .mockResolvedValueOnce([[{ role_id: 2 }]]) // roleId query
      .mockResolvedValueOnce([[{ user_type: "user" }]]) // user query
      .mockResolvedValueOnce([[{ name: "user" }]]) // role name query
      .mockResolvedValueOnce([[]]); // buckets query returns empty

    await bucketController.listBuckets(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "No buckets accessible for your roles",
    });
  });

  it("should handle internal server error", async () => {
    db.query.mockRejectedValueOnce(new Error("DB error"));

    const originalError = console.error;
    console.error = jest.fn();

    await bucketController.listBuckets(mockReq, mockRes);

    expect(console.error).toHaveBeenCalledWith(
      "Error fetching buckets:",
      expect.any(Error)
    );
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Internal Server Error",
    });

    console.error = originalError;
  });
});
