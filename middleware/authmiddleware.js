const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    // 1. Hel token-ka
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Access denied. No token provided",
      });
    }

    // 2. Ka saar Bearer
    const token = authHeader.split(" ")[1];

    // 3. Hubi token-ka
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // 4. Ku kaydi xogta user-ka request-ka
    req.user = decoded;

    // 5. U gudub route-ka xiga
    next();

  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;