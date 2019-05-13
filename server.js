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

app.get('/', (req,res) =>  db.select('*').from('users').then(data => res.send(data)));
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json('Brak emaila/hasła');
  }
  db.select('email', 'hash').from('login')
    .where('email', '=', email)
    .then(data => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db.select('*').from('users')
          .where('email', '=', email)
          .then(user => {
            res.json(user[0])
          })
          .catch(err => res.status(400).json('błąd podczas pobierania informacji z bazy danych'))
      } else {
        res.status(400).json('Błędny login/hasło')
      }
    })
    .catch(err => res.status(400).json('Błędny login/hasło'))
  })
  app.post('/rejestracja', (req, res) => {
    const { email, name, password } = req.body;
  })

app.listen(port, ()=> {
  console.log(`app is running on port ${port}`);
});