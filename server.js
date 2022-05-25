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



const verifyUid = (req, res, next) => {
    const { authorization } = req.headers;
    const { uid } = req.body?.data;
    // console.log(req.headers.authorization, req.body)
    if (!authorization) return res.status(400).send({ ok: false, text: `No JWT was found` });
    const jwt = authorization.split(' ')[1];
    try {
        jsonwebtoken.verify(jwt, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) return res.status(403).send({ ok: false, text: `Forbidden` });
            if (decoded.uid !== uid) return res.status(403).send({ ok: false, text: `Forbidden` });
            next();
        });
    } catch (error) {
        return res.status(500).send({ ok: false, text: `${error.message}` });
    }
}



// connect to mongodb
const client = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(async (error) => {
    if (error) throw new Error('Cannot connect to Database'); // throw error if can't connect to database

    // collections
    const userCollection = client.db('pc-house').collection('users');
    const partCollection = client.db('pc-house').collection('parts');
    const orderCollection = client.db('pc-house').collection('orders');



    // verify if admin
    const verifyAdmin = (req, res, next) => {
        const { authorization } = req.headers;
        if (!authorization) return res.status(400).send({ ok: false, text: `No JWT was found` });
        const jwt = authorization.split(' ')[1];
        try {
            jsonwebtoken.verify(jwt, process.env.JWT_SECRET, async (err, decoded) => {
                if (err) return res.status(403).send({ ok: false, text: `Forbidden` });
                const userDetails = await userCollection.findOne({ uid: decoded.uid });
                if (userDetails?.role !== 'admin') return res.status(403).send({ ok: false, text: `Forbidden` });
                req.decoded = decoded;
                next();
            });
        } catch (error) {
            return res.status(403).send({ ok: false, text: `${error.message}` });
        }
    }


    app.get('/', (req, res) => {
        res.send({ ok: true, text: '👍 Server is up and running' })
    }); // default server response


    app.get('/get-users', verifyAdmin, async (req, res) => {
        const users = await userCollection.find({}).toArray();
        res.send({ ok: true, text: `Success`, users });
    }); // get users


    app.get('/get-parts', async (req, res) => {
        const parts = await partCollection.find({}).toArray();
        res.send({ ok: true, text: `Success`, parts });
    }); // get parts


    app.get('/get-part/:id', async (req, res) => {
        const part = await partCollection.findOne({ id: req.params.id });
        res.send({ ok: true, text: `Success`, part });
    }); // get part details


    app.get('/is-admin/:uid', async (req, res) => {
        const result = await userCollection.findOne({ uid: req.params.uid });
        res.send({ ok: true, text: `Success`, isadmin: result.role === 'admin' });
    }); // check if user is admin


    app.put('/make-admin/:uid', verifyAdmin, async (req, res) => {
        const result = await userCollection.updateOne({ uid: req.params.uid }, { $set: { role: `admin` } });
        res.send({ ok: true, text: `Success`, result });
    }); // make admin


    app.post('/get-jwt', (req, res) => {
        const uid = req.body?.uid;
        const email = req.body?.email;
        const name = req.body?.name;
        if (!uid) return res.status(400).send({ ok: false, text: `Invalid User ID provided` });
        jsonwebtoken.sign({ uid }, process.env.JWT_SECRET, async (err, token) => {
            if (err) return res.status(500).send({ ok: false, text: `${err?.message}` });
            const user = await userCollection.updateOne({ uid }, { $set: { name, email, uid } }, { upsert: true });
            res.send({ ok: true, text: `Success`, token, user });
        });
    }); // Request for JsonWebToken


    app.post('/place-order', verifyUid, async (req, res) => {
        const { uid, partId, address, email, name, partName, phone, quantity } = req.body?.data;
        if (!uid || !partId || !address || !email || !name || !partName || !phone || !quantity) return res.status(400).send({ ok: false, text: `Bad Request` });
        const { price } = await partCollection.findOne({ id: partId });
        if (price <= 0) return res.status(400).send({ ok: false, text: `Bad Request` });
        req.body.data.unitPrice = price;
        const result = await orderCollection.insertOne(req.body.data);
        res.send({ ok: true, text: `Order placed successfully`, result });
    }); // Place order request


    // start the server
    app.listen(PORT, () => console.log(`Server Running on Port: ${PORT}`));

});









