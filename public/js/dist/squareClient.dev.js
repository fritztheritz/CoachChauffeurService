"use strict";

var _require = require("square"),
    ApiError = _require.ApiError,
    Client = _require.Client,
    Environment = _require.Environment;

var dotenv = require('dotenv');

dotenv.config(); // Set up Square client

var squareClient = new Client({
  environment: Environment.Sandbox,
  // Use 'Production' in a live environment
  accessToken: process.env.SQUARE_ACCESS_TOKEN // Replace with your Square access token

});
module.exports = {
  squareClient: squareClient,
  ApiError: ApiError
};