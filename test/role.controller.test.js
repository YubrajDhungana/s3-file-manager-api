const e = require("express");
const db = require("../configs/db");
const roleController = require("../controller/role.controller");

jest.mock("../configs/db", () => ({
  query: jest.fn(),
}));

describe("Test role creation", () => {
  let req, res;
  beforeEach(() => {
    req = {
      body: {
        name: "ADMIN",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should create role sucessfully", async () => {
    db.query.mockResolvedValueOnce([{ insertedId: 1 }]);

    await roleController.createRole(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Role created successfully",
    });
  });

  it("should return 400 if role name is missing", async () => {
    req.body.name = "";
    await roleController.createRole(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Role name is required",
    });
  });

  it("should return 409 for duplicate role name", async () => {
    const error = new Error();
    error.code = "ER_DUP_ENTRY";
    db.query.mockRejectedValueOnce(error);

    await roleController.createRole(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "Role with this name already exists",
    });
  });
});

describe("assigning role to user", () => {
  let req, res;
  beforeEach(() => {
    req = {
      params: {
        userId: 12,
        roleId: 4,
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 201 for successful role assignment", async () => {
    db.query.mockResolvedValueOnce([[{ id: 12 }]]); //user exists
    db.query.mockResolvedValueOnce([[{ id: 4 }]]); //role exists
    db.query.mockResolvedValueOnce([[{ is_present: 0 }]]);
    db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await roleController.assignRoleToUser(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Role assigned to user successfully",
    });
  });

  it("should return 404 for user not found", async () => {
    db.query.mockResolvedValueOnce([[]]);

    await roleController.assignRoleToUser(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "User not found",
    });
  });

  it("should return 404 for role not found", async () => {
    db.query.mockResolvedValueOnce([[{ id: 123 }]]);
    db.query.mockResolvedValueOnce([[]]);

    await roleController.assignRoleToUser(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Role not found",
    });
  });

  it("should return 409 on duplicate role assignment", async () => {
    db.query.mockResolvedValueOnce([[{ id: 12 }]]);
    db.query.mockResolvedValueOnce([[{ id: 4 }]]);
    db.query.mockResolvedValueOnce([[{ is_present: 1 }]]);

    await roleController.assignRoleToUser(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "user already has a role assigned",
    });
  });
});

describe("assign buckets to role", () => {
  let req, res;
  beforeEach(() => {
    req = {
      params: {
        roleId: 456,
        accountId:789
      },
      body:{
        bucketName:"test_bucket"
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("shoould return 201 on successful bucket assignment", async () => {
    db.query.mockResolvedValueOnce([[{ id: 456 }]]);
    db.query.mockResolvedValueOnce([[{ id: 789 }]]);
    db.query.mockResolvedValueOnce([[{ affectedRows: 1 }]]);

    await roleController.assignBucketToRole(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Bucket assigned to role successfully",
    });
  });

   it("should return 400 if bucket name is missing", async () => {
    req.body.bucketName = "";
    await roleController.assignBucketToRole(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Bucket name is required",
    });
  });

  it("should return 404 on role not found", async () => {
    req.params.roleId = 999;
    req.params.bucketId = 789;
    db.query.mockResolvedValueOnce([[]]);

    await roleController.assignBucketToRole(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Role not found",
    });
  });

  it("should return 404 on account not found", async () => {
    req.params.roleId = 456;
    req.params.accountId = 999;
    db.query.mockResolvedValueOnce([[{ id: 456 }]]);
    db.query.mockResolvedValueOnce([[]]);

    await roleController.assignBucketToRole(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Account not found",
    });
  });

  it("should return 201 on duplicate bucket assignment", async () => {
    req.params.roleId = 456;
    req.params.accountId = 789;
    db.query.mockResolvedValueOnce([[{ id: 456 }]]);
    db.query.mockResolvedValueOnce([[{ id: 789 }]]);
    db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

    await roleController.assignBucketToRole(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Bucket assigned to role successfully",
    });
  });
});

