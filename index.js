const cool = require('cool-ascii-faces')
const express = require('express')
const path = require('path')

const { Pool, Client } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
client.connect();

const PORT = process.env.PORT || 5001

express()
  .use(express.static(path.join(__dirname, 'public')))
  .use(express.urlencoded())
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/login', (req, res) => res.render('pages/login', { 'error' : ''}))
  .post('/login', (req, res) => {
    try {
      var email = req.body.email;
      var password = req.body.password;
      console.log(email);
      console.log(password);
      client.query('SELECT * FROM salesforce.contact WHERE email=$1 AND password__c=$2', [email, password], (error, result) => {
        if (error) throw error;

        console.log(result.rowCount);
        console.log(result);
        if (result.rowCount == 1) {
          res.render('pages/contact', { 'contact': result.rows[0] } );
        } else {
          res.render('pages/login', { 'error' : 'Wrong Email or Password !' });
        }
      });
    } catch (err) {
      console.error(err);
      res.render('pages/login', { 'error' : 'Error, contact admin !' });
    }
  })
  .get('/db', async (req, res) => {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM salesforce.contact');
      const results = { 'results': (result) ? result.rows : null};
      res.render('pages/db', results );
      client.release();
    } catch (err) {
      console.error(err);
      res.send("Error " + err);
    }
  })
  .get('/cool', (req, res) => res.send(cool()))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
