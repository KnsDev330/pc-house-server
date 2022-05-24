require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;
const url = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@cluster0.ijwja.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

let _db;

module.exports = {

    connectToServer: function (callback) {
        MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
            _db = client.db('pc-house');
            return callback(err);
        });
    },

    getDb: function () {
        return _db;
    }
};