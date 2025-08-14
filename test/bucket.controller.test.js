const { listBuckets } = require("../controller/bucket.controller");
jest.mock("../configs/db", () => ({
  query: jest.fn(),
}));
jest.mock("../utils/cryptoUtils", () => ({
  decrypt: jest.fn(),
}));

const db = require("../configs/db");
const { decrypt } = require("../utils/cryptoUtils");
beforeEach(() => {
  db.query.mockReset();
  decrypt.mockReset();
});

describe("Bucket Controller", () => {
  describe("listBuckets", () => {
    it("should list buckets successfully", async () => {
      // Mock database response
      const mockRows = [
        { id: 1, bucket_alias: "encrypted_bucket_1" },
        { id: 2, bucket_alias: "encrypted_bucket_2" },
      ];

      db.query.mockResolvedValue([mockRows]);
      decrypt.mockReturnValueOnce("my-test-bucket-1");
      decrypt.mockReturnValueOnce("my-test-bucket-2");

      const req = {
        params: { id: "123" },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await listBuckets(req, res);

      expect(db.query).toHaveBeenCalledWith(
        "SELECT id, bucket_alias FROM aws_buckets where account_id=?",
        "123"
      );
      expect(decrypt).toHaveBeenCalledTimes(2);
      expect(decrypt).toHaveBeenNthCalledWith(1, "encrypted_bucket_1");
      expect(decrypt).toHaveBeenNthCalledWith(2, "encrypted_bucket_2");

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        { id: 1, bucket_name: "my-test-bucket-1" },
        { id: 2, bucket_name: "my-test-bucket-2" },
      ]);
    });

    it("should return empty array when no buckets found for account", async () => {
      db.query.mockResolvedValue([[]]);

      const req = {
        params: { id: "123" },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await listBuckets(req, res);

      expect(db.query).toHaveBeenCalledWith(
        "SELECT id, bucket_alias FROM aws_buckets where account_id=?",
        "123"
      );
      expect(decrypt).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("should handle missing account ID parameter", async () => {
      const req = {
        params: {},
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await listBuckets(req, res);

      expect(db.query).toHaveBeenCalledWith(
        "SELECT id, bucket_alias FROM aws_buckets where account_id=?",
        undefined
      );
    });

    it("should handle database errors", async () => {
      db.query.mockRejectedValue(new Error("Database connection error"));

      const req = {
        params: { id: "123" },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await listBuckets(req, res);

      expect(db.query).toHaveBeenCalledWith(
        "SELECT id, bucket_alias FROM aws_buckets where account_id=?",
        "123"
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching buckets:",
        expect.any(Error)
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Internal Server Error",
      });

      consoleSpy.mockRestore();
    });
  });
});
