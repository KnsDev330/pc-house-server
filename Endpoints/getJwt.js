const jsonwebtoken = require('jsonwebtoken');
const getJwt = (req, res) => {
    const uid = req.body?.uid;
    console.log(req.body)
    if (!uid) return res.status(400).send({ ok: false, text: `Invalid User ID provided` });
    jsonwebtoken.sign({ uid }, process.env.JWT_SECRET, (err, token) => {
        if (err) return res.status(500).send({ ok: false, text: `${err?.message}` });
        res.send({ ok: true, text: `Success`, token });
    });
}

module.exports = { getJwt };