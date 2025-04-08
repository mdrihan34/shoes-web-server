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


if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
// const uri = "mongodb://localhost:27017";


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Uploads folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); 
  }
});
const upload = multer({ storage: storage });

app.use(express.json());


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

//api for add deshboard
app.get('/api/users/count', async (req, res) => {
  try {
    const count = await userCollection.estimatedDocumentCount();
    res.json({ totalUsers: count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user count' });
  }
});
app.get('/api/products/count', async (req, res) => {
  try {
    const count = await productCollection.estimatedDocumentCount();
    res.json({ totalProducts: count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get product count' });
  }
});
app.get('/api/sales/total', async (req, res) => {
  try {
    const result = await orderCollection.aggregate([
      { $group: { _id: null, totalSales: { $sum: "$totalAmount" } } }
    ]).toArray();

    const total = result[0]?.totalSales || 0;
    res.json({ totalSales: total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate sales' });
  }
});
app.get('/api/orders/pending', async (req, res) => {
  try {
    const count = await orderCollection.countDocuments({ status: 'pending' });
    res.json({ pendingOrders: count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get pending orders count' });
  }
});





// Connect the client to the server
async function run() {
  try {
    const verifyToken = (req, res, next) => {
     
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Forbidden access' });
      }
    
     
      const token = req.headers.authorization.split(' ')[1];
    
      // Verify the token
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'Forbidden access' });
        }
      
        req.decoded = decoded;
        next(); 
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
  const { role } = req.body; 
  const query = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      role: role, // Set the role to "Seller"
    },
  };
  app.get('/api/users', async (req, res) => {
    try {
      const users = await userCollection.find(); 
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch users', error: err });
    }
  });
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
        expiresIn: '1d'})
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
      const email = req.headers.email; 
    
      if (!email) {
        return res.status(400).send({ message: "Email is required" });
      }
    
      try {
      
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
       
        console.log("Request Body:", req.body); 
        console.log("Uploaded File:", req.file);
    
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
    
      
        const result = await productCollection.insertOne(product);
    
        res.status(201).send({ message: "Product uploaded successfully!", product: result });
      } catch (error) {
        console.error("Error uploading product:", error);
        res.status(500).send({ message: "Failed to upload product", error: error.message });
      }
    });


app.post("/addToCart", async (req, res) => {
  const { userEmail, name, price, productImage ,sellerEmail } = req.body;


  if (!userEmail || !name || !price || !productImage || !sellerEmail) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
  
    


    const newCartItem = { userEmail, name, price, productImage ,sellerEmail};


    const result = await cardCollection.insertOne(newCartItem);

  
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
  const {
    BuyerEmail,
    name,
    address,
    OrderEmail,
    sellerEmail,
    Status,
    OrderName,
    phone,
    zip,
    totalPrice,
    items
  } = req.body;


  if (
    !BuyerEmail ||
    !name ||
    !address ||
    !OrderEmail ||
    !sellerEmail ||
    !OrderName ||
    !phone ||
    !zip ||
    !Status ||
    !items || !Array.isArray(items) || items.length === 0
  ) {
    return res.status(400).json({ message: "All fields including items are required" });
  }


  const numericTotalPrice = parseFloat(totalPrice);
  if (isNaN(numericTotalPrice)) {
    return res.status(400).json({ message: "Invalid totalPrice" });
  }

 
  const calculatedTotal = items.reduce((sum, item) => {
    const price = parseFloat(item.price);
    const quantity = parseInt(item.quantity);
    return sum + (isNaN(price) || isNaN(quantity) ? 0 : price * quantity);
  }, 0);

  try {
    const orderItem = {
      BuyerEmail,
      name,
      address,
      OrderEmail,
      sellerEmail,
      Status,
      OrderName,
      phone,
      zip,
      totalPrice: calculatedTotal, 
      items,
      createdAt: new Date()
    };

    const result = await orderCollection.insertOne(orderItem);
    res.send(result);
  } catch (error) {
    console.error("Error saving order:", error);
    res.status(500).json({ message: "Failed to save order" });
  }
});


app.get("/api/products", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

 
    const products = await productCollection.find().skip(skip).limit(limit).toArray();
    const totalProducts = await productCollection.countDocuments(); 


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
  const email = req.query.email; 
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  try {
    const query = { BuyerEmail: email }; 
    const result = await orderCollection.find(query).toArray(); 
    res.send(result); 
  } catch (error) {
    console.error("Failed to fetch cart items:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.get("/order", async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  try {
    const query = { sellerEmail: email }; 
    const result = await orderCollection.find(query).toArray(); 
    res.send(result); 
  } catch (error) {
    console.error("Failed to fetch cart items:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/all-orders", async (req, res) => {
  try {
    const result = await orderCollection.find().toArray();
    res.send({ data: result }); 
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});



app.put("/order/:id", async (req, res) => {
  const id = req.params.id; 
  const { Status } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid order ID" });
  }


  const allowedStatuses = ["Confirmed", "Pending", "Cancelled", "Canceled"]; 
  if (!Status || !allowedStatuses.includes(Status)) {
    return res
      .status(400)
      .send({ message: "Valid status is required ('Confirmed', 'Pending', 'Cancelled', 'Canceled')" });
  }

  try {
    const filter = { _id: new ObjectId(id) };
    const updateDoc = { $set: { Status } }; 

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
        
        const { email } = req.query;
    
        if (!email) {
          return res.status(400).send({ message: "Email is required!" });
        }
    
  
        const userProducts = await productCollection.find({ userEmail: email }).toArray();
    
        if (!userProducts.length) {
          return res.status(404).send({ message: "No products found for this user" });
        }
    
      
        res.status(200).send({ message: "User products fetched successfully", products: userProducts });
      } catch (error) {
        console.error("Error fetching user products:", error);
        res.status(500).send({ message: "Failed to fetch user products", error: error.message });
      }
    });
 
    app.put("/user-products/:id", async (req, res) => {
      const id = req.params.id; 
      const { name, price, description } = req.body; 
    
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid product ID" });
      }
    
   
      if (!name || !price || !description) {
        return res.status(400).send({ message: "Name, Price, and Description are required" });
      }
    
      try {
        const filter = { _id: new ObjectId(id) }; 
        const updateDoc = {
          $set: { name, price, description },
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
      res.send(result); 
    } catch (error) {
      console.error('Error fetching featured products:', error);
      res.status(500).send({ message: 'Error fetching featured products' });
    }
  });
     // cart api 
     app.get("/carts", async (req, res) => {
      const email = req.query.email; 
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      try {
        const query = { userEmail: email }; 
        const result = await cardCollection.find(query).toArray(); 
        res.send({ products: result }); 
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
