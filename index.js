const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const { ObjectId } = require('mongodb');
const port = 5000;
require('dotenv').config();
app.use(cors());
// const { MongoClient } = require('mongodb');
// Make sure the uploads folder exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
// const uri = "mongodb://localhost:27017";

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Uploads folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Generate unique filename
  }
});
const upload = multer({ storage: storage });

app.use(express.json());

// Serve static files (images) from the 'uploads' folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Setup
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2r8fe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: {
    version: ServerApiVersion.v1,
    // strict: true,
    deprecationErrors: true,
  }
});

const userCollection = client.db('QuickMark').collection('users');
const productCollection = client.db('QuickMark').collection('product');
const cardCollection = client.db('QuickMark').collection('cart');
const orderCollection = client.db('QuickMark').collection('orders');

// Register user route


// Get user profile route


// Connect the client to the server
async function run() {
  try {
    const verifyToken = (req, res, next) => {
      // Check if the Authorization header exists
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Forbidden access' });
      }
    
      // Extract the token from the Authorization header
      const token = req.headers.authorization.split(' ')[1];
    
      // Verify the token
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'Forbidden access' });
        }
        // Attach the decoded token to the request object
        req.decoded = decoded;
        next(); // Move to the next middleware or route handler
      });
    };
    app.get('/users', async(req,res)=>{
      const cursor = userCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })
    // Update user role API
app.put('/users/:id', async (req, res) => {
  const id = req.params.id;
  const { role } = req.body; // Expects role in the request body, e.g., { role: "Seller" }
  const query = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      role: role, // Set the role to "Seller"
    },
  };

  try {
    const result = await userCollection.updateOne(query, updateDoc);
    if (result.modifiedCount > 0) {
      res.status(200).send({ success: true, message: "User role updated successfully." });
    } else {
      res.status(404).send({ success: false, message: "User not found or no changes made." });
    }
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).send({ success: false, message: "Failed to update user role." });
  }
});

// Delete user API
app.delete('/users/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };

  try {
    const result = await userCollection.deleteOne(query);
    if (result.deletedCount > 0) {
      res.status(200).send({ success: true, message: "User deleted successfully." });
    } else {
      res.status(404).send({ success: false, message: "User not found." });
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).send({ success: false, message: "Failed to delete user." });
  }
});



    app.get('/current-user', async (req, res) => {
      const email = req.query.email; 
      if (!email) {
          return res.status(400).send({ message: "Email is required" });
      }
  
      try {
          const user = await userCollection.findOne({ email: email }); 
          if (!user) {
              return res.status(404).send({ message: "User not found" });
          }
          res.send(user); 
      } catch (error) {
          res.status(500).send({ message: "Server Error", error });
      }
  });
    app.post('/jwt',async(req,res)=>{
      const user = req.body
      const token = jwt.sign(user,process.env.ACCESS_Token_SECRET,{
          expiresIn: '1h'})
      res.send({token})
    })
    app.post("/register", upload.single('profilePicture'), async (req, res) => {
      try {
        const {name, email, role } = req.body;
        const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;
    
        if (!email || !name||  !role || !profilePicture) {
          return res.status(400).send({ message: "All fields are required!" });
        }
    
        const user = {name, email, role, profilePicture };
        const result = await userCollection.insertOne(user);
        res.send({ success: true, message: "User registered successfully!", result, profilePicture });
      } catch (error) {
        res.status(500).send({ success: false, message: "Failed to register user", error });
      }
    });
    app.get("/getUserProfile", async (req, res) => {
      const email = req.headers.email; // Email is expected in the headers
    
      if (!email) {
        return res.status(400).send({ message: "Email is required" });
      }
    
      try {
        // Find user by email
        const user = await userCollection.findOne({ email });
    
        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }
    
        res.send({ profilePicture: user.profilePicture });
      } catch (error) {
        res.status(500).send({ message: "Failed to retrieve user profile", error });
      }

    });

   
    
    app.post("/products-upload", upload.single('productImage'), async (req, res) => {
      try {
        // Log the body and file content for debugging
        console.log("Request Body:", req.body); // This should log product data like Name, Price, etc.
        console.log("Uploaded File:", req.file); // This should log the uploaded file details
    
        // Extract product data from the body
        const { Name, Price, description, userName, userEmail, userProfile } = req.body;
    
        if (!Name || !Price || !description || !userName || !userEmail || !userProfile || !req.file) {
          return res.status(400).send({ message: "All fields are required!" });
        }
    
       
        const product = {
          name: Name,
          price: Price,
          description: description,
          userName: userName,
          userEmail: userEmail,
          userProfilePicture: userProfile,
          productImage: `/uploads/${req.file.filename}`, 
          createdAt: new Date()
        };
    
        // Insert into the MongoDB product collection
        const result = await productCollection.insertOne(product);
    
        res.status(201).send({ message: "Product uploaded successfully!", product: result });
      } catch (error) {
        console.error("Error uploading product:", error);
        res.status(500).send({ message: "Failed to upload product", error: error.message });
      }
    });
