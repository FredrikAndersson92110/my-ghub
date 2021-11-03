const express = require("express"); 
const mysql = require("mysql"); 
const cors = require("cors"); 
const path = require("path");

// User 
const Users = require("./routes/Users");

const app = express(); 

app.use(cors({origin: "*"})); 

app.use(express.json()); 
app.use(express.urlencoded({extended: true})); 

// config data 
const DB_NAME = require("./config/data").DB_NAME; 
const HOST = require("./config/data").HOST;
const DB_SECRET = require("./config/data").DB_SECRET;
const USER_NAME = require("./config/data").USER_NAME;

// Connect to DB 
const db = mysql.createConnection({
    host: HOST,
    user: USER_NAME,
    password: DB_SECRET,
    database: DB_NAME,
    connectionLimit: 50,
    queueLimit: 50,
    waitForConnection: true
});

db.connect((err) => {
    if (err) throw err; 
    console.log("Connected!");
});

db.on("error", () => {
    console.log("error");
});

// prevent server from crashing
let del = db._protocol._delegateError; 
db._protocol._delegateError = (err, sequence) => {
    if (err.fatal) {
        console.trace("fatal error: " + err.message);
    }
    return del.call(this, err, sequence); 
}


// Allow user to visit these paths 
app.use("/images", express.static(path.join(__dirname, "images"))); 
app.use(express.static(path.join(__dirname, "react"))); 

app.get("/*", (req, res) => {
    res.sendFile(path.join(__dirname, "react", "index.html"));
});

// API 
app.use("/api/users", Users); 



// PORT 
const port = process.env.PORT || 4000;
// run the serfver 
app.listen(port, () => {
    console.log(`App is running on port ${port}`);
});


