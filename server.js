'use strict';

const server = require('express');
const cors = require('cors');
const { request } = require('express');
require('dotenv').config();

const app = server();
app.use(cors());

const PORT = process.env.PORT || 3100;

app.get('/', (request,response) => {
  response.status(200).send('This is the homepage');
});

app.get('/location', (request,response) =>{
  const data = require('./data/location.json');
  let city = request.query.city;
  let locationData = new Location(city, data);
  response.send(locationData);
});

app.all('*', (request, response) =>{
  response.status(404).send('Oops! this page does not exist');
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
