'use strict';

const server = require('express');
const cors = require('cors');
require('dotenv').config();

const lData = require('./data/location.json');
const wData = require('./data/weather.json');

const app = server();
app.use(cors());
const PORT = process.env.PORT || 3100;

app.get('/', (req,res) => {
  res.status(200).send('This is the homepage');
});

app.get('/location', (req,res) =>{
  let city = req.query.city;
  res.send(new Location(city, lData));
});

app.get('/weather', (req, res) => { 
  let city = req.query.city;
  wData.data.forEach(day => {
    new Weather(city,day);
  });
  res.send(weatherArr);
});

app.all('*', (req, res) =>{
  handleError(req, res);
  res.status(404).send('Oops! this page does not exist');
});

app.listen(PORT, ()=>{
  console.log('Server is listening to port ', PORT);
});

var handleError = (req,res) => {
  console.log(res.status(500).statusCode)
  return res.status(500).end();
}

function Location(city, data){
  this.search_query = city;
  this.formatted_query = data[0].display_name;
  this.latitude = data[0].lat;
  this.longitude = data[0].lon;
}

var weatherArr = weatherArr || [];
function Weather(city, data){
  this.forecast = data.weather.description;
  this.time = data.valid_date;
  weatherArr.push(this);
}
