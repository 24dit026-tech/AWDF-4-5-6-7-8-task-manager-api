const validateTask = (req, res, next) => {
  const { title } = req.body;

  if (!title || typeof title !== "string" || title.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Validation Error: Task title is required and cannot be empty."
    });
  }

  next();
};

const validateAuth = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Validation Error: Both email and password are required."
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Validation Error: Password must be at least 6 characters long."
    });
  }

  next();
};

module.exports = {
  validateTask,
  validateAuth
};
