const express = require('express');
const app = express()
const prot = process.env.prot || 5000;
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json())

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster1.buifi4j.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    const collectionBooks = client.db('PageFlow').collection('books');

    //* Read book
    app.get('/books', async (req,res)=>{
      const result = await collectionBooks.find().toArray()
      res.send(result)
    })

    //* Add Book
    app.post('/add-book', async (req,res)=>{
      const newBook = req.body;
      const result = await collectionBooks.insertOne(newBook);
      res.send(result);
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
  }
}
run().catch(console.dir);


app.get('/', (req, res)=>{
    res.send('server is running...')
})

app.listen(prot, ()=>{
    console.log(`server is running prot${prot}`)
})