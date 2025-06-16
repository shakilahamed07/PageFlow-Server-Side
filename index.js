const express = require('express');
const app = express()
const prot = process.env.prot || 5000;
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json())

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster1.buifi4j.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

// const uri = "mongodb://127.0.0.1:27017"; //* Local DataBase

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
    const collectionBorrow = client.db('PageFlow').collection('borrow');

    //* Read book
    app.get('/books', async (req,res)=>{
      const result = await collectionBooks.find().toArray()
      res.send(result)
    })
    
    // single book
    app.get('/books/:id', async (req,res)=>{
      const query = {_id: new ObjectId(req.params.id)}
      const result = await collectionBooks.findOne(query)
      res.send(result)
    })

    // category
    app.get('/categories/:id', async(req,res)=>{
      const categoryName = req.params.id;
      const query = {category: categoryName}
      const result = await collectionBooks.find(query).toArray();
      res.send(result)
    })

    // my borrow books
    app.get('/borrow/:email', async (req,res)=>{
      const email = req.params.email;
      const query = {email: email}
      const result = await collectionBorrow.find(query).toArray()
      res.send(result)
    })

    //* Add Book
    app.post('/add-book', async (req,res)=>{
      const newBook = req.body;
      const result = await collectionBooks.insertOne(newBook);
      res.send(result);
    })

    //* Add Borrow Data
    app.post('/add-borrow/:id', async (req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const updateQuantity = await collectionBooks.updateOne(query, {$inc:{quantity: -1}})

      const borrowData = req.body;
      const result = await collectionBorrow.insertOne(borrowData);
      res.send(result);
    })

    //* Update
    app.put('/book-update/:id', async (req,res)=>{
      const filter = {_id: new ObjectId(req.params.id)}
      const updateBook = req.body;
      const updateDoc ={
        $set: updateBook
      }
      const result = await collectionBooks.updateOne(filter, updateDoc, {upsert: true})
      res.send(result)
    })

    //* Delete 
    app.delete('/borrow/:id', async (req, res)=>{
      const id = req.params.id;
      const query1 = {id};
      const query2 = {_id: new ObjectId(id)};
      console.log(query1, query2)
      const updateQuantity = await collectionBooks.updateOne(query2, {$inc:{quantity: +1}})

      const result = await collectionBorrow.deleteOne(query1);
      res.send(result)
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