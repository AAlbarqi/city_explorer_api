'use strict';

const server = require('express');
const superagent = require('superagent');
const cors = require('cors');

require('dotenv').config();

const app = server();
app.use(cors());

const PORT = process.env.PORT || 3100;
const GEOCODE_API_KEY = process.env.GEOCODE_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const TRAIL_API_KEY = process.env.TRAIL_API_KEY;

app.get('/', (req,res) => {
  res.status(200).send('This is the homepage');
});

app.get('/location', findLocation);

function findLocation(req,res){
  let city = req.query.city;
  let url = `https://eu1.locationiq.com/v1/search.php?key=${GEOCODE_API_KEY}&q=${city}&format=json`;
  superagent.get(url).then(data => {
    res.send(new Location(city, data));
  }).catch(console.log('err'));
}

app.get('/weather', findWeather);

function findWeather(req, res){
  let weatherArr = [];
  let city = req.query.city;
  let url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${city}&key=${WEATHER_API_KEY}`;
  superagent.get(url).then(weatherData =>{
    weatherData.body.data.map(day => {
      weatherArr.push(new Weather(day));
    });
    res.send(weatherArr);
  }).catch(console.log('err'));
}

app.get('/trails', findTrails);

function findTrails(req, res){
  let trails = [];
  let lat = req.query.latitude;
  let lon = req.query.longitude;
  let url = `https://www.hikingproject.com/data/get-trails?lat=${lat}&lon=${lon}&maxDistance=10&key=${TRAIL_API_KEY}`;
  superagent.get(url).then(data => {
    data.body.trails.map(trail => {
      trails.push(new Trail(trail));
    });
    res.send(trails);
  }).catch(console.log('err'));
}
app.all('*', (req, res) =>{
  res.status(500).send('Status 500: Sorry, something went wrong');
});

app.listen(PORT, ()=>{
  console.log('Server is listening to port ', PORT);
});

function Location(city, data){
  this.search_query = city;
  this.formatted_query = data.body[0].display_name;
  this.latitude = data.body[0].lat;
  this.longitude = data.body[0].lon;
}

function Weather(data){
  this.forecast = data.weather.description;
  this.time = new Date(data.valid_date).toDateString();
}

function Trail (data){
  this.name = data.name;
  this.location = data.location;
  this.length = data.length;
  this.stars = data.stars;
  this.star_votes = data.starVotes;
  this.summary = data.summary;
  this.trail_url = data.url;
  this.conditions = data.conditionStatus;
  this.condition_date = data.conditionDate.slice(0,10);
  this.condition_time = data.conditionDate.slice(11,19);
}