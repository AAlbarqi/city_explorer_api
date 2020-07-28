'use strict';

const server = require('express');
const superagent = require('superagent');
const pg = require('pg');
const cors = require('cors');

require('dotenv').config();

const app = server();
app.use(cors());

const GEOCODE_API_KEY = process.env.GEOCODE_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const TRAIL_API_KEY = process.env.TRAIL_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const PORT = process.env.PORT || 3100;

const client = new pg.Client(DATABASE_URL);
client.connect();

app.get('/', (req, res) => {
  res.status(200).send('This is the homepage');
});

app.get('/location', (req, res) => {
  findLocation(req.query.city)
    .then(location => {
      res.send(location)
    })
    .catch(error => console.log(error));
});

function findLocation(city) {
  const SQL = `SELECT * FROM locations WHERE search_query=$1;`;
  const values = [city];

  return client.query(SQL, values)
    .then(data => {
      if (data.rowCount > 0) {
        return data.rows[0];
      } else {
        const url = `https://eu1.locationiq.com/v1/search.php?key=${GEOCODE_API_KEY}&q=${city}&format=json`;
        return superagent.get(url).then(data => {
            let location = new Location(city, data);
            let newLocation = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING id;`;
            let values = [location.search_query, location.formatted_query, location.latitude, location.longitude];
            return client.query(newLocation, values).then(data => {
                location.id = data.rows[0].id;
                return location;
              }).catch(error => console.log(error));
          }).catch(error => console.log(error));
      }
    });
}

app.get('/weather', findWeather);

function findWeather(req, res) {
  let lat = req.query.latitude;
  let lon = req.query.longitude;
  let url = `https://api.weatherbit.io/v2.0/forecast/daily?lat=${lat}&lon=${lon}&key=${WEATHER_API_KEY}`;
  superagent.get(url).then(weatherData => {
    var weatherArr = weatherData.body.data.map(day => {
      const dayWeather = new Weather(day);
      return dayWeather;
    });
    res.send(weatherArr);
  }).catch(console.log('err'));
}

app.get('/trails', findTrails);

function findTrails(req, res) {
  let lat = req.query.latitude;
  let lon = req.query.longitude;
  let url = `https://www.hikingproject.com/data/get-trails?lat=${lat}&lon=${lon}&maxDistance=10&key=${TRAIL_API_KEY}`;
  superagent.get(url).then(data => {
    var trails = data.body.trails.map(trail => {
      const trailData = new Trail(trail);
      return trailData;
    });
    res.send(trails);
  }).catch(console.log('err'));
}
app.all('*', (req, res) => {
  res.status(500).send('Status 500: Sorry, something went wrong');
});

app.listen(PORT, () => {
  console.log('Server is listening to port ', PORT);
});

function Location(city, data) {
  this.search_query = city;
  this.formatted_query = data.body[0].display_name;
  this.latitude = data.body[0].lat;
  this.longitude = data.body[0].lon;
}

function Weather(data) {
  this.forecast = data.weather.description;
  this.time = new Date(data.valid_date).toDateString();
}

function Trail(data) {
  this.name = data.name;
  this.location = data.location;
  this.length = data.length;
  this.stars = data.stars;
  this.star_votes = data.starVotes;
  this.summary = data.summary;
  this.trail_url = data.url;
  this.conditions = data.conditionStatus;
  this.condition_date = data.conditionDate.slice(0, 10);
  this.condition_time = data.conditionDate.slice(11, 19);
}
