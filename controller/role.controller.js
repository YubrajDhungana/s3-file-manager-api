const db = require("../configs/db");

const createRole = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Role name is required" });
  }

  try {
    const [result] = await db.query("INSERT INTO roles (name) VALUES (?)", [
      name,
    ]);

    res.status(201).json({
      message: "Role created successfully"
    }); 
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ message: "Role with this name already exists" });
    }
    console.error("Error creating role:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllRoles = async (req, res) => {
  try {
    const [roles] = await db.query("SELECT id, name FROM roles ORDER BY name");

    res.status(200).json({
      message: "Roles retrieved successfully",
      data: roles,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const assignBucketToRole = async (req, res) => {
  const { roleId, bucketId } = req.params;
  try {
    const [role] = await db.query("SELECT * FROM roles WHERE id = ?", [roleId]);
    if (role.length === 0) {
      return res.status(404).json({ message: "Role not found" });
    }

    const [bucket] = await db.query("SELECT * FROM aws_buckets WHERE id = ?", [
      bucketId,
    ]);
    if (bucket.length === 0) {
      return res.status(404).json({ message: "Bucket not found" });
    }

    // avoid duplicate assignment
    await db.query(
      `INSERT IGNORE INTO role_buckets (role_id, bucket_id) VALUES (?, ?)`,
      [roleId, bucketId]
    );

    res.status(201).json({ message: "Bucket assigned to role successfully" });
  } catch (error) {
    console.error("Error assigning bucket to role:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const assignRoleToUser = async (req, res) => {
  const { userId, roleId } = req.params;
  try {
    const [user] = await db.query("SELECT * FROM user WHERE id = ?", [userId]);
    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const [role] = await db.query("SELECT * FROM roles WHERE id = ?", [roleId]);
    if (role.length === 0) {
      return res.status(404).json({ message: "Role not found" });
    }

    const [row] = await db.query(
      "SELECT COUNT(0)>0 AS is_present from user_roles where user_id=?", [userId,roleId]
    );
    if (row[0].is_present) {
      return res
        .status(409)
        .json({ message: "user already has a role assigned" });
    }

    await db.query(
      `INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`,
      [userId, roleId]
    );

    res.status(201).json({ message: "Role assigned to user successfully" });
  } catch (error) {
    console.error("Error assigning role to user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createRole,
  assignBucketToRole,
  assignRoleToUser,
  getAllRoles,
};
