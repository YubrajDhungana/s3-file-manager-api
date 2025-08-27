const bucketController = require("../controller/bucket.controller");
const db = require("../configs/db");
const { decrypt } = require("../utils/cryptoUtils");

jest.mock("../configs/db", () => ({
  query: jest.fn(),
}));
jest.mock("../utils/cryptoUtils", () => ({
  decrypt: jest.fn(),
}));

describe("Bucket Controller", () => {
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

  describe("listBuckets", () => {
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
  });
});
