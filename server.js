const express = require('express');
const knex = require('knex');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const Clarifai = require('clarifai');

const app = express();

const ClarifaiApp = new Clarifai.App({
    apiKey: 'df7583b5e4b548d5a42a3ceb025315d6'
});

app.use(bodyParser.json());
app.use(cors());

const port = 3000;


// Połączenie dla hosta lokalnego
// const db = knex({
//   client: 'pg',
//   connection: {
//     host : 'localhost',
//     user : 'postgres',
//     password : 'admin',
//     database : 'postgres'
//   }
// });


// Połączenie dla servera heroku
const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: true
  }
})


app.get('/', (req,res) =>  db.select('*').from('users').then(data => res.send(data)));
app.get('/profil/:id', (req, res) => {
  const { id } = req.params;
  db.select('*').from('users').where({id})
  .then(user => {
      if (user.length) {
          res.json(user)
      } else {
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
      } else {
        res.status(400).json('Błędny login/hasło')
      }
    })
    .catch(err => res.status(400).json(err))
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
  .catch(err => res.status(400).json('nie można zarejestrować'))
})
app.put('/zdjecieTwarz', (req, res) => {
  ClarifaiApp.models
  .predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
  .then(data =>res.json(data))
  .catch(err => res.status(400).json('Bład z API Clarifai'))
})
app.put('/zdjecieGeneral', (req, res) => {
  ClarifaiApp.models
  .initModel({id: Clarifai.GENERAL_MODEL, version: "aa7f35c01e0642fda5cf400f543e7c40"})
  .then(generalModel => generalModel.predict(req.body.input, {language: 'en'}))
  .then(data =>res.json(data))
  .catch(err => res.status(400).json('Bład z API Clarifai'))
})
app.put('/uzycia', (req, res) => {
  db('users').where('id', '=', req.body.id)
  .increment('uses', 1)
  .returning('uses')
  .then(data => res.json(data[0]))
  .catch(err => res.status(400).json('Nie można pobrać ilości użyć'))
})

app.listen(process.env.PORT || port, ()=> {
  console.log(`app is running on port ${process.env.PORT}`);
});

// https://protected-oasis-41147.herokuapp.com/

// heroku pg:psql - wywołanie okna edycji sql w bazie danych heroku
// \d do sprawdzenia bazy danych

// CREATE TABLE public.users (
// 	id serial NOT NULL,
// 	name varchar(100) NULL,
// 	email text NOT NULL,
// 	uses int8 NULL DEFAULT 0,
// 	joined timestamp NOT NULL,
// 	CONSTRAINT users_email_key UNIQUE (email),
// 	CONSTRAINT users_pkey PRIMARY KEY (id)
// );


// CREATE TABLE public.login (
// 	id serial NOT NULL,
// 	hash varchar(100) NOT NULL,
// 	email text NOT NULL,
// 	CONSTRAINT login_email_key UNIQUE (email),
// 	CONSTRAINT login_pkey PRIMARY KEY (id)
// );
