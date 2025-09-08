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
    mockReq = { user: { id: 1 } };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 401 if user not found", async () => {
    db.query.mockResolvedValueOnce([[]]); // user query returns empty
    await getAccounts(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  it("should return 403 if user has no role and is not superadmin", async () => {
    db.query
      .mockResolvedValueOnce([[{ user_type: "user" }]]) // user found
      .mockResolvedValueOnce([[]]); // role query returns empty
    await getAccounts(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Unauthorized: No roles assigned",
    });
  });

  it("should fetch all accounts for superadmin", async () => {
    db.query
      .mockResolvedValueOnce([[{ user_type: "superadmin" }]]) // user found
      .mockResolvedValueOnce([[{ name: "admin", id: 1 }]]) // role found
      .mockResolvedValueOnce([
        [
          { id: 1, account_name: "encrypted-account-1" },
          { id: 2, account_name: "encrypted-account-2" },
        ],
      ]);
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

  it("should fetch all accounts for admin role", async () => {
    db.query
      .mockResolvedValueOnce([[{ user_type: "user" }]]) 
      .mockResolvedValueOnce([[{ name: "admin", id: 1 }]]) 
      .mockResolvedValueOnce([
        [
          { id: 1, account_name: "encrypted-account-1" },
          { id: 2, account_name: "encrypted-account-2" },
        ],
      ]);
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

  it("should fetch only assigned accounts for regular user", async () => {
    db.query
      .mockResolvedValueOnce([[{ user_type: "user" }]]) // user found
      .mockResolvedValueOnce([[{ name: "user", id: 2 }]]) // role found
      .mockResolvedValueOnce([
        [{ id: 3, account_name: "encrypted-account-3" }],
      ]);
    decrypt.mockReturnValueOnce("decrypted-account-3");

    await getAccounts(mockReq, mockRes);

    expect(db.query).toHaveBeenCalledWith(
      "SELECT id,account_name from aws_accounts where id IN ( SELECT account_id from role_buckets where role_id =?)",
      [2]
    );
    expect(decrypt).toHaveBeenCalledWith("encrypted-account-3");
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([
      { id: 3, account_name: "decrypted-account-3" },
    ]);
  });

  it("should handle empty accounts list", async () => {
    db.query
      .mockResolvedValueOnce([[{ user_type: "superadmin" }]])
      .mockResolvedValueOnce([[{ name: "admin", id: 1 }]])
      .mockResolvedValueOnce([[]]);
    await getAccounts(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith([]);
  });

  it("should handle database errors", async () => {
    const dbError = new Error("Database connection failed");
    db.query.mockRejectedValueOnce(dbError);

    const originalError = console.error;
    console.error = jest.fn();

    await getAccounts(mockReq, mockRes);

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
    db.query
      .mockResolvedValueOnce([[{ user_type: "superadmin" }]])
      .mockResolvedValueOnce([[{ name: "admin", id: 1 }]])
      .mockResolvedValueOnce([
        [{ id: 1, account_name: "encrypted-account-1" }],
      ]);

    const decryptError = new Error("Decryption failed");
    decrypt.mockImplementation(() => {
      throw decryptError;
    });

    const originalError = console.error;
    console.error = jest.fn();

    await getAccounts(mockReq, mockRes);

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
