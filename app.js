const express = require('express')
const path = require('path')
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const dotenv = require('dotenv')
const neo4j = require('neo4j-driver').v1

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs')

// middleware
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

dotenv.config();

const driver = neo4j.driver(process.env.BOLTPROTOCOL, neo4j.auth.basic(process.env.AUTHUSERNAME, process.env.AUTHPASSWORD));
const session = driver.session();

app.get('/', (req, res) => {
  session
    .run('MATCH (n:Person) RETURN n')
    .then(result => {
      const personArray = [], locationArray = [];

      result.records.forEach(record => {
        // console.log(record._fields[0].properties);
        personArray.push({
          id: record._fields[0].identity.low,
          name: record._fields[0].properties.name
          //age: record._fields[0].properties.age ? record._fields[0].properties.age.low : ""
        })
      });

      session
        .run('MATCH (l:Location) RETURN l')
        .then(locResult => {
          locResult.records.forEach(record => {
            // console.log(record._fields[0].properties);
            locationArray.push({
              id: record._fields[0].identity.low,
              state: record._fields[0].properties.State,
              city: record._fields[0].properties.City
            })
          });

          res.render('index', {
            persons: personArray,
            locations: locationArray
          })
        })
        .catch(err => {
          console.log(err)
        })
    })
    .catch(err => {
      console.log(err)
    })
})

// Add person route
app.post('/person/add', (req, res) => {
  const name = req.body.name;
  console.log(name);
  session
    .run('CREATE (n:Person {name: {nameParam} }) RETURN n.name', {nameParam: name})
    .then(result => {
      res.redirect('/')
      session.close()
    })
    .catch(err => {
      console.log(err)
    })
})

// Add Location route
app.post('/location/add', (req, res) => {
  const state = req.body.state;
  const city = req.body.city;
  session
    .run('CREATE (n:Location {City: {cityParam}, State: {stateParam} }) RETURN n', {cityParam: city, stateParam: state})
    .then(result => {
      res.redirect('/')
      session.close()
    })
    .catch(err => {
      console.log(err)
    })
})

// Connect Friends route
app.post('/friends/connect', (req, res) => {
  const name1 = req.body.name1;
  const name2 = req.body.name2;
  const id = req.body.id;
  session
    .run('MATCH (a:Person {name: {nameParam1} }), (b:Person {name: {nameParam2} }) MERGE (a)-[:FRIENDS]->(b) RETURN a,b', {nameParam1: name1, nameParam2: name2})
    .then(result => {
      if(id && id != null) {
        res.redirect('/person/'+id)
      }else {
        res.redirect('/')
      }     
      session.close();
    })
    .catch(err => {
      console.log(err)
    })
})

// Add Birthplace route
app.post('/person/born/add', (req, res) => {
  const name = req.body.name;
  const state = req.body.state;
  const city = req.body.city;
  const year = req.body.year;
  const id = req.body.id;
  session
    .run('MATCH (p: Person{name: {nameParam} }), (l:Location {City: {cityParam}, State: {stateParam} }) MERGE (p)-[:BORN_IN { year: {yearParam} }]->(l) RETURN p,l', { nameParam: name, cityParam: city, stateParam: state, yearParam: year })
    .then(result => {
      console.log("person born result", result)
      if(id && id != null) {
        res.redirect('/person/'+id)
      }else {
        res.redirect('/')
      }  
      session.close()
    })
    .catch(err => {
      console.log(err)
    })
})

// Person route
app.get('/person/:id', (req, res) => {
  var id = req.params.id;
  console.log("id", id);
  session
    .run('MATCH (p:Person) WHERE id(p)=toInt({idParam}) RETURN p.name as name', {idParam: id})
    .then(resp=> {
      const name = resp.records[0].get("name");

      session
        .run('OPTIONAL MATCH (p:Person)-[:BORN_IN]->(l:Location) WHERE id(p)=toInt({idParam}) RETURN l.City as City, l.State as State', {idParam: id})
        .then(resp => {
          const city = resp.records[0].get("City");
          const state = resp.records[0].get("State");

          session
            .run('OPTIONAL MATCH (a:Person)-[r:FRIENDS]-(b:Person) WHERE id(a)=toInt({idParam}) RETURN b', {idParam: id})
            .then(resp => {
              const FriendsArr = [];
              resp.records.forEach(record => {
                if(record._fields[0] != null){
                  FriendsArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                  })
                }
              });

              res.render('person', {
                id,
                name,
                city,
                state,
                friends: FriendsArr
              });
              session.close();
            })
            .catch(err => {
              console.log("Relationship error", err)
            });
        })
        .catch()
    })
    .catch()
})


const port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log(`Server started at port ${port}`)
});

module.exports = app;

