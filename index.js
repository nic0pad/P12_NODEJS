const cool = require('cool-ascii-faces')
const express = require('express')
const path = require('path')

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

const PORT = process.env.PORT || 5001

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/login', (req, res) => res.render('pages/login'))
  .post('/login', async (req, res) => {
    try {
      var email = req.email;
      var password = req.password;
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM salesforce.contact WHERE email=$1 AND password__c=$2', [email, password]);
      if (result == null) {
        res.render('pages/login');
      } else {
        console.log(result);
        res.render('pages/contact', { 'contact': result } );
      }
      client.release();
    } catch (err) {
      console.error(err);
      res.send("Error " + err);
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
