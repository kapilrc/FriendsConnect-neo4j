const express = require('express')
const path = require('path')
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const dotenv = require('dotenv')

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view-engine', 'ejs')

// middleware
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
  res.send("it works")
})
dotenv.config();


const port = process.env.PORT || 3000;

app.listen(3000, function() {
  console.log(`Server started at port ${port}`)
});

module.exports = app;