describe("getAllRoles", () => {
  let req, res;
  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 200 and roles data", async () => {
    const mockRoles = [{ role_id: 1, role_name: "admin", buckets: "bucket1,bucket2" }];
    db.query.mockResolvedValueOnce([mockRoles]);

    await roleController.getAllRoles(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Roles retrieved successfully",
      data: mockRoles,
    });
  });

  it("should return 500 on db error", async () => {
    db.query.mockRejectedValueOnce(new Error("DB error"));
    await roleController.getAllRoles(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error",
    });
  });
});

describe("deleteRole", () => {
  let req, res;
  beforeEach(() => {
    req = {
      params: { roleId: 1 },
      user: { user_type: "superadmin" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 400 if roleId is missing", async () => {
    req.params.roleId = undefined;
    await roleController.deleteRole(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "RoleId is required" });
  });

  it("should return 403 if user is not superadmin", async () => {
    req.user.user_type = "admin";
    await roleController.deleteRole(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Only superadmin can delete roles" });
  });

  it("should return 404 if role not found", async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
    await roleController.deleteRole(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Role not found" });
  });

  it("should return 200 if role deleted", async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    await roleController.deleteRole(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Role deleted successfully" });
  });

  it("should return 500 on db error", async () => {
    db.query.mockRejectedValueOnce(new Error("DB error"));
    await roleController.deleteRole(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
  });
});

describe("getAllUsers", () => {
  let req, res;
  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 200 and user data", async () => {
    const mockUsers = [{ id: 1, name: "User1", email: "u1@test.com", status: "active", role_name: "admin" }];
    db.query.mockResolvedValueOnce([mockUsers]);
    await roleController.getAllUsers(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user: mockUsers });
  });

  it("should return 500 on db error", async () => {
    db.query.mockRejectedValueOnce(new Error("DB error"));
    await roleController.getAllUsers(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
  });
});

describe("getBucketsByRoleId", () => {
  let req, res;
  beforeEach(() => {
    req = {
      params: { roleId: 2 },
      user: { user_type: "superadmin" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 400 if roleId is missing", async () => {
    req.params.roleId = undefined;
    await roleController.getBucketsByRoleId(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "RoleId is required" });
  });

  it("should return 403 if user is not superadmin", async () => {
    req.user.user_type = "admin";
    await roleController.getBucketsByRoleId(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Only superadmin can delete roles" });
  });

  it("should return 200 with buckets", async () => {
    const mockBuckets = [{ bucket_name: "bucket1" }];
    db.query.mockResolvedValueOnce([mockBuckets]);
    await roleController.getBucketsByRoleId(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ buckets: mockBuckets });
  });

  it("should handle db error gracefully", async () => {
    db.query.mockRejectedValueOnce(new Error("DB error"));
    await roleController.getBucketsByRoleId(req, res);
  });
});
describe("deleteBucketByRole", () => {
  let req, res;
  beforeEach(() => {
    req = {
      params: { roleId: 2 },
      query: { bucketName: "bucket1" },
      user: { user_type: "superadmin" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 400 if roleId is missing", async () => {
    req.params.roleId = undefined;
    await roleController.deleteBucketByRole(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "RoleId is required" });
  });

  it("should return 400 if bucketName is missing", async () => {
    req.query.bucketName = undefined;
    await roleController.deleteBucketByRole(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Bucket name is required" });
  });

  it("should return 403 if user is not superadmin", async () => {
    req.user.user_type = "admin";
    await roleController.deleteBucketByRole(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Only superadmin can delete roles" });
  });

  it("should return 404 if bucket not found", async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
    await roleController.deleteBucketByRole(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Bucket not found" });
  });

  it("should return 200 if bucket deleted", async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    await roleController.deleteBucketByRole(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Bucket deleted successfully" });
  });

  it("should handle db error gracefully", async () => {
    db.query.mockRejectedValueOnce(new Error("DB error"));
    await roleController.deleteBucketByRole(req, res);
    
  });
});