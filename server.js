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
const MOVIES_API_KEY = process.env.MOVIES_API_KEY;
const YELP_API_KEY = process.env.YELP_API_KEY;
const PORT = process.env.PORT || 3100;

const client = new pg.Client(DATABASE_URL);
client.connect();

app.get('/', (req, res) => {
  res.status(200).send('This is the homepage');
});

app.get('/weather', findWeather);
app.get('/trails', findTrails);
app.get('/movies', findMovies);
app.get('/yelp', findYelps);

app.all('*', (req, res) => {
  res.status(500).send('Status 500: Sorry, something went wrong');
});

app.listen(PORT, () => {
  console.log('Server is listening to port ', PORT);
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
  }).catch(error => console.log(error));
}


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
  }).catch(error => console.log(error));
}


function findMovies(req,res){
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${MOVIES_API_KEY}&query=${req.query.search_query}&page=1`;
  superagent.get(url).then(data =>{
    var movies = data.body.results.map(movie => {
      var movieData = new Movie(movie);
      return movieData;
    })
    res.send(movies);
  }).catch(error => console.log(error))
}


function findYelps(req,res){
  const url = `https://api.yelp.com/v3/businesses/search?location=${req.query.search_query}`;
  superagent.get(url).set('Authorization', `Bearer ${YELP_API_KEY}`)
    .then(data =>{
      var yelps = data.body.businesses.map(yelp => {
        var yelpData = new Yelp(yelp);
        return yelpData;
      });
      res.send(yelps);
    }).catch(error => console.log(error))
}



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

function Movie(data){
  this.title = data.title ;
  this.overview = data.overview ;
  this.average_votes = data.vote_average ;
  this.total_votes = data.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
  this.popularity= data.popularity;
  this.released_on= data.release_date;
}

function Yelp(data){
  this.name = data.name;
  this.image_url= data.image_url;
  this.price= data.price;
  this.rating= data.rating;
  this.url= data.url;
}
