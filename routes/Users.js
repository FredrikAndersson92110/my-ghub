const express = require("express"); 
const mysql = require("mysql"); 
const jwt = require("jsonwebtoken"); 
const multer = require("multer"); // importing and upload files 


const router = express.Router(); 

// config data 
const DB_NAME = require("../config/data").DB_NAME; 
const HOST = require("../config/data").HOST;
const DB_SECRET = require("../config/data").DB_SECRET;
const USER_NAME = require("../config/data").USER_NAME;

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
    console.log("Connected to database");
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

// --- IMAGE UPLOAD AND SETTINGS ---
const MIME_TYPE_MAP = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg"
};

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        const isValid = MIME_TYPE_MAP[file.mimetype]; 
        let error = new Error("Invalid mime type"); 
        if (isValid) { error = null; }
        callback( error, "images");
    },
    filename: (req, file, callback) => {
        const name = file.originalname
            .toLowerCase()
            .split(" ")
            .join("-");
        const ext = MIME_TYPE_MAP[file.mimetype]; 
        callback( null, name + "-" + Date.now() + "." + ext );
    }
});
// end 



// --- Select or Create the Users table ---
function selectOrCreateTable() {
    db.query("SELECT * FROM users", (err, result, fields) => {
        if (err) {
            const sql = "CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), password VARCHAR(255), email VARCHAR(255) NOT NULL UNIQUE, picture VARCHAR(255), adress VARCHAR(255))";
            db.query(sql, (err, result) => {
                if (err) throw err;
            });
        }

    });
}
selectOrCreateTable();
//end

// jsonwebtoken 
const jwtPrivateSecret = "FredrikReactNodeCourse"; 

// ---- Login User ---- 
router.post("/login", async (req, res) => {
    const { email, password } = req.body.data; 
    // const { email, password} = req.body;


    db.query(`SELECT * FROM users WHERE email = "${email}" AND password = "${password}"`, 
    async (err, result) => {
        if (result.length !== 0) {
            jwt.sign({ UserEmail: email }, jwtPrivateSecret, 
                (err, token) => {
                    res.status(200).send({ token: token });
            });
        }
        if (result.length === 0) {
            res.status(400).send({ message: "Error, User not found"});
        }
    });
});
//end 

// --- Create new User ---
router.post("/register", async (req, res) => {
    const {name, email, password} = req.body.data;
    // const {name, email, password} = req.body;

    // const email = req.body.email; 
    // const password = req.body.pasword;
    // const name = req.body.name;

    db.query(`SELECT * FROM users WHERE email = "${email}"`, (err, result) => {
        if (err) {
            res.send({ err: "err" }); 
        }
        if (result.length === 0) {
            let sql = `INSERT INTO users (name, email, password) VALUES ("${name}", "${email}", "${password}")`;
            db.query(sql, (err, result) => {
                if (err) throw err; 
                res.status(200).send({ result });
                console.log(result);
            });
        } else {
            return res.status(201).send({ message: "This email has allredy been used. "}); 
        }
    });
});
//end

// ---- GET USER DATA ----
router.get("/getUserData", async (req, res) => {
    const token = req.headers["authorization"]; 
    let decoded = jwt.decode(token, { complete: true }); 
    const UserEmail = decoded.payload.UserEmail; 

    const sql = `SELECT * FROM users WHERE email = "${UserEmail}"`;
    db.query(sql, (err, result) => {
        if (err) throw err; 
        res.status(200).send({ result }); 
    }); 
}); 
//end 

//Update User Data Name Pic Adress 
const upload = multer({
    storage: storage,
    limits:  { fieldSize: 12*1024*1024 }
}).single("image"); 

router.put("/edit/:id", upload, (req, res, next) => {
    if (req.file && req.file !== "") {
        const id = req.params.id; 
        const URL = req.protocol + "://" + req.get("host"); 
        const picture = URL + "/images/" + req.file.filename; 

        const name = req.body.name;
        const adress = req.body.adress; 
        // update with mysql 
        const sql = `UPDATE users SET name = "${name}", adress = "${adress}", picture = "${picture}" WHERE id = "${id}"`;
        db.query(sql, (err, result) => {
            if (err) throw err; 
            res.status(200).send({ message: "File updated succesfully", result });
        }); 
    } else {
        const id = req.params.id; 
        const name = req.body.name;
        const adress = req.body.adress; 
        console.log(id, name, adress);
        // update with mysql
        const sql = `UPDATE users SET name = "${name}", adress = "${adress}" WHERE id = "${id}"`;
        db.query(sql, (err, result) => {
            if (err) throw err; 
            res.status(200).send({ message: "Udated succesfully", result }); 
        });
    }
});

// --- Delete One User ----
router.delete("/delete/:id/:password", (req, res, next) => {
    const id = req.params.id; 
    const password = req.params.password;

    const sql = `SELECT * FROM users WHERE id = "${id}" AND password = "${password}"`; 
    db.query(sql, async (err, result) => {
        if (result.length !== 0) {
            //correct password
            db.query(`DELETE FROM users WHERE id = "${id}"`, async (err, result) => {
                if (err) throw err; 
                res.status(200).send({ message: result }); 
            });
        } 
        if (result.length === 0) {
            res.status(400).send({ message: "The password is not correct" });
            console.log(err);
        }
    });
});


module.exports = router; 