//  Add to card api create 

app.post("/addToCart", async (req, res) => {
  const { userEmail, name, price, productImage ,sellerEmail } = req.body;

  // Validate the request body
  if (!userEmail || !name || !price || !productImage || !sellerEmail) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Assuming you have a MongoDB collection named 'cartCollection'
    

    // Create the item object to insert
    const newCartItem = { userEmail, name, price, productImage ,sellerEmail};

    // Insert the item into the database
    const result = await cardCollection.insertOne(newCartItem);

    // Respond with success message
    res.status(201).json({ 
      message: "Item added to cart successfully!", 
      itemId: result.insertedId 
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ message: "Failed to add to cart" });
  }
});
app.post("/orders", async (req, res) => {
  const { BuyerEmail, name, address, OrderEmail ,sellerEmail , Status,  OrderName , phone , zip,totalPrice} = req.body;

  // Validate the request body
  if (!BuyerEmail || !name || !address || !OrderEmail || !sellerEmail || !OrderName || !phone || !zip || !totalPrice || !Status) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Assuming you have a MongoDB collection named 'cartCollection'
    

    // Create the item object to insert
    const orderItem = { BuyerEmail, name, address, OrderEmail ,sellerEmail , Status,  OrderName , phone , zip,totalPrice ,
      createdAt: new Date()
    }

    // Insert the item into the database
    const result = await orderCollection.insertOne(orderItem);
   res.send(result)
    // Respond with success message
    // res.status(201).json({ 
    //   message: "order successfully!", 
    //   itemId: result.insertedId 
    // });
  } catch (error) {
    console.error("Error order:", error);
    res.status(500).json({ message: "Failed to order" });
  }
});
app.get("/api/products", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // ডাটাবেস থেকে প্রোডাক্ট ফেচ
    const products = await productCollection.find().skip(skip).limit(limit).toArray();
    const totalProducts = await productCollection.countDocuments(); // মোট প্রোডাক্ট সংখ্যা

    // রেসপন্স পাঠানো
    res.json({
      success: true,
      page,
      limit,
      totalProducts,
      products,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products. Please try again later.",
    });
  }
});

