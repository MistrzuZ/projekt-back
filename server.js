const express = require('express');
const knex = require('knex');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');

const app = express();

const Clarifai = require('clarifai');

const ClarifaiApp = new Clarifai.App({
    apiKey: 'df7583b5e4b548d5a42a3ceb025315d6'
});

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
app.get('/profil/:id', (req, res) => {
  const { id } = req.params;
  db.select('*').from('users').where({id})
  .then(user => {
      if(user.length) {
          res.json(user)
      }else{
          res.status(400).json('Nie znaleziono')
      }
  })
})
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
          .catch(res.status(400).json('błąd podczas pobierania informacji z bazy danych'))
      } else {
        res.status(400).json('Błędny login/hasło')
      }
    })
    .catch(res.status(400).json('Błędny login/hasło'))
})
app.post('/rejestracja', (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
      return res.status(400).json('Brak emaila/nazwy/hasła')
  }
  const hash = bcrypt.hashSync(password);
  db.transaction(trx => {
      trx.insert({ hash, email })
      .into('login')
      .returning('email')
      .then(returnedEmail => {
          return trx('users')
              .returning('*')
              .insert({
                  email: returnedEmail[0],
                  name: name,
                  joined: new Date()
              })
              .then(user => {
                  res.json(user[0]);
                })
          })
      .then(trx.commit)
      .catch(trx.rollback)
  })
  .catch(err => {
      res.status(400).json(`${err} nie można zarejestrować`);
  })
})
app.post('/zdjecie', (req, res) => {
  ClarifaiApp.models
  .predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
  .then(data => {
    res.json(data);
    const { id } = req.body;
    db('users').where('id', '=', id)
    .increment('uses', 1)
    .returning('uses')
    .then(entries => {
      res.json(entries[0]);
    })
    .catch(res.status(400).json(`Błąd w doliczaniu użyć`))
  })
  .catch(res.status(400).json('Błąd z API Clarifai'))
})

app.listen(port, ()=> {
  console.log(`app is running on port ${port}`);
});