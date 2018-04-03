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

## Installation
 yarn install

## Start in development mode
 *npm start*

## Functional Tests

 To run the functional tests use "npm run e2e"
 This will go through these steps:
 * Setup a functional test instance of the database
 * Spin up a functional test instance of the application
 * Spin up automated testing of the functional test instance of the application

 Note that you need the following env vars:
 * FUNCTIONAL_PORT=3001 -- used to server the functional test instance of the application
 * FUNCTIONAL_HOST=localhost -- location of the functional test instance of the application
 * BASEURL=http://localhost:3001 -- the url targeted by the functional tests
 * MONGODB_FUNC_HOST=localhost -- the host for the mongo instance targeted by the functional test instance of the application
 * MONGODB_FUNC_PORT=27017 -- port for the mongo instance targeted by the functional test instance of the application
 * MONGODB_FUNC_DATABASE=mem-dev-func -- name of the database used by the functional test instance of the application


 Note that you need to have an instance of the Mongo DBMS running for this to work.
 This was initially set up on Ubuntu where the Mongo DBMS was running as a service.
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