app.get("/orders", async (req, res) => {
  const email = req.query.email; // Extract email from query parameters
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  try {
    const query = { BuyerEmail: email }; // Match documents where `userEmail` matches
    const result = await orderCollection.find(query).toArray(); // Fetch all matching documents
    res.send(result); // Return as a list
  } catch (error) {
    console.error("Failed to fetch cart items:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.get("/order", async (req, res) => {
  const email = req.query.email; // Extract email from query parameters
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  try {
    const query = { sellerEmail: email }; // Match documents where `userEmail` matches
    const result = await orderCollection.find(query).toArray(); // Fetch all matching documents
    res.send(result); // Return as a list
  } catch (error) {
    console.error("Failed to fetch cart items:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.put("/order/:id", async (req, res) => {
  const id = req.params.id; // Order ID from request params
  const { Status } = req.body; // Status from request body

  // Validate ObjectId
  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid order ID" });
  }

  // Validate Status
  const allowedStatuses = ["Confirmed", "Pending", "Canceled"];
  if (!Status || !allowedStatuses.includes(Status)) {
    return res
      .status(400)
      .send({ message: "Valid status is required ('Confirmed', 'Pending', 'Canceled')" });
  }

  try {
    const filter = { _id: new ObjectId(id) }; // MongoDB filter for the document
    const updateDoc = { $set: { Status } }; // Document fields to update

    // Update the order in the database
    const result = await orderCollection.updateOne(filter, updateDoc);

    if (result.modifiedCount === 0) {
      return res.status(404).send({
        message: "No changes made. Either the order was not found or already up-to-date.",
      });
    }

    res.status(200).send({
      message: "Order status updated successfully",
      updatedId: id,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).send({
      message: "Failed to update order status",
      error: error.message,
    });
  }
});

    app.get("/user-products", async (req, res) => {
      try {
        // Extract email from query parameters
        const { email } = req.query;
    
        if (!email) {
          return res.status(400).send({ message: "Email is required!" });
        }
    
        // Fetch products where userEmail matches the provided email
        const userProducts = await productCollection.find({ userEmail: email }).toArray();
    
        if (!userProducts.length) {
          return res.status(404).send({ message: "No products found for this user" });
        }
    
        // Send the filtered products
        res.status(200).send({ message: "User products fetched successfully", products: userProducts });
      } catch (error) {
        console.error("Error fetching user products:", error);
        res.status(500).send({ message: "Failed to fetch user products", error: error.message });
      }
    });
 
    app.put("/user-products/:id", async (req, res) => {
      const id = req.params.id; // প্রোডাক্ট ID
      const { name, price, description } = req.body; 
    
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid product ID" });
      }
    
   
      if (!name || !price || !description) {
        return res.status(400).send({ message: "Name, Price, and Description are required" });
      }
    
      try {
        const filter = { _id: new ObjectId(id) }; // ObjectId ফিল্টার
        const updateDoc = {
          $set: { name, price, description }, // আপডেট ফিল্ড সেট করা
        };
    
        const result = await productCollection.updateOne(filter, updateDoc);
    
        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: "No changes made or product not found" });
        }
    
        res.send({ message: "Product updated successfully", result });
      } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).send({ message: "Failed to update product", error: error.message });
      }
    });
    app.delete("/user-products/:id", async(req,res)=>{
     const id = req.params.id
     const query = {_id: new ObjectId(id)}
     const result = await productCollection.deleteOne(query)
    res.send(result)
    })
  //  all product api 
  app.get('/products', async(req,res)=>{
    const cursor = productCollection.find()
    const result = await cursor.toArray()
    res.send(result)
  })
  app.get('/orderes', async(req,res) =>{
    const cursor = orderCollection.find()
    const result = await cursor.toArray()
    res.send(result)
  })
  app.get("/products/:id", async(req,res)=>{
    const id = req.params.id
    const query = {_id: new ObjectId(id)}
    const result = await productCollection.findOne(query)
   res.send(result)
   })
  app.get('/featured-products', async (req, res) => {
    try {
      const result = await productCollection.find({}).limit(6).toArray();
      res.send(result); // Directly send the result
    } catch (error) {
      console.error('Error fetching featured products:', error);
      res.status(500).send({ message: 'Error fetching featured products' });
    }
  });
     // cart api 
     app.get("/carts", async (req, res) => {
      const email = req.query.email; // Extract email from query parameters
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      try {
        const query = { userEmail: email }; // Match documents where `userEmail` matches
        const result = await cardCollection.find(query).toArray(); // Fetch all matching documents
        res.send({ products: result }); // Return as a list
      } catch (error) {
        console.error("Failed to fetch cart items:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });
    app.delete("/carts/:id", async(req,res)=>{
   const id = req.params.id;
if (!ObjectId.isValid(id)) {
  return res.status(400).send({ error: "Invalid ID format" });
}
const query = { _id: new ObjectId(id) };
const result = await cardCollection.deleteOne(query);
res.send(result);
     })


// Delete a user

    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error(error);
  }
}

run().catch(console.dir);

// Start the server
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
