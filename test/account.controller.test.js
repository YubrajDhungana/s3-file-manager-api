const { getAccounts } = require("../controller/account.controller");
const db = require("../configs/db");
const { decrypt } = require("../utils/cryptoUtils");

jest.mock("../configs/db", () => ({
  query: jest.fn(),
}));
jest.mock("../utils/cryptoUtils", () => ({
  decrypt: jest.fn(),
}));

describe("getAccounts", () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it("should fetch and decrypt accounts successfully", async () => {
    const mockAccounts = [
      { id: 1, account_name: "encrypted-account-1" },
      { id: 2, account_name: "encrypted-account-2" },
    ];

    db.query.mockResolvedValueOnce([mockAccounts]);

    decrypt
      .mockReturnValueOnce("decrypted-account-1")
      .mockReturnValueOnce("decrypted-account-2");

    await getAccounts(mockReq, mockRes);

    expect(db.query).toHaveBeenCalledWith(
      "SELECT id, account_name FROM aws_accounts"
    );

    expect(decrypt).toHaveBeenCalledWith("encrypted-account-1");
    expect(decrypt).toHaveBeenCalledWith("encrypted-account-2");

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([
      { id: 1, account_name: "decrypted-account-1" },
      { id: 2, account_name: "decrypted-account-2" },
    ]);
  });

  it("should handle empty accounts list", async () => {
    db.query.mockResolvedValueOnce([[]]);

    await getAccounts(mockReq, mockRes);

    expect(db.query).toHaveBeenCalledWith(
      "SELECT id, account_name FROM aws_accounts"
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([]);
  });

  it("should handle database errors", async () => {
    const dbError = new Error("Database connection failed");
    db.query.mockRejectedValueOnce(dbError);

    const originalError = console.error;
    console.error = jest.fn();

    await getAccounts(mockReq, mockRes);

    expect(db.query).toHaveBeenCalledWith(
      "SELECT id, account_name FROM aws_accounts"
    );
    expect(console.error).toHaveBeenCalledWith(
      "Error fetching account:",
      dbError
    );
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Internal Server Error",
    });
    console.error = originalError;
  });

  it("should handle decrypt errors gracefully", async () => {
    const mockAccounts = [{ id: 1, account_name: "encrypted-account-1" }];

    db.query.mockResolvedValueOnce([mockAccounts]);

    const decryptError = new Error("Decryption failed");
    decrypt.mockImplementation(() => {
      throw decryptError;
    });

    const originalError = console.error;
    console.error = jest.fn();

    await getAccounts(mockReq, mockRes);

    expect(db.query).toHaveBeenCalledWith(
      "SELECT id, account_name FROM aws_accounts"
    );
    expect(decrypt).toHaveBeenCalledWith("encrypted-account-1");
    expect(console.error).toHaveBeenCalledWith(
      "Error fetching account:",
      expect.any(Error)
    );
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Internal Server Error",
    });
    console.error = originalError;
  });
});
