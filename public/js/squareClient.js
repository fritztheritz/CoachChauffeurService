const { ApiError, Client, Environment } = require("square");
const dotenv = require('dotenv');
dotenv.config();

// Set up Square client
const squareClient = new Client({
  environment: Environment.Sandbox, // Use 'Production' in a live environment
  accessToken: process.env.SQUARE_ACCESS_TOKEN, // Replace with your Square access token
});

module.exports = { squareClient, ApiError };