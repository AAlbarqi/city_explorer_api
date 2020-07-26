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
  let weatherArr = [];
  wData.data.forEach(day => {
    weatherArr.push(new Weather(day));
  });
  res.send(weatherArr);
});

app.all('*', (req, res) =>{
  res.status(500).send('Status 500: Sorry, something went wrong');
});

app.listen(PORT, ()=>{
  console.log('Server is listening to port ', PORT);
});

function Location(city, data){
  this.search_query = city;
  this.formatted_query = data[0].display_name;
  this.latitude = data[0].lat;
  this.longitude = data[0].lon;
}

function Weather(data){
  this.forecast = data.weather.description;
  this.time = new Date(data.valid_date).toDateString();
  // weatherArr.push(this);
}
