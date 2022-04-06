# GFW Forms API

This repository is the microservice that implements the forms and Questionnaire functionality

## Dependencies

The GFW Forms API microservice is built using [Node.js](https://nodejs.org/en/), and can be executed using Docker.

Execution using Docker requires:
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

Dependencies on other Microservices:
- [GFW Areas](https://github.com/gfw-api/gfw-area)
- [FW teams](https://github.com/wri/fw_teams)

## Getting started

Start by cloning the repository from github to your execution environment

```
git clone https://github.com/wri/fw_forms.git && cd fw_forms
```

After that, follow one of the instructions below:

### Using Docker

1 - Execute the following command to run Docker:

```shell
make up-and-build   # First time building Docker or you've made changes to the Dockerfile
make up             # When Docker has already been built and you're starting from where you left off
```

The endpoints provided by this microservice should now be available: 
[localhost:4401](http://localhost:4401)\
OpenAPI docs will also be available at [localhost:44010](http://localhost:44010)

2 - Run the following command to lint the project:

```shell
make lint
```

3 - To close Docker:

```shell
make down
```

## Testing

### Using Docker

Follow the instruction above for setting up the runtime environment for Docker execution, then run:
```shell
make test-and-build
```

## Docs

The endpoints are documented using the OpenAPI spec and saved under `./docs`.\
A visualisation of these docs will be available to view in a web browser
when developing, please see above.

## Quick Overview

### Report entity

```json

{
  "data": [
    {
      "type": "reports",
      "id": "591f2513d3a6c4003f4960b4",
      "attributes": {
        "name": {
          "en": "My first report",
          "es": "Mi primer informe"
        },
        "languages": [
          "en",
          "es"
        ],
        "defaultLanguage": "en",
        "areaOfInterest": "aoi-id",
        "user": "1a10d7c6e0a37126611fd7a7",
        "questions": [
          {
            "type": "text",
            "name": "name",
            "defaultValue": {
              "en": "Insert your name",
              "es": "Spanish"
            },
            "_id": "591f2513d3a6c4003f4960b7",
            "conditions": [],
            "childQuestions": [],
            "order": 1,
            "required": false,
            "label": {
              "en": "Name",
              "es": "Nombre"
            }
          },
          {
            "type": "checkbox",
            "name": "age",
            "defaultValue": 0,
            "_id": "591f2513d3a6c4003f4960b5",
            "conditions": [],
            "childQuestions": [
              {
                "type": "text",
                "name": "specific-age",
                "defaultValue": {
                  "en": "Insert your name",
                  "es": "Spanish"
                },
                "conditionalValue": 0,
                "_id": "591f2513d3a6c4003f4960b6",
                "order": 0,
                "required": true,
                "label": {
                  "en": "Specific age",
                  "es": "Specific age"
                }
              }
            ],
            "order": 2,
            "required": false,
            "values": {
              "en": [
                {
                  "value": 0,
                  "label": "19-32"
                },
                {
                  "value": 1,
                  "label": "12-43"
                }
              ],
              "es": [
                {
                  "value": 0,
                  "label": "18-12"
                },
                {
                  "value": 1,
                  "label": "12-45"
                }
              ]
            },
            "label": {
              "en": "Range age",
              "es": "Spanish"
            }
          }
        ],
        "createdAt": "2017-05-19T17:02:11.415Z"
      }
    }
  ]
}

```

### CRUD Reports

```json

All endpoints are logged.  Check if user is ADMIN or MANAGER in gfw application

GET: /reports -> Return all reports accessible to user logged
GET: /reports/:id -> Returns report with the same id. Check if user is ADMIN or MANAGER in gfw application
Example response:

{
  "data": {
    "type": "reports",
    "id": "592402c4cfcfaf0070e78826",
    "attributes": {
      "name": {
        "en": "My report template",
        "es": "Mi report templato"
      },
      "languages": [
        "en",
        "es"
      ],
      "defaultLanguage": "en",
      "areaOfInterest": "aoi-id",
      "user": "1a10d7c6e0a37126611fd7a7",
      "public": false,
      "questions": [
        {
          "type": "text",
          "name": "name",
          "defaultValue": {
            "es": "Spanish",
            "en": "Insert your name"
          },
          "_id": "592402c4cfcfaf0070e78829",
          "conditions": [],
          "childQuestions": [],
          "order": 1,
          "required": false,
          "label": {
            "es": "Nombre",
            "en": "Name"
          }
        },
        {
          "type": "checkbox",
          "name": "age",
          "defaultValue": 0,
          "_id": "592402c4cfcfaf0070e78827",
          "conditions": [],
          "childQuestions": [
            {
              "type": "text",
              "name": "specific-age",
              "defaultValue": {
                "es": "Spanish",
                "en": "Insert your name"
              },
              "conditionalValue": 0,
              "_id": "592402c4cfcfaf0070e78828",
              "order": 0,
              "required": true,
              "label": {
                "es": "Specific age",
                "en": "Specific age"
              }
            }
          ],
          "order": 2,
          "required": false,
          "values": {
            "es": [
              {
                "label": "18-12",
                "value": 0
              },
              {
                "label": "12-45",
                "value": 1
              }
            ],
            "en": [
              {
                "label": "19-32",
                "value": 0
              },
              {
                "label": "12-43",
                "value": 1
              }
            ]
          },
          "label": {
            "es": "Spanish",
            "en": "Range age"
          }
        }
      ],
      "createdAt": "2017-05-23T09:37:08.315Z"
    }
  }
}

POST: /reports -> Create an report and associate to the user. With body:
{
  "areaOfInterest": "aoi-id",
  "languages": ["en", "es"],
  "defaultLanguage": "en",
  "name": {
    "en": "My report template",
    "es": "Mi report templato"
  },
  "public": false,
  "questions": [
    {
      "type": "text",
      "label": {
        "en": "Name",
        "es": "Nombre"
      },
      "name": "name",
      "conditions": [],
      "childQuestions": [],
      "order": 1,
      "required": false,
      "values": {},
      "defaultValue": {
        "en": "Insert your name",
        "es": "Spanish"
      }
    },
    {
      "type": "checkbox",
      "label": {
        "en": "Range age",
        "es": "Spanish"
      },
      "name": "age",
      "conditions": [],
      "order": 2,
      "required": false,
      "values": {
        "en": [
          { "value": 0, "label": "19-32"},
          { "value": 1, "label": "12-43"}
        ],
        "es": [
          { "value": 0, "label": "18-12"},
          { "value": 1, "label": "12-45"}
        ]
      },
      "defaultValue": 0,
      "childQuestions": [
        {
          "type": "text",
          "label": {
            "en": "Specific age",
            "es": "Specific age"
          },
          "name": "specific-age",
          "defaultValue": {
            "en": "Insert your name",
            "es": "Spanish"
          },
          "conditionalValue": 0,
          "order": 0,
          "required": true,
          "values": {}
        }
      ]
    }
  ]
}

Notes: public fields can only be passed as true by ADMINs. These templates appear to all users. Required fields:
- name
- languages
- defaultLanguage
- public
- questions

PATCH: /reports/:id -> Update the report with the same id.
DELETE: /reports/:id -> Delete the report with the same id.

```


### CRUD report answers

```json

GET: /report/:id/answers -> Return all answers of the report by id of the user logged
GET: /report/:id/answers/:id -> Return answer with the same id. Check if the answer is owned of the logged user
Example response:

{
  "data": {
    "type": "answers",
    "id": "59240430cfcfaf0070e78866",
    "attributes": {
      "report": "592402c4cfcfaf0070e78826",
      "username": "fwuser",
      "organization": "gfw",
      "areaOfInterest": "my-area-id",
      "language": "es",
      "createdAt": "12-04-2017T13:40:34:223Z",
      "userPosition": [
        "1",
        "1"
      ],
      "clickedPosition": [
        "1",
        "1"
      ],
      "startDate": "2013-01-23 12:00:33",
      "endDate": "2013-02-23 15:00:33",
      "layer": "GLAD",
      "user": "1a10d7c6e0a37126611fd7a7",
      "responses": [
        {
          "name": "name",
          "parent": "none",
          "value": "Ed",
          "_id": "59240430cfcfaf0070e7886f"
        },
        {
          "name": "age",
          "parent": "none",
          "value": "1",
          "_id": "59240430cfcfaf0070e7886f"
        },
        {
          "name": "specific-age",
          "parent": "age",
          "value": "21",
          "_id": "59240430cfcfaf0070e7886f"
        }
      ]
    }
  }
}

POST: /reports/:id/answers  -> Create an answer to the report with the id of the report and associate to the user. With body:
Without Content-type (it is possible send files as attachments). For example
<questionName>: <responseValue>
name: Pepe
age: 0-18
specific-age: 32
photo: upload_file

Notes: These templates appear to all users. Required fields:
- language
- userPosition (comma separated lat lng [1,1])
- clickedPosition (comma separated lat lng [1,1])
- createdAt
- Any questions for the template that have the value required as true

PATCH: /reports/:id/answer/:id -> Update the answer with the same id. Check if the answer is owned by the logged user
DELETE: /reports/:id/answer/:id -> Delete the answer with the same id. Check if the answer is owned by the logged user

```

### Download report answers

```

GET: /reports/:id/download-answers -> downloads all answers to the report by :id.

```

WIP:
* All PATCH under development
* Accept query params to all GET requests
* Download individual answers for reports
* Add query params to fetch answers by language
