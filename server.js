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
app.get('/location', locationData);
app.get('/weather', findWeather);
app.get('/trails', findTrails);
app.get('/movies', findMovies);
app.get('/yelp', findYelps);

app.listen(PORT, () => {
  console.log('Server is listening to port ', PORT);
});

app.all('*', (req, res) => {
  res.status(500).send('Status 500: Sorry, something went wrong');
});

//////////////////////////////Functions///////////////////////////////
//For locations, getting the location from db or API
function locationData(req, res) {
  findLocation(req.query.city)
    .then(location => {
      res.send(location)
    })
    .catch(error => console.log(error));
}

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

//getting the weather from db or API

function findWeather(req, res) {
  const SQL = `SELECT * FROM weathers WHERE location_id=$1;`;
  const values = [req.query.id];

  return client.query(SQL, values).then(data => {
    if (data.rowCount > 0) { res.send(data.rows); }
    else {
      let url = `https://api.weatherbit.io/v2.0/forecast/daily?lat=${req.query.latitude}&lon=${req.query.longitude}&key=${WEATHER_API_KEY}`;
      superagent.get(url).then(weatherData => {
        var weatherArr = weatherData.body.data.map(day => {
          const dayWeather = new Weather(day);
          return dayWeather;
        });
        let insertWeather = `INSERT INTO weathers(forecast, time, location_id) VALUES ($1, $2, $3);`;
        weatherArr.forEach(weather => {
          let weatherValues = Object.values(weather);
          weatherValues.push(req.query.id);
          return client.query(insertWeather, weatherValues)
            .catch(error => console.log(error))
        });
        res.send(weatherArr);
      }).catch(error => console.log(error));
    }
  });
}

//getting trails from db or hikingproject API
function findTrails(req, res) {
  const SQL = `SELECT * FROM trails WHERE location_id=$1;`;
  const values = [req.query.id];

  return client.query(SQL, values).then(data => {
    if (data.rowCount > 0) { res.send(data.rows); }
    else {
      let url = `https://www.hikingproject.com/data/get-trails?lat=${req.query.latitude}&lon=${req.query.longitude}&maxDistance=10&key=${TRAIL_API_KEY}`;
      superagent.get(url).then(trailData => {
        var trailArr = trailData.body.trails.map(trail => {
          const trailDetails = new Trail(trail);
          return trailDetails;
        });
        let insertTrail = `INSERT INTO trails(name, location, length, stars, star_votes, summary, trail_url, conditions, condition_date,
          condition_time, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`;
        trailArr.forEach(trail => {
          let trailValues = Object.values(trail);
          trailValues.push(req.query.id);
          return client.query(insertTrail, trailValues)
            .catch(error => console.log(error))
        });
        res.send(trailArr);
      }).catch(error => console.log(error));
    }
  });
}
//getting movies from db or themoviesdb API
function findMovies(req, res) {
  const SQL = `SELECT * FROM movies WHERE location_id=$1;`;
  const values = [req.query.id];

  return client.query(SQL, values).then(data => {
    if (data.rowCount > 0) { res.send(data.rows); }
    else {
      let url = `https://api.themoviedb.org/3/search/movie?api_key=${MOVIES_API_KEY}&query=${req.query.search_query}&page=1`;
      superagent.get(url).then(movieData => {
        var movieArr = movieData.body.results.map(movie => {
          const movieDetails = new Movie(movie);
          return movieDetails;
        });
        let insertMovie = `INSERT INTO movies(title, released_on, total_votes, average_votes, popularity, image_url, overview, location_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`;
        movieArr.forEach(movie => {
          let movieValues = Object.values(movie);
          movieValues.push(req.query.id);
          return client.query(insertMovie, movieValues)
            .catch(error => console.log(error))
        });
        res.send(movieArr);
      }).catch(error => console.log(error));
    }
  });
}

//getting yelps from db or yelps API

function findYelps(req, res) {
  const SQL = `SELECT * FROM yelps WHERE location_id=$1;`;
  const values = [req.query.id];
  const page = (req.query.page - 1)*5;

  return client.query(SQL, values).then(data => {
    if (data.rowCount > 0) { res.send(data.rows); }
    else {
      let url = `https://api.yelp.com/v3/businesses/search?location=${req.query.search_query}&limit=5&offset=${page}`;
      superagent.get(url).set('Authorization', `Bearer ${YELP_API_KEY}`).then(yelpData => {
        var yelpArr = yelpData.body.businesses.map(yelp => {
          const yelpDetails = new Yelp(yelp);
          return yelpDetails;
        });
        let insertYelp = `INSERT INTO yelps (name, url, rating, price, image_url, location_id) VALUES ($1, $2, $3, $4, $5, $6);`;
        yelpArr.forEach(yelp => {
          let yelpValues = Object.values(yelp);
          yelpValues.push(req.query.id);
          return client.query(insertYelp, yelpValues)
            .catch(error => console.log(error))
        });
        res.send(yelpArr);
      }).catch(error => console.log(error));
    }
  });
}

////////////////////////////////Constructors///////////////////////////////////

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

function Movie(data) {
  this.title = data.title;
  this.overview = data.overview;
  this.average_votes = data.vote_average;
  this.total_votes = data.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
  this.popularity = data.popularity;
  this.released_on = data.release_date;
}

function Yelp(data) {
  this.name = data.name;
  this.image_url = data.image_url;
  this.price = data.price;
  this.rating = data.rating;
  this.url = data.url;
}
