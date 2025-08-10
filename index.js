require("dotenv").config();
const express = require("express");
const app = express();
const prot = process.env.prot || 5000;
const cors = require("cors");
const admin = require("firebase-admin");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

//* middleware
app.use(cors());
app.use(express.json());

//* Firebase initialize
const firebaseKey = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')
const serviceAccount = JSON.parse(firebaseKey)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//* Firebase token verify
const VerifyFirebaseToken = async (req, res, next) =>{
  const authHeder = req.headers?.authorization;

  if (!authHeder || !authHeder.startsWith("Bearer")) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  const token = authHeder.split(' ')[1]

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.decodedEmail = decoded.email;
    next()
  } 
  catch (error) {
    return res.status(401).send('Unauthorized access')
  }
}

//* email verify
const emailVerify = (req,res,next)=>{
  if(req.headers.email !== req.decodedEmail){
    return res.status(403).send({ message: "forbidden access" });
  }
  next()
}


const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster1.buifi4j.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    const collectionBooks = client.db("PageFlow").collection("books");
    const collectionBorrow = client.db("PageFlow").collection("borrow");

    //* Read book
    app.get("/books", async (req, res) => {
      let query = {} 
      const value = req.query.filter;
      if(value == 1 || value == -1 ){
        query.rating = value
      }
      const result = await collectionBooks.find().sort(query).toArray();
      res.send(result);
    });

    // single book
    app.get("/books/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await collectionBooks.findOne(query);
      res.send(result);
    });

    // category
    app.get("/categories/:id", async (req, res) => {
      const categoryName = req.params.id;
      const query = { category: categoryName };
      const result = await collectionBooks.find(query).toArray();
      res.send(result);
    });

    // my borrow books
    app.get("/borrow/:email", VerifyFirebaseToken, emailVerify, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await collectionBorrow.find(query).toArray();
      res.send(result);
    });

    //* Add Book
    app.post("/add-book", VerifyFirebaseToken, emailVerify, async (req, res) => {
      const newBook = req.body;
      const result = await collectionBooks.insertOne(newBook);
      res.send(result);
    });

    //* Add Borrow Data
    app.post("/add-borrow/:id", VerifyFirebaseToken, emailVerify, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const { email } = req.body;

      const Book = await collectionBooks.findOne(query);
      const alreadyBorrow = Book.borrowList.includes(email);

      if (!alreadyBorrow) {
        const updateDoc = {
          $addToSet: {
            // (push email in borrow array)
            borrowList: email,
          },
        };
        const r = await collectionBooks.updateOne(query, updateDoc);
        const updateQuantity = await collectionBooks.updateOne(query, {
          $inc: { quantity: -1 },
        });
        const borrowData = req.body;
        const result = await collectionBorrow.insertOne(borrowData);
        res.send(result);
      } else {
        res.status(304).send({ mess: "alraday add it" });
      }
    });

    //* Update
    app.put("/book-update/:id", VerifyFirebaseToken, emailVerify, async (req, res) => {
      const filter = { _id: new ObjectId(req.params.id) };
      const updateBook = req.body;
      const updateDoc = {
        $set: updateBook,
      };
      const result = await collectionBooks.updateOne(filter, updateDoc, {
        upsert: true,
      });
      res.send(result);
    });

    //* Delete
    app.delete("/borrow/:id", VerifyFirebaseToken, emailVerify, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await collectionBorrow.deleteOne(query);
      res.send(result);
    });

    // patch 
    app.patch("/borrow/:id", VerifyFirebaseToken, emailVerify, async (req, res) => {
      const id = req.params.id;
      const {email} = req.body;
      const query = { _id: new ObjectId(id) };

      const updateQuantity = await collectionBooks.updateOne(query, {
        $inc: { quantity: +1 },
      });

      const Book = await collectionBooks.findOne(query);
      const alreadyBorrow = Book.borrowList.includes(email);

      if (alreadyBorrow) {
        const updateDoc = {
          $pull: {
            borrowList: email,
          },
        };
        const result = await collectionBooks.updateOne(query, updateDoc, {upsert: true});
        res.send(result);
      } else {
        res.status(304).send({ mess: "alraday add it" });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running...");
});

app.listen(prot, () => {
  console.log(`server is running prot${prot}`);
});
