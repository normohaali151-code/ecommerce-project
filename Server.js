const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

// Models
const User = require("./models/User");
const Product = require("./models/Product");
const Order = require("./models/Order");

// Middleware
const authMiddleware = require("./middleware/authmiddleware");
const authorizeRole = require("./middleware/authorizeRole");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
// HOME ROUTE
app.get("/", (req, res) => {
  res.send("E-commerce Backend is Running!");
});

// REGISTER
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// GET PROFILE
app.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "Protected profile",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// GET MY PROFILE
app.get("/users/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// UPDATE MY PROFILE
app.patch("/users/me", authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

// DELETE MY ACCOUNT
app.delete("/users/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "Your account has been deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// GET ALL USERS - ADMIN
app.get(
  "/users",
  authMiddleware,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const users = await User.find().select("-password");

      res.json(users);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

// GET ONE USER - ADMIN
app.get(
  "/users/:id",
  authMiddleware,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id)
        .select("-password");

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.json({ user });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

// UPDATE USER - ADMIN
app.patch(
  "/users/:id",
  authMiddleware,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const { name, email, role } = req.body;

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { name, email, role },
        { new: true, runValidators: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.json({
        message: "User updated successfully",
        user,
      });
    } catch (error) {
      res.status(400).json({
        message: error.message,
      });
    }
  }
);

// DELETE USER - ADMIN
app.delete(
  "/users/:id",
  authMiddleware,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.json({
        message: "User deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);
// CREATE UPLOADS FOLDER IF NOT EXISTS
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// MULTER STORAGE
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,

  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// MAKE IMAGES ACCESSIBLE
app.use("/uploads", express.static(uploadDir));

// IMAGE UPLOAD ROUTE
app.post(
  "/upload",
  authMiddleware,
  authorizeRole("admin"),
  upload.single("image"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        message: "Please select an image",
      });
    }

    const imageUrl =
      `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    res.json({
      message: "Image uploaded successfully",
      imageUrl,
    });
  }
);
// GET ALL PRODUCTS
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();

    res.json({ products });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// GET ONE PRODUCT
app.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json({ product });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// CREATE PRODUCT - ADMIN
app.post(
  "/products",
  authMiddleware,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const product = await Product.create(req.body);

      res.status(201).json({
        message: "Product created successfully",
        product,
      });
    } catch (error) {
      res.status(400).json({
        message: error.message,
      });
    }
  }
);

// UPDATE PRODUCT - ADMIN
app.patch(
  "/products/:id",
  authMiddleware,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      res.json({
        message: "Product updated successfully",
        product,
      });
    } catch (error) {
      res.status(400).json({
        message: error.message,
      });
    }
  }
);

// DELETE PRODUCT - ADMIN
app.delete(
  "/products/:id",
  authMiddleware,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const product = await Product.findByIdAndDelete(
        req.params.id
      );

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      res.json({
        message: "Product deleted successfully",
        product,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);
app.post("/orders", authMiddleware, async (req, res) => {
  try {
    const {
      fullName,
      phone,
      address,
      products,
      paymentMethod,
      paymentPhone,
    } = req.body;

    if (!fullName || !phone || !address) {
      return res.status(400).json({
        message: "Name, phone and address are required",
      });
    }

    if (paymentMethod !== "EVC Plus") {
      return res.status(400).json({
        message: "Please select EVC Plus",
      });
    }

    if (!/^61\d{7}$/.test(paymentPhone || "")) {
      return res.status(400).json({
        message: "Enter a valid demo EVC number (61XXXXXXX)",
      });
    }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        message: "Please add products to your order",
      });
    }

    let totalPrice = 0;
    const orderProducts = [];

    for (const item of products) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        return res.status(400).json({
          message: "Invalid quantity",
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Not enough stock for ${product.name}`,
        });
      }

      orderProducts.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
      });

      totalPrice += product.price * item.quantity;
    }

    // DEMO PAYMENT ONLY - NO REAL MONEY IS CHARGED

    const order = await Order.create({
      user: req.user.id,
      fullName,
      phone,
      address,
      products: orderProducts,
      totalPrice,
      paymentMethod: "EVC Plus",
      paymentPhone,
      paymentStatus: "demo_paid",
    });

    res.status(201).json({
      message: "Demo payment successful! Order created.",
      paymentStatus: "demo_paid",
      demoMode: true,
      order,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// GET MY ORDERS
app.get("/orders/my-orders", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user.id,
    }).populate("products.product");

    res.json(orders);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});
// GET ALL ORDERS - ADMIN
app.get(
  "/admin/orders",
  authMiddleware,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const orders = await Order.find()
        .populate("user", "name email")
        .populate("products.product")
        .sort({ createdAt: -1 });

      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);


// UPDATE ORDER STATUS - ADMIN
app.patch(
  "/admin/orders/:id",
  authMiddleware,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const { status } = req.body;

      const allowedStatuses = [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid order status"
        });
      }

      const order = await Order.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true, runValidators: true }
      );

      if (!order) {
        return res.status(404).json({
          message: "Order not found"
        });
      }

      res.json({
        message: "Order status updated",
        order
      });

    } catch (error) {
      res.status(500).json({
        message: error.message
      });
    }
  }
);
 // DELETE ORDER - ADMIN
app.delete(
  "/admin/orders/:id",
  authMiddleware,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const order = await Order.findByIdAndDelete(
        req.params.id
      );

      if (!order) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      res.json({
        message: "Order deleted successfully",
        order,
      });

    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
); 
// ADMIN DASHBOARD STATS
app.get(
  "/admin/stats",
  authMiddleware,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const totalProducts = await Product.countDocuments();

      const totalOrders = await Order.countDocuments();

      const totalUsers = await User.countDocuments();

      const sales = await Order.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: "$totalPrice" },
          },
        },
      ]);

      const totalSales = sales.length > 0
        ? sales[0].total
        : 0;

      res.json({
        totalProducts,
        totalOrders,
        totalUsers,
        totalSales,
      });

    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);
// CONNECT TO MONGODB ATLAS AND START SERVER

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from .env");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Atlas Connected Successfully!");
    console.log("Database:", mongoose.connection.name);

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Server Startup Error:", error.message);
    process.exit(1);
  }
}

startServer();