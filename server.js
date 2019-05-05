const express = require('express');
const knex = require('knex');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');

const app = express();

app.use(bodyParser.json());
app.use(cors());

const port = 3000;

const db = knex({
  client: 'pg',
  connection: {
    host : 'localhost',
    user : 'postgres',
    password : 'admin',
    database : 'postgres'
  }
});

app.get('/', (req,res) => res.send(db.users));

app.listen(port, ()=> {
  console.log(`app is running on port ${port}`);
});