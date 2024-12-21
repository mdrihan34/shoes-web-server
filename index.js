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
    
        // Save product information into the database
        const product = {
          name: Name,
          price: Price,
          description: description,
          userName: userName,
          userEmail: userEmail,
          userProfilePicture: userProfile,
          productImage: `/uploads/${req.file.filename}`, // Save the image path in the DB
          createdAt: new Date() // Add the current date and time when the product is uploaded
        };
    
        // Insert into the MongoDB product collection
        const result = await productCollection.insertOne(product);
    
        res.status(201).send({ message: "Product uploaded successfully!", product: result });
      } catch (error) {
        console.error("Error uploading product:", error);
        res.status(500).send({ message: "Failed to upload product", error: error.message });
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