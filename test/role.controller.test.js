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
