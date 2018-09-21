# mem-admin (MEM MMT)
ESM is a project of the Environmental Assessment Office in partnership with the OCIO DevOps Pathfinder.

MEM MMT is an offshoot derivative of the ESM application to support the Major Mines Transparency project of the Ministry of Energy and Mines.

This application is a tool to support the work of EAO staff, project proponents, and other stakeholders as environmental assessments are conducted.

## Features

The features provided by the web-based ESM application include:

* a public-facing view of documents related to proposed development projects
* the ability to comment on projects
* as tools to support EAO staff, proponents, and stakeholders in performing tasks related to the environmental review process.

## Usage

## Developer Requirements

mem-admin has been built using MongoDB, Express, AngularJS and NodeJS.  See http://mean.js/ for more information on the project's development stack. Basic globally install requirements for Win32, OSX, or Linux are as follows:
* node@ >= 6.11.3
* npm@ >= 2.15.1 (only for installing yarn)
* mongodb-server@ >= 2.6.x
* grunt@ >= 0.4.5
* git
* yarn >= 1.3.2

The following environment variables must be set in order for a Minio object storage instance to be used for document uploads:
* `MINIO_DEPLOYMENT_NAME` - the URL pointing to a Minio instance (can be https://play.minio.io:9000)
* `MINIO_ACCESS_KEY` - the minio access key to be used for authentication
* `MINIO_SECRET_KEY` - the minio secret key to be used for authentication

## Installation
 `yarn install`

## Development Mode
 `npm start`

## Production Mode
`grunt build && NODE_ENV=production node server.js`

After this you may open up a browser of your choice and navigte to http://localhost:4000/

## Unit Tests

The unit tests are broken into two pieces: the client tests, and the server tests.

### Client
Run `npm run test-client`

This will execute the unit tests using Karma and Jasmine. See the `karma.conf.js`

This will create a code coverage report at `build/coverage/client`.

### Server
Run `npm run test-server`

This will execute the unit tests using Mocha. See the `mocha_istanbul` grunt task.

This will create a code coverage report at `build/coverage/server`.
## Functional Tests

Run `npm run e2e`

### Prerequisites
* A Mongo DBMS must already be running as a service.

This will trigger the following steps, via the gruntfile:
1. Create a new functional test database
2. Start the functional test server
3. Run the functional tests
4. Drop the functional test database
5. Shutdown the functional test server

### Configurable Environment Variables
Environment Variable  | Default Value         | Description
--------------------- | --------------------- | ---------------------
FUNCTIONAL_HOST       | localhost             | location of the functional test server
FUNCTIONAL_PORT       | 3001                  | port of the functional test server
BASEURL               | http://localhost:3001 | the url targeted by the functional tests
MONGODB_FUNC_HOST     | localhost             | location of the mongodb instance targeted by the functional test server
MONGODB_FUNC_PORT     | 27017                 | port of the mongodb instance targeted by the functional test server
MONGODB_FUNC_DATABASE | mem-dev-func          | name of the database used by the functional test server

### Extra
If running linux you should have grunt cli installed so that you take advantage of the automated kill/cleanup procedure provided by the grunt tasks.

## Project Status

## Goals/Roadmap

## Getting Help or Reporting an Issue

## How to Contribute
Feel free to create pull requests from the default "master" branch, click here to create one automatically: https://github.com/bcgov/mem-admin/pull/new/master.

## License

    Copyright 2015 Province of British Columbia

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
