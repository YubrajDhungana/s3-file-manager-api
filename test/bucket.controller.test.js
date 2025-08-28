const bucketController = require("../controller/bucket.controller");
const db = require("../configs/db");
const { decrypt } = require("../utils/cryptoUtils");

jest.mock("../configs/db", () => ({
  query: jest.fn(),
}));
jest.mock("../utils/cryptoUtils", () => ({
  decrypt: jest.fn(),
}));

describe("listBuckets", () => {
  let mockReq, mockRes;
  beforeEach(() => {
    mockReq = {
      user: { id: 1 },
      params: { id: "123" },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
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

    const mockBuckets = [
      { id: 1, bucket_alias: "encrypted-bucket-1" },
      { id: 2, bucket_alias: "encrypted-bucket-2" },
    ];

    db.query.mockResolvedValueOnce([mockBuckets]);

    decrypt
      .mockReturnValueOnce("decrypted-bucket-1")
      .mockReturnValueOnce("decrypted-bucket-2");

    await bucketController.listBuckets(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([
      { id: 1, bucket_name: "decrypted-bucket-1" },
      { id: 2, bucket_name: "decrypted-bucket-2" },
    ]);
  });

  it("Admin user- but buckets in the accounts, should return empty array", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 1 }]]);
    db.query.mockResolvedValueOnce([[{ name: "admin" }]]);
    db.query.mockResolvedValueOnce([[]]);

    await bucketController.listBuckets(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([]);
  });

  it("Regular user with role access - should return assigned buckets", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 2 }]]);
    db.query.mockResolvedValueOnce([[{ name: "user" }]]);
    db.query.mockResolvedValueOnce([
      [{ id: 3, bucket_alias: "encrypted-bucket-3" }],
    ]);

    decrypt.mockReturnValueOnce("decrypted-bucket-3");

    await bucketController.listBuckets(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([
      { id: 3, bucket_name: "decrypted-bucket-3" },
    ]);
  });

  it("Regular user with no bucket access - should return 403", async () => {
    db.query.mockResolvedValueOnce([[{ role_id: 2 }]]);
    db.query.mockResolvedValueOnce([[{ name: "user" }]]);
    db.query.mockResolvedValueOnce([[]]);

    await bucketController.listBuckets(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Unauthorized: No buckets accessible for your roles",
    });
  });
});
