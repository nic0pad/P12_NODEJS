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
  .get('/', (req, res) => res.render('pages/index', {'connected': req.session.loggedIn}))
  .get('/login', (req, res) => res.render('pages/login', { 'error' : '', 'connected': req.session.loggedIn}))
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
          res.render('pages/login', { 'error' : 'Wrong Email or Password !', 'connected': req.session.loggedIn });
        }
      });
    } catch (err) {
      console.error(err);
      res.render('pages/login', { 'error' : 'Error, contact admin !', 'connected': req.session.loggedIn });
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
          res.render('pages/profile-edit', { 'error' : '', 'connected': req.session.loggedIn, 'contact': result.rows[0], 'connected': req.session.loggedIn } );
        } else {
          res.render('pages/profile-edit', { 'error' : '', 'connected': req.session.loggedIn, 'contact': null } );
        }
        client.release();
      } catch (err) {
        console.error(err);
        res.render('pages/profile-edit', { 'error' : err, 'connected': req.session.loggedIn, 'contact': null } );
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
          'UPDATE salesforce.contact SET lastname=$1, firstname=$2, phone=$3, mobilephone=$4  WHERE email=$5',
          [req.body.lastname, req.body.firstname, req.body.phone, req.body.mobilephone, req.session.email]
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
  .get('/profile/create', async (req, res) => {
    if(!req.session.loggedIn) {
      try {
        res.render('pages/profile-create', { 'error' : '', 'connected': req.session.loggedIn } );
      } catch (err) {
        console.error(err);
        res.send("Error " + err);
      }
    } else {
      res.redirect('/profile');
    }
  })
  .post('/profile/create', async (req, res) => {
    if(!req.session.loggedIn) {
      try {
        const client = await pool.connect();
        await client.query(
          'INSERT INTO salesforce.contact (lastname, firstname, phone, mobilephone, email, password__c, externalid__c, name) VALUES ($1, $2, $3, $4, $5, $6, $5, $7)',
          [req.body.lastname, req.body.firstname, req.body.phone, req.body.mobilephone, req.body.email, req.body.password, req.body.firstname + ' ' + req.body.lastname]
        );
        client.release();
        res.redirect('/');
      } catch (err) {
        console.error(err);
        res.send("Error " + err);
      }
    } else {
      res.redirect('/profile');
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
