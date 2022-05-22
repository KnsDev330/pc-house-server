require('dotenv').config();
const cors = require('cors');
const express = require('express');
const JsonWebToken = require('jsonwebtoken');
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


    // default server response
    app.get('/', (req, res) => {
        res.send({ ok: true, text: '👍 Server is up and running' })
    });



    // start the server
    app.listen(PORT, () => console.log(`Server Running on Port: ${PORT}`));

});









