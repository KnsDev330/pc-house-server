require('dotenv').config();
const cors = require('cors');
const express = require('express');
const jsonwebtoken = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ExplainVerbosity, ObjectId } = require('mongodb');


// server
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 5000; // server port

// mongo URI
const MONGO_URI = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@cluster0.ijwja.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;


// connect to mongodb
const client = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(async (error) => {
    if (error) throw new Error('Cannot connect to Database'); // throw error if can't connect to database

    // collections
    const userCollection = client.db('pc-house').collection('users');
    const partCollection = client.db('pc-house').collection('parts');


    app.get('/', (req, res) => {
        res.send({ ok: true, text: '👍 Server is up and running' })
    }); // default server response

    app.get('/get-parts', async (req, res) => {
        const parts = await partCollection.find({}).toArray();
        res.send({ ok: true, text: `Success`, parts });
    }); // parts

    app.post('/get-jwt', (req, res) => {
        const uid = req.body?.uid;
        console.log(req.body)
        if (!uid) return res.status(400).send({ ok: false, text: `Invalid User ID provided` });
        jsonwebtoken.sign({ uid }, process.env.JWT_SECRET, (err, token) => {
            if (err) return res.status(500).send({ ok: false, text: `${err?.message}` });
            res.send({ ok: true, text: `Success`, token });
        });
    }); // Request for JsonWebToken


    // start the server
    app.listen(PORT, () => console.log(`Server Running on Port: ${PORT}`));

});









