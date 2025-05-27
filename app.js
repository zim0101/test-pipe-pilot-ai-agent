const path = require('path');
const fs = require('fs');
const express = require('express');
const OS = require('os');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const app = express();
const cors = require('cors');
const serverless = require('serverless-http');

// Load environment variables from .env file
require('dotenv').config();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));
app.use(cors());

const mongoUri = process.env.MONGO_URI;
const mongoUsername = process.env.MONGO_USERNAME;
const mongoPassword = process.env.MONGO_PASSWORD;
const nodeEnv = process.env.NODE_ENV;
const appPort = process.env.APP_PORT || 3000;

console.log(`Connecting to MongoDB at: ${mongoUri}`);

mongoose.connect(mongoUri, {
    user: mongoUsername,
    pass: mongoPassword,
    useNewUrlParser: true,
    useUnifiedTopology: true
}, function(err) {
    if (err) {
        console.log("MongoDB connection error: " + err);
    } else {
        console.log("MongoDB Connection Successful");
    }
});

var Schema = mongoose.Schema;

var dataSchema = new Schema({
    name: String,
    id: Number,
    description: String,
    image: String,
    velocity: String,
    distance: String
});
var planetModel = mongoose.model('planets', dataSchema);

app.post('/planet', function(req, res) {
    console.log("Received Planet ID " + req.body.id);
    planetModel.findOne({
        id: req.body.id
    }, function(err, planetData) {
        if (err) {
            console.error("Error retrieving planet data:", err);
            res.status(500).send("Error in Planet Data");
        } else {
            res.send(planetData);
        }
    });
});

app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, '/', 'index.html'));
});

app.get('/api-docs', (req, res) => {
    fs.readFile('oas.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            res.status(500).send('Error reading file');
        } else {
            res.json(JSON.parse(data));
        }
    });
});

app.get('/os', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send({
        "os": OS.hostname(),
        "env": nodeEnv
    });
});

app.get('/live', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send({
        "status": "live"
    });
});

app.get('/ready', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send({
        "status": "ready"
    });
});

app.listen(appPort, () => {
    console.log("Server successfully running on port - " + appPort);
});

module.exports = app;

//module.exports.handler = serverless(app);