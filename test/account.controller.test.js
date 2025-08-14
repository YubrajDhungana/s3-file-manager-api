const { getAccounts } = require("../controller/account.controller");
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

describe("Account Controller", () => {
  describe("getAccounts", () => {
    it("should get accounts successfully", async () => {
      // Mock database response
      const mockRows = [
        { id: 1, account_name: "encrypted_account_1" },
        { id: 2, account_name: "encrypted_account_2" },
      ];

      db.query.mockResolvedValue([mockRows]);
      decrypt.mockReturnValueOnce("Test Account 1");
      decrypt.mockReturnValueOnce("Test Account 2");

      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getAccounts(req, res);

      expect(db.query).toHaveBeenCalledWith(
        "SELECT id, account_name FROM aws_accounts"
      );
      expect(decrypt).toHaveBeenCalledTimes(2);
      expect(decrypt).toHaveBeenNthCalledWith(1, "encrypted_account_1");
      expect(decrypt).toHaveBeenNthCalledWith(2, "encrypted_account_2");

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        { id: 1, account_name: "Test Account 1" },
        { id: 2, account_name: "Test Account 2" },
      ]);
    });

    it("should return empty array when no accounts found", async () => {
      db.query.mockResolvedValue([[]]);

      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getAccounts(req, res);

      expect(db.query).toHaveBeenCalledWith(
        "SELECT id, account_name FROM aws_accounts"
      );
      expect(decrypt).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("should handle database errors", async () => {
      db.query.mockRejectedValue(new Error("Database connection error"));

      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await getAccounts(req, res);

      expect(db.query).toHaveBeenCalledWith(
        "SELECT id, account_name FROM aws_accounts"
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching account:",
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
