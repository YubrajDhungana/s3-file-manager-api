const authController = require("../controller/auth.controller");
const db = require("../configs/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

jest.mock("../configs/db", () => ({
  query: jest.fn(),
}));

jest.mock("jsonwebtoken");
jest.mock("bcrypt");
jest.mock("uuid");

describe("Auth Controller", () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      cookies: {},
      user: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    jest.clearAllMocks();
    process.env.SECRET_KEY = "test-secret-key";
  });

  describe("loginCheck", () => {
    it("should return 400 if email is missing", async () => {
      mockReq.body = { password: "password123" };

      await authController.loginCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Email and password are required",
      });
    });

    it("should return 400 if password is missing", async () => {
      mockReq.body = { email: "test@example.com" };

      await authController.loginCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Email and password are required",
      });
    });

    it("should return 401 if user not found", async () => {
      mockReq.body = { email: "test@example.com", password: "password123" };
      db.query.mockResolvedValueOnce([[]]);

      await authController.loginCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Invalid email or password",
      });
    });

    it("should return 401 if user status is revoked", async () => {
      mockReq.body = { email: "test@example.com", password: "password123" };
      db.query.mockResolvedValueOnce([
        [
          {
            id: 1,
            email: "test@example.com",
            status: "revoked",
            password: "hashedpassword",
          },
        ],
      ]);

      await authController.loginCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "you are not allowed to login",
      });
    });

    it("should return 401 if password is invalid", async () => {
      mockReq.body = { email: "test@example.com", password: "wrongpassword" };
      db.query.mockResolvedValueOnce([
        [
          {
            id: 1,
            email: "test@example.com",
            status: "active",
            password: "hashedpassword",
          },
        ],
      ]);
      bcrypt.compare.mockResolvedValueOnce(false);

      await authController.loginCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Invalid email or password",
      });
    });

    it("should login successfully with valid credentials", async () => {
      const mockUser = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        status: "active",
        password: "hashedpassword",
      };
      const mockJti = "test-jti-uuid";
      const mockToken = "mock-jwt-token";

      mockReq.body = { email: "test@example.com", password: "password123" };
      db.query.mockResolvedValueOnce([[mockUser]]);
      db.query.mockResolvedValueOnce();
      bcrypt.compare.mockResolvedValueOnce(true);
      uuidv4.mockReturnValueOnce(mockJti);
      jwt.sign.mockReturnValueOnce(mockToken);

      await authController.loginCheck(mockReq, mockRes);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        "password123",
        "hashedpassword"
      );
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          jti: mockJti,
        },
        "test-secret-key",
        { expiresIn: "1hr" }
      );
      expect(db.query).toHaveBeenCalledWith(
        "INSERT INTO auth_tokens (user_id, jti, expires_at) VALUES (?, ?, ?)",
        [mockUser.id, mockJti, expect.any(Date)]
      );
      expect(mockRes.cookie).toHaveBeenCalledWith("token", mockToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 60 * 60 * 1000,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "login successfull",
      });
    });

    it("should return 500 on database error", async () => {
      mockReq.body = { email: "test@example.com", password: "password123" };
      db.query.mockRejectedValueOnce(new Error("Database error"));

      await authController.loginCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Internal server error",
      });
    });
  });

  describe("authcheck", () => {
    it("should return user information when authenticated", () => {
      mockReq.user = {
        name: "Test User",
        email: "test@example.com",
      };

      authController.authcheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        authenticated: true,
        name: "Test User",
        email: "test@example.com",
      });
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      const mockToken = "valid-jwt-token";
      const mockDecoded = { jti: "test-jti" };

      mockReq.cookies = { token: mockToken };
      jwt.verify.mockReturnValueOnce(mockDecoded);
      db.query.mockResolvedValueOnce();

      await authController.logout(mockReq, mockRes);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, "test-secret-key");
      expect(db.query).toHaveBeenCalledWith(
        "UPDATE auth_tokens SET is_revoked=TRUE,revoked_at=NOW() WHERE jti=?",
        [mockDecoded.jti]
      );
      expect(mockRes.clearCookie).toHaveBeenCalledWith("token", {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Logged out successfully",
      });
    });
    it("should return 500 on JWT verification error", async () => {
      const mockToken = "invalid-jwt-token";

      mockReq.cookies = { token: mockToken };
      jwt.verify.mockImplementationOnce(() => {
        throw new Error("JWT verification failed");
      });

      await authController.logout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Error during logout",
      });
    });

    it("should return 500 on database error during logout", async () => {
      const mockToken = "valid-jwt-token";
      const mockDecoded = { jti: "test-jti" };

      mockReq.cookies = { token: mockToken };
      jwt.verify.mockReturnValueOnce(mockDecoded);
      db.query.mockRejectedValueOnce(new Error("Database error"));

      await authController.logout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Error during logout",
      });
    });
  });
});
