const cool = require('cool-ascii-faces')
const express = require('express')
const session = require('express-session')
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
  .use(session({
    secret: 'secretsession',
    resave: true,
    saveUninitialized: true
  }))
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
          req.session.loggedIn = true;
				  req.session.username = email;
          req.session.email = email;
          res.render('pages/profile', { 'contact': result.rows[0], 'connected': req.session.loggedIn } );
        } else {
          res.render('pages/login', { 'error' : 'Wrong Email or Password !' });
        }
      });
    } catch (err) {
      console.error(err);
      res.render('pages/login', { 'error' : 'Error, contact admin !' });
    }
  })
  .get('/profile', async (req, res) => {
    if(req.session.loggedIn) {
      try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM salesforce.contact WHERE email=$1', [req.session.email]);
        if (result.rowCount == 1) {
          res.render('pages/profile', { 'contact': result.rows[0], 'connected': req.session.loggedIn } );
        } else {
          res.render('pages/profile', { 'contact': null } );
        }
        client.release();
      } catch (err) {
        console.error(err);
        res.send("Error " + err);
      }
    } else {
      res.redirect('/login');
    }
  })
  .get('/profile/edit', async (req, res) => {
    if(req.session.loggedIn) {
      try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM salesforce.contact WHERE email=$1', [req.session.email]);
        if (result.rowCount == 1) {
          res.render('pages/profile-edit', { 'contact': result.rows[0], 'connected': req.session.loggedIn } );
        } else {
          res.render('pages/profile-edit', { 'contact': null } );
        }
        client.release();
      } catch (err) {
        console.error(err);
        res.send("Error " + err);
      }
    } else {
      res.redirect('/login');
    }
  })
  .post('/profile/edit', async (req, res) => {
    if(req.session.loggedIn) {
      try {
        const client = await pool.connect();
        await client.query(
          'UPDATE salesforce.contact SET lastname=$1, firstname=$2, phone=$3  WHERE email=$4',
          [req.body.lastname, req.body.firstname, req.body.phone, req.session.email]
        );
        client.release();
        res.redirect('/profile');
      } catch (err) {
        console.error(err);
        res.send("Error " + err);
      }
    } else {
      res.redirect('/login');
    }
  })
  .get('/products', async (req, res) => {
    if(req.session.loggedIn) {
      try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM salesforce.product2');
        const results = { 'results': (result) ? result.rows : null, 'connected': req.session.loggedIn};
        res.render('pages/products', results );
        client.release();
      } catch (err) {
        console.error(err);
        res.send("Error " + err);
      }
    } else {
      res.redirect('/login');
    }
  })
  .get('/contracts', async (req, res) => {
    if(req.session.loggedIn) {
      try {
        const client = await pool.connect();
        const resultContact = await client.query('SELECT * FROM salesforce.contact WHERE email=$1', [req.session.email]);
        if (resultContact.rowCount == 1) {
          const result = await client.query('SELECT * FROM salesforce.contract WHERE accountid=$1', [resultContact.rows[0].accountid]);
          const results = { 'results': (result) ? result.rows : null, 'connected': req.session.loggedIn};
          res.render('pages/contracts', results );
        } else {
          res.render('pages/contracts', { 'results': null, 'connected': req.session.loggedIn});
        }
        client.release();
      } catch (err) {
        console.error(err);
        res.send("Error " + err);
      }
    } else {
      res.redirect('/login');
    }
  })
  .get('/logout',(req,res)=>
  {
    req.session.destroy((err)=>{})
    res.redirect('/');
  })
  .get('/cool', (req, res) => res.send(cool()))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
