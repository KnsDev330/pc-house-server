require('dotenv').config();
const cors = require('cors');
const express = require('express');
const jsonwebtoken = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET);


// server
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 5000; // server port

// mongo URI
const MONGO_URI = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@cluster0.ijwja.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
// const MONGO_URI = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@cluster0.y0t34wl.mongodb.net/?retryWrites=true&w=majority`;


const verifyJwt = (req, res, next) => {
    const { authorization } = req.headers;
    if (!authorization) return res.status(400).send({ ok: false, text: `No JWT was found` });
    const jwt = authorization.split(' ')[1];
    try {
        jsonwebtoken.verify(jwt, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) return res.status(403).send({ ok: false, text: `Forbidden` });
            req.decoded = decoded;
            next();
        });
    } catch (error) {
        return res.status(500).send({ ok: false, text: `${error.message}` });
    }
}



// connect to mongodb
const client = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(async (error) => {
    if (error) throw new Error('Cannot connect to Database ' + error); // throw error if can't connect to database

    // collections
    const userCollection = client.db('pc-house').collection('users');
    const partCollection = client.db('pc-house').collection('parts');
    const orderCollection = client.db('pc-house').collection('orders');
    const paymentCollection = client.db('pc-house').collection('payments');
    const reviewCollection = client.db('pc-house').collection('reviews');



    // verify if admin
    const verifyAdmin = (req, res, next) => {
        const { authorization } = req.headers;
        if (!authorization) return res.status(401).send({ ok: false, text: `Unauthorized access` });
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
    /* FOR GETTING A DEMO PRODUCT DETAILS */
    app.get('/demo', verifyAdmin, async (req, res) => {
        const part = await partCollection.aggregate([{ $sample: { size: 1 } }]).toArray();
        res.send({ ok: true, text: `Success`, demo: part[0] });
    });
    /* FOR GETTING A DEMO PRODUCT DETAILS */


    app.get('/get-users', verifyAdmin, async (req, res) => {
        const users = await userCollection.find({}).toArray();
        res.send({ ok: true, text: `Success`, users });
    }); // get users


    app.get('/get-parts', async (req, res) => {
        const parts = (await partCollection.find({}).toArray()).reverse();
        res.send({ ok: true, text: `Success`, parts });
    }); // get parts


    app.get('/get-my-orders', verifyJwt, async (req, res) => {
        const { uid } = req.decoded;
        console.log(req.decoded);
        const orders = (await orderCollection.find({ uid }).toArray()).reverse();
        res.send({ ok: true, text: `Success`, orders });
    }); // get my orders


    app.get('/get-all-orders', verifyAdmin, async (req, res) => {
        const orders = (await orderCollection.find({}).toArray()).reverse();
        res.send({ ok: true, text: `Success`, orders });
    }); // get my orders


    app.get('/get-reviews/:uid', async (req, res) => {
        const { uid } = req.params;
        if (!uid) return res.status(400).send({ ok: false, text: `Invalid User ID provided` });
        let query = { uid };
        if (uid === 'all') query = {};
        const reviews = await reviewCollection.find(query).sort({ time: -1 }).toArray();
        res.send({ ok: true, text: `Success`, reviews });
    }); // get reviews


    app.get('/get-part/:id', async (req, res) => {
        const part = await partCollection.findOne({ id: req.params.id });
        res.send({ ok: true, text: `Success`, part });
    }); // get part details


    app.get('/get-order/:orderid', verifyJwt, async (req, res) => {
        const order = await orderCollection.findOne({ _id: ObjectId(req.params.orderid) });
        // console.log(order);
        res.send({ ok: !!order, text: !!order ? `Success` : `Order not found`, order });
    }); // get part details


    app.get('/is-admin/:uid', async (req, res) => {
        const result = await userCollection.findOne({ uid: req.params.uid });
        res.send({ ok: true, text: `Success`, isadmin: result?.role === 'admin' });
    }); // check if user is admin

    app.get('/profile', verifyJwt, async (req, res) => {
        const profile = await userCollection.findOne({ uid: req.decoded.uid });
        res.send({ ok: true, text: `Success`, profile });
    }); // get profile

    app.patch('/profile', verifyJwt, async (req, res) => {
        const { uid } = req.body?.data;
        if (!uid || req.decoded.uid !== uid) return res.status(401).send({ ok: false, text: `Unauthorized access` });
        const update = await userCollection.updateOne({ uid: uid }, { $set: req.body.data });
        res.send({ ok: true, text: `Success`, update });
    }); // update profile


    app.put('/make-admin/:uid', verifyAdmin, async (req, res) => {
        const result = await userCollection.updateOne({ uid: req.params.uid }, { $set: { role: `admin` } });
        res.send({ ok: true, text: `Updated successfully`, result });
    }); // make admin


    app.delete('/cancel-order/:orderid', verifyJwt, async (req, res) => {
        const result = await orderCollection.deleteOne({ _id: ObjectId(req.params.orderid) });
        res.send({ ok: true, text: `Deleted successfully`, result });
    }); // delete order
    app.delete('/delete-order/:orderid', verifyAdmin, async (req, res) => {
        const result = await orderCollection.deleteOne({ _id: ObjectId(req.params.orderid) });
        res.send({ ok: true, text: `Deleted successfully`, result });
    }); // delete order by admin


    app.post('/get-jwt', (req, res) => {
        const uid = req.body?.uid;
        const email = req.body?.email;
        const name = req.body?.name;
        console.log('jwt', req.body);
        if (!uid) return res.status(400).send({ ok: false, text: `Invalid User ID provided` });
        jsonwebtoken.sign({ uid }, process.env.JWT_SECRET, async (err, token) => {
            if (err) return res.status(500).send({ ok: false, text: `${err?.message}` });
            const user = await userCollection.updateOne({ uid }, { $set: { name, email, uid } }, { upsert: true });
            res.send({ ok: true, text: `Success`, token, user });
        });
    }); // Request for JsonWebToken

    app.post('/create-payment-intent', verifyJwt, async (req, res) => {
        // console.log(req.body)
        const { orderId } = req.body;
        const orderDetails = await orderCollection.findOne({ _id: ObjectId(orderId) });
        console.log(orderDetails);
        const amount = Number((orderDetails.unitPrice * orderDetails.quantity * 100).toFixed(0));
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'usd',
            payment_method_types: ['card']
        });
        res.send({ ok: true, text: `Success`, intent: paymentIntent.client_secret });
    }); // Create Payment Intent


    app.post('/place-order', verifyJwt, async (req, res) => {
        const { partId, address, email, name, partName, phone, quantity } = req.body?.data;
        if (!partId || !address || !email || !name || !partName || !phone || !quantity) return res.status(400).send({ ok: false, text: `Bad Request` });
        const order = req.body.data;
        const dbPart = await partCollection.findOne({ id: partId });
        console.log(dbPart);
        if (!dbPart?.price) return res.status(400).send({ ok: false, text: `Bad Request` }); // check if product is on db
        order.unitPrice = dbPart.price;
        order.paid = false;
        order.status = 'unpaid';
        order.uid = req.decoded.uid;
        const result = await orderCollection.insertOne(order); // insert order in db
        await partCollection.updateOne({ id: partId }, { $inc: { available: -quantity } }); // update quantity on order placing
        res.send({ ok: true, text: `Order placed successfully`, result });
    }); // Place order request


    app.post('/add-product', verifyAdmin, async (req, res) => {
        const { id, name, img, price, minimum, available, desc } = req.body?.data;
        if (!id || !name || !img || !price || !minimum || !available || !desc) return res.status(400).send({ ok: false, text: `Badly formatted data` });
        if (minimum > available) return res.status(400).send({ ok: false, text: `Minimum cannot be greater than available` }); // check if product id is available on db
        const dbProduct = await partCollection.findOne({ id });
        if (dbProduct?.id) return res.status(507).send({ ok: false, text: `ID already in use, please make some change` }); // check if product id is available on db
        const product = req.body.data;
        product.admin = req.decoded.uid;
        const result = await partCollection.insertOne(product); // insert order in db
        res.send({ ok: true, text: `Product added successfully`, result });
    }); // Add a new product


    app.post('/add-review', verifyJwt, async (req, res) => {
        const { rating, text, img } = req.body?.data;
        if (!rating || !text || !img || Number(rating) < 1 || Number(rating) > 5) return res.status(400).send({ ok: false, text: `Bad Request` });
        const dbUser = await userCollection.findOne({ uid: req.decoded.uid });
        const review = req.body.data;
        review.uid = req.decoded.uid;
        review.name = dbUser?.name || `Anonymouse`;
        review.time = Number((new Date().getTime() / 1000).toFixed(0));
        const result = await reviewCollection.insertOne(review);
        res.send({ ok: true, text: `Review added successfully`, result });
    }); // Add areview


    app.patch('/order-shipped', verifyAdmin, async (req, res) => {
        const { orderId } = req.body;
        if (!orderId) return res.status(400).send({ ok: false, text: `Bad Request` });
        const update = await orderCollection.updateOne({ _id: ObjectId(orderId) }, { $set: { status: 'shipped' } });
        res.send({ ok: true, text: `Order shipped successfully`, update });
    }); // Place order request


    app.patch('/store-payment', verifyJwt, async (req, res) => {
        const { payment } = req.body;
        if (!payment) return res.status(400).send({ ok: false, text: `Bad Request` });
        const { orderId, txid } = payment;
        if (!orderId || !txid) return res.status(400).send({ ok: false, text: `Bad Request` });
        const update = await orderCollection.updateOne({ _id: ObjectId(orderId) }, { $set: { paid: true, txid } });
        payment.uid = req.decoded?.uid;
        const insert = await paymentCollection.insertOne(payment);
        res.send({ ok: true, text: `Order paid & stored successfully`, update, insert });
    }); // Place order request


    // start the server
    app.listen(PORT, () => console.log(`Server Running on Port: ${PORT}`));

});









